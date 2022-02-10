import { BigNumber, RfqFirmQuoteValidator, RfqOrderFields } from '@0x/asset-swapper';
import * as _ from 'lodash';
import { Counter, Summary } from 'prom-client';
import { In } from 'typeorm';
import { Repository } from 'typeorm/repository/Repository';

import { ONE_MINUTE_MS, ZERO } from '../constants';
import { MakerBalanceChainCacheEntity } from '../entities/MakerBalanceChainCacheEntity';
import { logger } from '../logger';

const THRESHOLD_CACHE_EXPIRED_MS = ONE_MINUTE_MS * 2;
const ORDER_FULLY_FILLABLE = new Counter({
    name: 'rfqtv_validator_order_fully_fillable',
    help: 'Number of orders validated to be fully fillable',
    labelNames: ['workerId'],
});
const ORDER_PARTIALLY_FILLABLE = new Counter({
    name: 'rfqtv_validator_order_partially_fillable',
    help: 'Number of orders validated to be partially fillable',
    labelNames: ['workerId', 'maker', 'makerToken'],
});
const ORDER_NOT_FILLABLE = new Counter({
    name: 'rfqtv_validator_order_not_fillable',
    help: 'Number of orders validated to be not fillable',
    labelNames: ['workerId', 'maker', 'makerToken'],
});
const ORDER_NOT_VALIDATED = new Counter({
    name: 'rfqtv_validator_order_not_validated',
    help: 'Number of orders not validated',
    labelNames: ['workerId'],
});
const CACHE_CHECKED = new Counter({
    name: 'rfqtv_validator_cache_checked',
    help: 'Number of times we checked cache',
    labelNames: ['workerId'],
});
const CACHE_EXPIRED = new Counter({
    name: 'rfqtv_validator_cache_expired',
    help: 'Number of times the cache was expired',
    labelNames: ['workerId'],
});
const NEW_ADDRESSES_SEEN = new Counter({
    name: 'rfqtv_new_addresses_seen',
    help: 'New addresses were added to the cache',
    labelNames: ['workerId'],
});
const PG_LATENCY_READ = new Summary({
    name: 'rfqtv_pg_latency',
    help: 'Query latency',
    labelNames: ['workerId'],
});
const MAKER_TOKEN_NOT_UNIQUE = new Counter({
    name: 'rfqtv_rejected_maker_token_not_unique',
    help: 'RFQ batch was requested because not all orders return the same token',
    labelNames: ['workerId'],
});

export class PostgresRfqtFirmQuoteValidator implements RfqFirmQuoteValidator {
    private readonly _chainCacheRepository: Repository<MakerBalanceChainCacheEntity>;
    private readonly _cacheExpiryThresholdMs: number;
    private readonly _workerId: string;

    constructor(
        chainCacheRepository: Repository<MakerBalanceChainCacheEntity>,
        cacheExpiryThresholdMs: number = THRESHOLD_CACHE_EXPIRED_MS,
    ) {
        this._chainCacheRepository = chainCacheRepository;
        this._cacheExpiryThresholdMs = cacheExpiryThresholdMs;
        this._workerId = _.uniqueId('rfqw_');
    }

    // tslint:disable-next-line: prefer-function-over-method
    public async getRfqtTakerFillableAmountsAsync(quotes: RfqOrderFields[]): Promise<BigNumber[]> {
        // TODO: Handle error on query

        // Ensure that all quotes have the same exact maker token.
        const uniqueMakerTokens = new Set(quotes.map((quote) => quote.makerToken.toLowerCase()));
        if (uniqueMakerTokens.size !== 1) {
            logger.error(
                `Quotes array was empty or found multiple maker token addresses within one single RFQ batch: ${JSON.stringify(
                    Array.from(uniqueMakerTokens),
                )}. Rejecting the batch`,
            );
            MAKER_TOKEN_NOT_UNIQUE.labels(this._workerId).inc(quotes.length);
            return quotes.map((_quote) => ZERO);
        }
        const makerToken: string = uniqueMakerTokens.values().next().value;

        // Fetch balances and create a lookup table. In order to fetch all the unique addresses we use a set, but then convert
        // the set to an array so that it can work with TypeORM.
        const makerLookup: { [key: string]: BigNumber } = {};
        const makerAddresses = Array.from(new Set(quotes.map((quote) => quote.maker.toLowerCase())));
        const timeStart = new Date().getTime();
        const cacheResults = await this._chainCacheRepository.find({
            where: [
                {
                    tokenAddress: makerToken,
                    makerAddress: In(makerAddresses),
                },
            ],
        });
        PG_LATENCY_READ.labels(this._workerId).observe(new Date().getTime() - timeStart);
        const nowUnix = new Date().getTime();
        for (const result of cacheResults) {
            makerLookup[result.makerAddress!] = this._calculateMakerBalanceFromResult(result, makerToken, nowUnix);
        }

        // Finally, adjust takerFillableAmount based on maker balances
        const { makerAddressesToAddToCache, takerFillableAmounts } = this._calculateTakerFillableAmountsFromQuotes(
            quotes,
            makerLookup,
        );

        // If any new addresses were found, add new addresses to cache.
        // NOTE: since this insertion happens on the web processes, we need to gracefully handle conflict
        // that can happen if two threads try to insert the same entry at the same time. This is why we add
        // the "ON CONFLICT" clause.
        if (makerAddressesToAddToCache.length > 0) {
            logger.info(`Adding new addresses to cache: ${JSON.stringify(makerAddressesToAddToCache)}`);
            NEW_ADDRESSES_SEEN.labels(this._workerId).inc(makerAddressesToAddToCache.length);
            await this._chainCacheRepository
                .createQueryBuilder()
                .insert()
                .values(
                    makerAddressesToAddToCache.map((makerAddress) => {
                        return {
                            makerAddress: makerAddress.toLowerCase(),
                            tokenAddress: makerToken.toLowerCase(),
                            timeFirstSeen: 'NOW()',
                        };
                    }),
                )
                .onConflict(`("token_address", "maker_address") DO NOTHING`)
                .execute();
        }
        return takerFillableAmounts;
    }

