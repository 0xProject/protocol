import { ContractAddresses } from '@0x/contract-addresses';
import { OtcOrder } from '@0x/protocol-utils/lib/src/orders';
import { Signature } from '@0x/protocol-utils/lib/src/signature_utils';
import {
    getTokenMetadataIfExists,
    nativeTokenSymbol,
    nativeWrappedTokenSymbol,
    TokenMetadata,
} from '@0x/token-metadata';
import { MarketOperation } from '@0x/types';
import { BigNumber } from '@0x/utils';
import { Producer as KafkaProducer } from 'kafkajs';

import {
    Integrator,
    RFQT_V2_FULL_SIZE_VOLUME_THRESHOLD_USD,
    RFQT_V2_SAMPLING_STRATEGY,
    RFQT_V2_SMALL_ORDER_VOLUME_USD,
} from '../config';
import { GASLESS_OTC_ORDER_NUM_BUCKETS, NULL_ADDRESS, ONE_SECOND_MS } from '../core/constants';
import { feeToStoredFee } from '../core/fee_utils';
import {
    Fee,
    FeeModelVersion,
    FeeWithDetails,
    QuoteServerPriceParams,
    RequireOnlyOne,
    RfqtV2Price,
    RfqtV2Quote,
    StoredFee,
} from '../core/types';
import { logger } from '../logger';
import { AltRfqMakerAssetOfferings } from '../quoteRequestor/altMmTypes';
import { QuoteRequestor, SignedNativeOrderMM, V4RFQIndicativeQuoteMM } from '../quoteRequestor/QuoteRequestor';
import { CacheClient } from '../utils/cache_client';
import { modulo } from '../utils/number_utils';
import { quoteReportUtils } from '../utils/quote_report_utils';
import { QuoteServerClient } from '../utils/quote_server_client';
import { getRfqtV2FillableAmounts, validateV2Prices } from '../utils/RfqtQuoteValidator';
import { RfqBlockchainUtils } from '../utils/rfq_blockchain_utils';
import { RfqDynamicBlacklist } from '../utils/rfq_dynamic_blacklist';
import { RfqMakerManager } from '../utils/rfq_maker_manager';
import { getSignerFromHash, padSignature } from '../utils/signature_utils';
import { TokenMetadataManager } from '../utils/TokenMetadataManager';
import { TokenPriceOracle } from '../utils/TokenPriceOracle';

import { FeeService } from './fee_service';
import { RfqMakerBalanceCacheService } from './rfq_maker_balance_cache_service';
import { FirmQuoteContext, QuoteContext, QuoteContextVolumeRequired } from './types';

const getTokenAddressFromSymbol = (symbol: string, chainId: number): string => {
    return (getTokenMetadataIfExists(symbol, chainId) as TokenMetadata).tokenAddress;
};

/**
 * Converts the parameters of an RFQt v2 prices request from 0x API
 * into the format needed for `QuoteServerClient` to call the market makers
 */
export function transformRfqtV2PricesParameters(p: QuoteContext, fee: Fee, chainId: number): QuoteServerPriceParams {
    const buyTokenAddress = p.makerToken;
    const sellTokenAddress = p.takerToken;
    // Typescript gymnastics with `baseUnits` to caputure the "oneof" nature--
    // By packaging them in their own little object, the type becomes:
    //
    // { buyAmountBaseUnits: BigNumber, sellAmountBaseUnits: undefined } |
    // { buyAmountBaseUnits: undefined, sellAmountBaseUnits: BigNumber }
    //
    // This is different from not packaging them together, where the types would be:
    //
    // buyAmountBaseUnits: BigNumber | undefined
    // sellAmountBaseUnits: BigNumber | undefined
    const baseUnits =
        p.isSelling === false
            ? {
                  buyAmountBaseUnits: p.assetFillAmount,
                  sellAmountBaseUnits: undefined,
              }
            : {
                  // This is a SELL
                  buyAmountBaseUnits: undefined,
                  sellAmountBaseUnits: p.assetFillAmount,
              };

    const mmRequestParameters = {
        ...baseUnits,
        buyTokenAddress,
        sellTokenAddress,
        chainId,
        feeAmount: fee.amount,
        feeToken: fee.token,
        integratorId: p.integrator.integratorId,
        takerAddress: p.takerAddress,
        txOrigin: p.txOrigin,
        trader: p.trader,
        workflow: p.workflow,
        protocolVersion: '4', //hardcode - will break some MMs if missing!
    };

    // Convert mmRequestParameters values to strings
    const stringParameters = ((
        o: typeof mmRequestParameters,
    ): RequireOnlyOne<
        Record<keyof typeof mmRequestParameters, string>,
        'buyAmountBaseUnits' | 'sellAmountBaseUnits'
    > => {
        return Object.keys(o).reduce((result, key) => {
            const value: { toString: () => string } | undefined = o[key as keyof typeof mmRequestParameters];
            if (value !== undefined && value.toString) {
                const stringValue = value.toString();
                result[key] = stringValue;
            }
            return result;
            // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }, {} as any);
    })(mmRequestParameters);

    return stringParameters;
}

/**
 * Contains the logic to handle RFQT Trades.
 *
 * `"v1"` functions support `MetaTransaction` trades while
 * `"v2"` functions (will) support `OtcOrder` trades.
 *
 * `v1` relies heavily on `QuoteRequestor` which has been copied over
 * from `0x/asset-swapper`.
 */
export class RfqtService {
    private readonly _nativeTokenSymbol: string;
    private readonly _nativeTokenAddress: string;
    private readonly _nativeWrappedTokenSymbol: string;
    private readonly _nativeWrappedTokenAddress: string;
    constructor(
        private readonly _chainId: number,
        private readonly _rfqMakerManager: RfqMakerManager,
        // Used for RFQt v1 requests
        private readonly _quoteRequestor: Pick<
            QuoteRequestor,
            'requestRfqtIndicativeQuotesAsync' | 'requestRfqtFirmQuotesAsync' | 'getMakerUriForSignature'
        >,
        // Used for RFQt v2 requests
        private readonly _quoteServerClient: QuoteServerClient,
        private readonly _minExpiryDurationMs: number,
        private readonly _blockchainUtils: RfqBlockchainUtils,
        private readonly _tokenMetadataManager: TokenMetadataManager,
        private readonly _contractAddresses: ContractAddresses,
        private readonly _feeService: FeeService,
        private readonly _feeModelVersion: FeeModelVersion,
        private readonly _rfqMakerBalanceCacheService: RfqMakerBalanceCacheService,
        private readonly _cacheClient: CacheClient,
        private readonly _tokenPriceOracle: TokenPriceOracle,
        private readonly _rfqDynamicBlacklist: RfqDynamicBlacklist,
        private readonly _kafkaProducer?: KafkaProducer,
        private readonly _feeEventTopic?: string,
    ) {
        this._nativeTokenSymbol = nativeTokenSymbol(this._chainId);
        this._nativeTokenAddress = getTokenAddressFromSymbol(this._nativeTokenSymbol, this._chainId);
        this._nativeWrappedTokenSymbol = nativeWrappedTokenSymbol(this._chainId);
        this._nativeWrappedTokenAddress = getTokenAddressFromSymbol(this._nativeWrappedTokenSymbol, this._chainId);
    }

    /**
     * Pass through to `QuoteRequestor::requestRfqtIndicativeQuotesAsync` to fetch
     * indicative quotes from market makers.
     *
     * Note that by this point, 0x API should be sending the null address
     * as the `takerAddress` and the taker's address as the `txOrigin`.
     */
    public async getV1PricesAsync(parameters: {
        altRfqAssetOfferings: AltRfqMakerAssetOfferings;
        assetFillAmount: BigNumber;
        comparisonPrice: BigNumber | undefined;
        makerToken: string;
        marketOperation: MarketOperation;
        takerToken: string; // expect this to be NULL_ADDRESS
        takerAddress: string;
        txOrigin?: string; // expect this to be the taker address
        intentOnFilling: boolean;
        integrator: Integrator;
    }): Promise<V4RFQIndicativeQuoteMM[]> {
        const {
            altRfqAssetOfferings,
            assetFillAmount,
            comparisonPrice,
            integrator,
            intentOnFilling, // tslint:disable-line boolean-naming
            makerToken,
            marketOperation,
            takerAddress,
            takerToken,
            txOrigin,
        } = parameters;

        return this._quoteRequestor.requestRfqtIndicativeQuotesAsync(
            makerToken,
            takerToken,
            assetFillAmount,
            marketOperation,
            comparisonPrice,
            {
                altRfqAssetOfferings,
                integrator,
                intentOnFilling,
                isIndicative: true,
                isLastLook: false,
                makerEndpointMaxResponseTimeMs: 600,
                takerAddress,
                txOrigin: txOrigin || NULL_ADDRESS,
            },
        );
    }

    /**
     * Pass through to `QuoteRequestor::requestRfqtFirmQuotesAsync` to fetch
     * firm quotes from market makers.
     *
     * Note that by this point, 0x API should be sending the null address
     * as the `takerAddress` and the taker's address as the `txOrigin`.
     */
    public async getV1QuotesAsync(parameters: {
        altRfqAssetOfferings: AltRfqMakerAssetOfferings;
        assetFillAmount: BigNumber;
        comparisonPrice: BigNumber | undefined;
        integrator: Integrator;
        intentOnFilling: boolean;
        makerToken: string;
        marketOperation: MarketOperation;
        takerAddress: string; // expect this to be the taker address
        takerToken: string;
        txOrigin: string;
    }): Promise<SignedNativeOrderMM[]> {
        const {
            altRfqAssetOfferings,
            assetFillAmount,
            comparisonPrice,
            integrator,
            intentOnFilling, // tslint:disable-line boolean-naming
            makerToken,
            marketOperation,
            takerAddress,
            takerToken,
            txOrigin,
        } = parameters;

        const quotes = await this._quoteRequestor.requestRfqtFirmQuotesAsync(
            makerToken,
            takerToken,
            assetFillAmount,
            marketOperation,
            comparisonPrice,
            {
                altRfqAssetOfferings,
                integrator,
                intentOnFilling,
                isIndicative: false,
                isLastLook: false,
                makerEndpointMaxResponseTimeMs: 600,
                takerAddress,
                txOrigin,
            },
        );

        return quotes.map((q) => {
            return {
                ...q,
                makerUri: this._quoteRequestor.getMakerUriForSignature(q.signature),
            };
        });
    }

    /**
     * Accepts data sent by 0x API and fetches prices from Market Makers
     * configured on the given pair.
     *
     * Note that by this point, 0x API should be sending the null address
     * as the `takerAddress` and the taker's address as the `txOrigin`.
     */
    public async getV2PricesAsync(quoteContext: QuoteContext, now: Date = new Date()): Promise<RfqtV2Price[]> {
        const { feeWithDetails: fee } = await this._feeService.calculateFeeAsync(quoteContext);
        const pricesWithFee = await this._getV2SampledPricesInternalAsync(quoteContext, fee, now);
        return RfqtService.removeFeeFromPrices(pricesWithFee);
    }

    /**
     * Accepts data sent by 0x API and fetches quotes from market makers
     * configured on the given pair.
     *
     * Preparing quotes is a two step process:
     *  1. Requests are made to the market makers' `/price` endpoint using
     *     logic similar to that of `getV2PricesAsync`
     *  2. Valid prices are then sent to the market makers' `/sign`
     *     endpoint to get a signed quote
     */
    public async getV2QuotesAsync(quoteContext: FirmQuoteContext, now: Date = new Date()): Promise<RfqtV2Quote[]> {
        const { feeWithDetails: fee } = await this._feeService.calculateFeeAsync(quoteContext);
        const storedFee: StoredFee = feeToStoredFee(fee);

        // TODO (rhinodavid): put a meter on this response time
        const prices = await this._getV2SampledPricesInternalAsync(quoteContext, fee, now);

        // Handle nonce
        let pricesAndOrders: { price: RfqtV2Price; order: OtcOrder }[] = [];

        if (quoteContext.workflow === 'gasless-rfqt') {
            // For gasless RFQt, each order needs a different bucket
            // "Reserve" the next N buckets and get the last one
            const lastReservedBucket =
                (await this._cacheClient.getNextNOtcOrderBucketsAsync(quoteContext.chainId, prices.length)) %
                GASLESS_OTC_ORDER_NUM_BUCKETS;

            // Starting with the last bucket, we give each request its own bucket by decrementing
            // and wrapping around if negative (via modulo)
            const baseNonce = new BigNumber(Math.floor(now.getTime() / ONE_SECOND_MS));
            pricesAndOrders = prices.map((price, i) => ({
                order: this._v2priceToOrder(
                    price,
                    quoteContext.txOrigin,
                    baseNonce,
                    new BigNumber(modulo(lastReservedBucket - i, GASLESS_OTC_ORDER_NUM_BUCKETS)), // decrement from last bucket and wrap around if negative
                ),
                price,
            }));
        } else if (quoteContext.workflow === 'rfqt') {
            // For RFQt, all orders share the same bucket, but must have different nonces
            // For RFQtMultiHop all orders have different buckets and nonces
            const baseNonce = new BigNumber(Math.floor(now.getTime() / ONE_SECOND_MS));
            pricesAndOrders = prices.map((price, i) => ({
                order: this._v2priceToOrder(
                    price,
                    quoteContext.txOrigin,
                    baseNonce.plus(i),
                    quoteContext.bucket !== undefined ? new BigNumber(quoteContext.bucket + i) : new BigNumber(0), // bucket
                ),
                price,
            }));
        }
        const pricesAndOrdersAndSignatures = await Promise.all(
            pricesAndOrders.map(async ({ price, order }) => {
                let signature: Signature | undefined;
                try {
                    const orderHash = order.getHash();
                    signature = await this._quoteServerClient.signV2Async(
                        price.makerUri,
                        quoteContext.integrator.integratorId,
                        {
                            order,
                            orderHash,
                            expiry: price.expiry,
                            fee: price.fee ? price.fee : fee,
                            trader: quoteContext.trader,
                            workflow: quoteContext.workflow,
                        },
                        (u: string) => `${u}/rfqt/v2/sign`,
                        /* requireProceedWithFill */ false,
                    );

                    if (signature) {
                        // Certain market makers are returning signature components which are missing
                        // leading bytes. Add them if they don't exist.
                        const paddedSignature = padSignature(signature);
                        if (paddedSignature.r !== signature.r || paddedSignature.s !== signature.s) {
                            logger.warn(
                                { orderHash, r: paddedSignature.r, s: paddedSignature.s },
                                'Got market maker signature with missing bytes',
                            );
                            signature = paddedSignature;
                        }

                        // Verify the signer was the maker
                        const signerAddress = getSignerFromHash(orderHash, signature).toLowerCase();
                        const makerAddress = order.maker.toLowerCase();
                        if (signerAddress !== makerAddress) {
                            const isValidSigner = await this._blockchainUtils.isValidOrderSignerAsync(
                                makerAddress,
                                signerAddress,
                            );
                            if (!isValidSigner) {
                                logger.warn(
                                    { signerAddress, makerAddress, orderHash, makerUri: price.makerUri },
                                    'Invalid maker signature',
                                );

                                // Quotes with `undefined` signature will be filtered out later
                                signature = undefined;
                            }
                        }
                    }
                } catch (e) {
                    logger.warn(
                        { orderHash: order.getHash(), makerId: price.makerId },
                        'Failed trying to get rfqt signature from market maker',
                    );
                }
                return {
                    price,
                    order,
                    signature: signature ?? null,
                };
            }),
        );

        // (Maker Balance Cache) Fetch maker balances to calculate fillable amounts
        let quotedMakerBalances: BigNumber[] | undefined;
        const quotedERC20Owners = prices.map((price) => ({
            owner: price.makerAddress,
            token: price.makerToken,
        }));
        try {
            quotedMakerBalances = await this._rfqMakerBalanceCacheService.getERC20OwnerBalancesAsync(
                this._chainId,
                quotedERC20Owners,
            );
        } catch (e) {
            logger.error(
                { chainId: this._chainId, quotedERC20Owners, errorMessage: e.message },
                'Failed to fetch maker balances to calculate fillable amounts',
            );
        }

        const fillableAmounts = getRfqtV2FillableAmounts(prices, this._chainId, quotedMakerBalances);
        const tuples = pricesAndOrdersAndSignatures.map(({ price, order, signature }, i) => ({
            price,
            order,
            signature,
            fillableAmount: fillableAmounts[i],
        }));

        const quotes = tuples
            .filter(({ signature }) => signature !== null)
            .map(({ price, order, signature, fillableAmount }) => {
                const { makerUri, makerId, fee } = price;
                return {
                    ...fillableAmount,
                    requestedSellAmount: price.requestedSellAmount,
                    requestedBuyAmount: price.requestedBuyAmount,
                    fillableTakerFeeAmount: new BigNumber(0),
                    makerUri,
                    makerId,
                    order,
                    // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    signature: signature!, // `null` signatures already filtered out
                    fee,
                };
            });

        // Write to Fee Event Report
        if (this._kafkaProducer) {
            try {
                await quoteReportUtils.publishRfqtV2FeeEvent(
                    // does this needs to be tuned somehow? or reported differently?
                    {
                        requestedBuyAmount: quoteContext.makerAmount ?? null,
                        requestedSellAmount: quoteContext.takerAmount ?? null,
                        requestedTakerAddress: quoteContext.takerAddress,
                        buyTokenAddress: quoteContext.makerToken,
                        sellTokenAddress: quoteContext.takerToken,
                        integratorId: quoteContext.integrator.integratorId,
                        quotes,
                        fee: storedFee, // This is the fee for the entire quote request, not per quote
                    },
                    this._kafkaProducer,
                    this._feeEventTopic,
                );
            } catch (e) {
                logger.error(
                    {
                        chainId: this._chainId,
                        requestedBuyAmount: quoteContext.makerAmount,
                        requestedSellAmount: quoteContext.takerAmount,
                        requestedTakerAddress: quoteContext.takerAddress,
                        buyTokenAddress: quoteContext.makerToken,
                        sellTokenAddress: quoteContext.takerToken,
                        integratorId: quoteContext.integrator.integratorId,
                        errorMessage: e.message,
                    },
                    'Failed to publish RFQt quote to Fee Event Report',
                );
            }
        }

        return quotes;
    }

    public get feeModelVersion(): FeeModelVersion {
        return this._feeModelVersion;
    }

    /**
     * Passthrough to TokenMetadataManager's `getTokenDecimalsAsync` method
     */
    public async getTokenDecimalsAsync(tokenAddress: string): Promise<number> {
        return this._tokenMetadataManager.getTokenDecimalsAsync(tokenAddress);
    }

    // Calculate the volume USD for a given token, decimals, and amount
    public async getVolumeUSDAsync(input: {
        tokenAddress: string;
        tokenDecimals: number;
        amount: BigNumber;
    }): Promise<BigNumber | undefined> {
        const { tokenAddress, tokenDecimals, amount } = input;
        const [price] = await this._tokenPriceOracle.batchFetchTokenPriceAsync([
            {
                tokenAddress,
                tokenDecimals,
                chainId: this._chainId,
                isNoResponseCritical: false, // This is a best effort price, so we don't want to fail if we can't get it
            },
        ]);

        if (price === null) {
            return undefined;
        }

        return price.times(amount);
    }

    static removeFeeFromPrices(pricesWithFee: RfqtV2Price[]): RfqtV2Price[] {
        const prices: RfqtV2Price[] = [];
        pricesWithFee.forEach((priceWithFee) => {
            delete priceWithFee['fee'];
            prices.push(priceWithFee);
        });
        return prices;
    }

    static generateModifiedSizeOrderQuoteContext(
        quoteContext: QuoteContextVolumeRequired,
        newOrderVolumeUSD: BigNumber,
    ): QuoteContext {
        const newOrderVolumeRelative = quoteContext.volumeUSD.div(newOrderVolumeUSD);

        const newOrderQuoteContext = {
            ...quoteContext,
            makerAmount: quoteContext.makerAmount?.dividedToIntegerBy(newOrderVolumeRelative),
            takerAmount: quoteContext.takerAmount?.dividedToIntegerBy(newOrderVolumeRelative),
            volumeUSD: quoteContext.volumeUSD?.dividedToIntegerBy(newOrderVolumeRelative),
            assetFillAmount: quoteContext.assetFillAmount?.dividedToIntegerBy(newOrderVolumeRelative),
        };

        return newOrderQuoteContext;
    }

    static composeBigSizePrices(fullSizePrices: RfqtV2Price[], smallSizePrices: RfqtV2Price[]): RfqtV2Price[] {
        const newPrices: RfqtV2Price[] = [];

        smallSizePrices.forEach((smallPrice) => {
            const bigPrice = fullSizePrices.find((fullPrice) => fullPrice.makerAddress === smallPrice.makerAddress);
            if (bigPrice) {
                const newPrice = {
                    expiry: smallPrice.expiry,
                    makerAddress: smallPrice.makerAddress,
                    makerAmount: bigPrice.makerAmount.minus(smallPrice.makerAmount),
                    makerId: smallPrice.makerId,
                    makerToken: smallPrice.makerToken,
                    makerUri: smallPrice.makerUri,
                    takerAmount: bigPrice.takerAmount.minus(smallPrice.takerAmount),
                    takerToken: smallPrice.takerToken,
                };
                newPrices.push(newPrice);
            } else {
                logger.warn({ smallPrice }, 'Full size price matching small size price not found');
            }
        });
        return newPrices;
    }

    static V2AssignFee(prices: RfqtV2Price[], fee: FeeWithDetails): RfqtV2Price[] {
        prices.forEach((price) => {
            price.fee = fee;
        });
        return prices;
    }

    public async _getSlippageAwareSampledPricesAsync(
        quoteContext: QuoteContext,
        fee: Fee,
        now: Date = new Date(),
    ): Promise<RfqtV2Price[]> {
        // https://linear.app/0xproject/issue/RFQ-856/rfqt-large-order-sampling-mvp

        const fullSizePrices = await this._getV2PricesInternalAsync(quoteContext, fee, now);
        if (quoteContext.volumeUSD && quoteContext.volumeUSD.gte(RFQT_V2_FULL_SIZE_VOLUME_THRESHOLD_USD)) {
            const smallOrderVolumeUSD = new BigNumber(RFQT_V2_SMALL_ORDER_VOLUME_USD);

            const smallOrderQuoteContext = RfqtService.generateModifiedSizeOrderQuoteContext(
                quoteContext as QuoteContextVolumeRequired,
                smallOrderVolumeUSD,
            );
            const bigOrderQuoteContext = RfqtService.generateModifiedSizeOrderQuoteContext(
                quoteContext as QuoteContextVolumeRequired,
                quoteContext.volumeUSD.minus(smallOrderVolumeUSD),
            );

            const { feeWithDetails: smallOrderFee } = await this._feeService.calculateFeeAsync(smallOrderQuoteContext);
            const { feeWithDetails: bigOrderFee } = await this._feeService.calculateFeeAsync(bigOrderQuoteContext);

            let smallSizePrices = await this._getV2PricesInternalAsync(smallOrderQuoteContext, smallOrderFee, now);

            let bigSizePrices = RfqtService.composeBigSizePrices(fullSizePrices, smallSizePrices);

            smallSizePrices = RfqtService.V2AssignFee(smallSizePrices, smallOrderFee);
            bigSizePrices = RfqtService.V2AssignFee(bigSizePrices, bigOrderFee);
            return [...smallSizePrices, ...bigSizePrices];
        } else {
            return fullSizePrices;
        }
    }

    public async _getSlippageIgnoreSampledPricesAsync(
        quoteContext: QuoteContext,
        fee: Fee,
        now: Date = new Date(),
    ): Promise<RfqtV2Price[]> {
        // https://linear.app/0xproject/issue/RFQ-856/rfqt-large-order-sampling-mvp

        if (quoteContext.volumeUSD && quoteContext.volumeUSD.gte(RFQT_V2_FULL_SIZE_VOLUME_THRESHOLD_USD)) {
            const smallOrderVolumeUSD = new BigNumber(RFQT_V2_SMALL_ORDER_VOLUME_USD);

            const smallOrderQuoteContext = RfqtService.generateModifiedSizeOrderQuoteContext(
                quoteContext as QuoteContextVolumeRequired,
                smallOrderVolumeUSD,
            );
            const bigOrderQuoteContext = RfqtService.generateModifiedSizeOrderQuoteContext(
                quoteContext as QuoteContextVolumeRequired,
                quoteContext.volumeUSD.minus(smallOrderVolumeUSD),
            );

            const { feeWithDetails: smallOrderFee } = await this._feeService.calculateFeeAsync(smallOrderQuoteContext);
            const { feeWithDetails: bigOrderFee } = await this._feeService.calculateFeeAsync(bigOrderQuoteContext);

            let smallSizePrices = await this._getV2PricesInternalAsync(smallOrderQuoteContext, smallOrderFee, now);
            let bigSizePrices = await this._getV2PricesInternalAsync(bigOrderQuoteContext, bigOrderFee, now);

            smallSizePrices = RfqtService.V2AssignFee(smallSizePrices, smallOrderFee);
            bigSizePrices = RfqtService.V2AssignFee(bigSizePrices, bigOrderFee);
            return [...smallSizePrices, ...bigSizePrices];
        } else {
            return await this._getV2PricesInternalAsync(quoteContext, fee, now);
        }
    }

    public async _getV2SampledPricesInternalAsync(
        quoteContext: QuoteContext,
        fee: Fee,
        now: Date = new Date(),
    ): Promise<RfqtV2Price[]> {
        // https://linear.app/0xproject/issue/RFQ-856/rfqt-large-order-sampling-mvp
        logger.info({ strategy: RFQT_V2_SAMPLING_STRATEGY }, 'Getting prices from RFQ-T V2');
        switch (RFQT_V2_SAMPLING_STRATEGY) {
            case 'SLIPPAGE_AWARE': {
                return this._getSlippageAwareSampledPricesAsync(quoteContext, fee, now);
            }
            case 'SLIPPAGE_IGNORE': {
                return this._getSlippageIgnoreSampledPricesAsync(quoteContext, fee, now);
            }
            case 'NO_STRATEGY': {
                return await this._getV2PricesInternalAsync(quoteContext, fee, now);
            }
            default: {
                logger.warn(
                    `${RFQT_V2_SAMPLING_STRATEGY} is not a valid RFQ-T V2 sampling strategy. Defaulting to NO_STRATEGY`,
                );
                return await this._getV2PricesInternalAsync(quoteContext, fee, now);
            }
        }
    }

    /**
     * Get prices from MMs for given quote context and fee.
     */
    public async _getV2PricesInternalAsync(
        quoteContext: QuoteContext,
        fee: Fee,
        now: Date = new Date(),
    ): Promise<RfqtV2Price[]> {
        const { integrator, makerToken, takerToken } = quoteContext;

        // HACK: Only proceed on Matcha if not selling the Native Token for Indicative Quotes
        // TODO: This is a temporary experiment. Remove when experiment is done
        const isIndicative = !quoteContext.isFirm;
        const isTakerSellingNativeToken =
            this._nativeTokenAddress === takerToken || this._nativeWrappedTokenAddress === takerToken;
        if (isIndicative && integrator.label === 'Matcha' && !isTakerSellingNativeToken) {
            return [];
        }

        // Check if the txOrigin or takerAddress is blacklisted
        if (
            this._rfqDynamicBlacklist.has(quoteContext.txOrigin || '') ||
            this._rfqDynamicBlacklist.has(quoteContext.takerAddress || '')
        ) {
            return [];
        }

        // Fetch the makers active on this pair
        const makers = this._rfqMakerManager.getRfqtV2MakersForPair(makerToken, takerToken).filter((m) => {
            if (m.rfqtUri === null) {
                return false;
            }
            if (integrator.whitelistMakerIds && !integrator.whitelistMakerIds.includes(m.makerId)) {
                return false;
            }
            // HACK: This is the "rollout" of the gasless RFQT feature. Add MMs as they are ready. Remove when all MMs are ready
            // TODO(RFQ-870): cleanup
            const makers = {
                Altonomy: 'fc8468a7-8bc3-4df0-abce-2bbd04c24cb0',
                Jump: '4d8d01e7-347e-411e-bee2-69006ac91bb6',
                Kyber: '8e8f34ce-29bf-43bc-b4e0-d4664e096dab',
                OneBitQuant: '5986b45d-74db-4c79-9bd9-0c2cc3606ee1',
                Wintermute: '5b2c5bac-958b-4c06-a563-f6c32537b4bb',
                WooTrade: '70d67317-3ded-4aef-ab1c-58055252185d',
                AlphaLab: '4f914fb7-8152-41fb-a07d-6327649bb4d0',
                RavenDAO: '433d9e25-dd96-40bf-91b9-6db32da8a089',
            };
            const allowedGaslessRfqtMakers = new Set([makers.Altonomy, makers.Jump, makers.Kyber]);
            if (quoteContext.workflow === 'gasless-rfqt' && !allowedGaslessRfqtMakers.has(m.makerId)) {
                return false;
            }
            return true;
        });

        // Short circuit if no makers are active
        if (!makers.length) {
            return [];
        }

        // TODO (haozhuo): check to see if MM passes circuit breaker

        const prices = (
            await this._quoteServerClient.batchGetPriceV2Async(
                // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                makers.map((m) => /* won't be null because of previous `filter` operation */ m.rfqtUri!),
                integrator,
                transformRfqtV2PricesParameters(quoteContext, fee, this._chainId),
                (url) => `${url}/rfqt/v2/price`,
                quoteContext.workflow,
            )
        ).map((price) => {
            const maker = makers.find((m) => m.rfqtUri === price.makerUri);
            if (!maker) {
                throw new Error(`Could not find maker with URI ${price.makerUri}`);
            }
            return {
                expiry: price.expiry,
                makerAddress: price.maker,
                makerAmount: price.makerAmount,
                makerId: maker.makerId,
                makerToken: price.makerToken,
                makerUri: price.makerUri,
                takerAmount: price.takerAmount,
                takerToken: price.takerToken,
                ...(quoteContext.isSelling
                    ? { requestedSellAmount: quoteContext.assetFillAmount }
                    : { requestedBuyAmount: quoteContext.assetFillAmount }),
            };
        });

        // Filter out invalid prices
        const validatedPrices = validateV2Prices(prices, quoteContext, this._minExpiryDurationMs, this._chainId, now);

        return validatedPrices;
    }

    /**
     * Converts a price returned from the market maker's `price` endpoint
     * into an v2 order
     */
    private _v2priceToOrder(price: RfqtV2Price, txOrigin: string, nonce: BigNumber, nonceBucket: BigNumber): OtcOrder {
        return new OtcOrder({
            chainId: this._chainId,
            expiryAndNonce: OtcOrder.encodeExpiryAndNonce(price.expiry, nonceBucket, nonce),
            maker: price.makerAddress,
            makerAmount: price.makerAmount,
            makerToken: price.makerToken,
            taker: NULL_ADDRESS,
            takerAmount: price.takerAmount,
            takerToken: price.takerToken,
            txOrigin,
            verifyingContract: this._contractAddresses.exchangeProxy,
        });
    }
}