    private _calculateTakerFillableAmountsFromQuotes(
        quotes: RfqOrderFields[],
        makerLookup: { [key: string]: BigNumber },
    ): { makerAddressesToAddToCache: string[]; takerFillableAmounts: BigNumber[] } {
        const makerAddressesToAddToCacheSet: Set<string> = new Set();
        const takerFillableAmounts = quotes.map((quote) => {
            const makerTokenBalanceForMaker: BigNumber | undefined = makerLookup[quote.maker.toLowerCase()];

            // TODO: Add Prometheus hooks
            if (makerTokenBalanceForMaker === undefined) {
                makerAddressesToAddToCacheSet.add(quote.maker.toLowerCase());
                ORDER_NOT_VALIDATED.labels(this._workerId).inc();
                return quote.takerAmount;
            }

            // Order is fully fillable, because Maker has 100% of the assets
            if (makerTokenBalanceForMaker.gte(quote.makerAmount)) {
                ORDER_FULLY_FILLABLE.labels(this._workerId).inc();
                return quote.takerAmount;
            }

            // Order is empty, return zero
            if (quote.makerAmount.lte(0)) {
                ORDER_NOT_FILLABLE.labels(this._workerId, quote.maker, quote.makerToken).inc();
                return ZERO;
            }

            // Order is partially fillable, because Maker has a fraction of the assets
            const partialFillableAmount = makerTokenBalanceForMaker
                .times(quote.takerAmount)
                .div(quote.makerAmount)
                .integerValue(BigNumber.ROUND_DOWN);
            logger.warn(
                {
                    maker: quote.maker,
                    makerToken: quote.makerToken,
                    makerAmount: quote.makerAmount.toString(),
                    makerBalance: makerTokenBalanceForMaker.toString(),
                    taker: quote.taker,
                    takerToken: quote.takerToken,
                    takerAmount: quote.takerAmount.toString(),
                    partialFillableAmount: partialFillableAmount.toString(),
                },
                `Maker can only partially cover order size. Effective taker amount will be reduced to partialFillableAmount`,
            );
            if (!partialFillableAmount.isFinite()) {
                logger.error(
                    `Calculated maker token balance is infinite, which caused the partialFillableAmount to be infinite. This should never happen`,
                );
                return ZERO;
            }
            ORDER_PARTIALLY_FILLABLE.labels(this._workerId, quote.maker, quote.makerToken).inc();
            return partialFillableAmount;
        });
        const makerAddressesToAddToCache = Array.from(makerAddressesToAddToCacheSet);
        return {
            makerAddressesToAddToCache,
            takerFillableAmounts,
        };
    }

    private _calculateMakerBalanceFromResult(
        result: MakerBalanceChainCacheEntity,
        makerToken: string,
        nowUnix: number,
    ): BigNumber {
        CACHE_CHECKED.labels(this._workerId).inc();
        if (!result.timeOfSample) {
            // If a record exists but a time of sample does not yet exist, this means that the cache entry has not yet been
            // populated by the worker process. This may be due to a new address being added a few minutes ago, but it could
            // also be due to a bug in the worker.
            const timeFirstSeen = result.timeFirstSeen ? result.timeFirstSeen.getTime() : 0;
            const msPassedSinceLastSeen = nowUnix - timeFirstSeen;
            if (msPassedSinceLastSeen > this._cacheExpiryThresholdMs) {
                logger.error(
                    `Cache entry for maker ${result.makerAddress} and token ${result.tokenAddress} was first added on ${timeFirstSeen} which is more than ${this._cacheExpiryThresholdMs} ms ago. Assuming worker is stuck and setting maker balance to 0.`,
                );
                CACHE_EXPIRED.labels(this._workerId).inc();
                return ZERO;
            } else {
                logger.warn(
                    `Cannot find cache for token ${makerToken} and maker ${result.makerAddress}. This entry was recently added so assuming the entire maker fillable amount is available`,
                );
                return new BigNumber(Number.POSITIVE_INFINITY);
            }
        } else if (nowUnix - result.timeOfSample.getTime() > this._cacheExpiryThresholdMs) {
            // In this case a cache entry exists, but it's simply too old and this should never really happen unless the worker is stuck.
            logger.error(
                `Cache entry for maker ${result.makerAddress} and token ${
                    result.tokenAddress
                } was last refreshed on ${result.timeOfSample.getTime()} which is more than ${
                    this._cacheExpiryThresholdMs
                } ms ago. Assuming worker is stuck and setting maker balance to 0.`,
            );
            CACHE_EXPIRED.labels(this._workerId).inc();
            return ZERO;
        }

        // Quick validity check to ensure data isn't invalid. This should never happen if `timeOfSample` exists.
        if (!result.balance) {
            logger.error(
                `Cache entry for maker ${result.makerAddress} and token ${result.tokenAddress} has a null balance. This should never happen`,
            );
            return ZERO;
        }
        return result.balance;
    }
}
