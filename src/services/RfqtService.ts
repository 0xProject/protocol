import { AltRfqMakerAssetOfferings, AssetSwapperContractAddresses } from '@0x/asset-swapper/lib/src/types';
import { OtcOrder } from '@0x/protocol-utils/lib/src/orders';
import { Signature } from '@0x/protocol-utils/lib/src/signature_utils';
import { Fee } from '@0x/quote-server/lib/src/types';
import {
    getTokenMetadataIfExists,
    nativeTokenSymbol,
    nativeWrappedTokenSymbol,
    TokenMetadata,
} from '@0x/token-metadata';
import { MarketOperation } from '@0x/types';
import { BigNumber } from '@0x/utils';

import { Integrator } from '../config';
import { NULL_ADDRESS, ONE_SECOND_MS } from '../constants';
import { logger } from '../logger';
import { QuoteRequestor, SignedNativeOrderMM, V4RFQIndicativeQuoteMM } from '../quoteRequestor/QuoteRequestor';
import { QuoteServerPriceParams, RequireOnlyOne, RfqtV2Prices, RfqtV2Quotes, RfqtV2RequestInternal } from '../types';
import { QuoteServerClient } from '../utils/quote_server_client';
import { RfqMakerManager } from '../utils/rfq_maker_manager';

const getTokenAddressFromSymbol = (symbol: string, chainId: number): string => {
    return (getTokenMetadataIfExists(symbol, chainId) as TokenMetadata).tokenAddress;
};

/**
 * Converts the parameters of an RFQt v2 prices request from 0x API
 * into the format needed for `QuoteServerClient` to call the market makers
 */
function transformRfqtV2PricesParameters(p: RfqtV2RequestInternal, chainId: number): QuoteServerPriceParams {
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
        p.marketOperation === MarketOperation.Buy
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
        feeAmount: new BigNumber(0),
        feeToken: getTokenAddressFromSymbol(nativeWrappedTokenSymbol(chainId), chainId),
        integratorId: p.integrator.integratorId,
        takerAddress: p.takerAddress,
        txOrigin: p.txOrigin,
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
        private readonly _contractAddresses: AssetSwapperContractAddresses,
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
    public async getV2PricesAsync(parameters: RfqtV2RequestInternal): Promise<RfqtV2Prices> {
        const { integrator, makerToken, takerToken } = parameters;
        // Fetch the makers active on this pair
        const makers = this._rfqMakerManager.getRfqtV2MakersForPair(makerToken, takerToken).filter((m) => {
            if (m.rfqtUri === null) {
                return false;
            }
            if (integrator.whitelistMakerIds && !integrator.whitelistMakerIds.includes(m.makerId)) {
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
                transformRfqtV2PricesParameters(parameters, this._chainId),
                (url) => `${url}/rfqt/v2/price`,
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
            };
        });

        // TODO (byeongminP): filter out invalid prices (firm quote validator)

        return prices;
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
    public async getV2QuotesAsync(
        parameters: RfqtV2RequestInternal & { txOrigin: string },
        now: Date = new Date(),
    ): Promise<RfqtV2Quotes> {
        // TODO (rhinodavid): put a meter on this response time
        const prices = await this.getV2PricesAsync(parameters);

        // If multiple quotes are aggregated into the final order, they must
        // all have unique nonces. Otherwise they'll be rejected by the smart contract.
        const baseNonce = new BigNumber(Math.floor(now.getTime() / ONE_SECOND_MS));
        const pricesAndOrders = prices.map((price, i) => ({
            order: this._v2priceToOrder(price, parameters.txOrigin, baseNonce.plus(i)),
            price,
        }));

        // No fee in place for now
        const fee: Fee = { token: this._nativeWrappedTokenAddress, amount: new BigNumber(0), type: 'fixed' };

        const pricesAndOrdersAndSignatures = await Promise.all(
            pricesAndOrders.map(async ({ price, order }) => {
                let signature: Signature | undefined;
                try {
                    signature = await this._quoteServerClient.signV2Async(
                        price.makerUri,
                        parameters.integrator.integratorId,
                        { order, orderHash: order.getHash(), expiry: price.expiry, fee },
                        (u: string) => `${u}/rfqt/v2/sign`,
                        /* requireProceedWithFill */ false,
                    );
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

        // TODO (rhinodavid): check fillable amounts
        return pricesAndOrdersAndSignatures
            .filter((pos) => pos.signature)
            .map(({ price, order, signature }) => ({
                fillableMakerAmount: order.makerAmount,
                fillableTakerAmount: order.takerAmount,
                fillableTakerFeeAmount: new BigNumber(0),
                makerId: price.makerId,
                makerUri: price.makerUri,
                order,
                // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                signature: signature!, // `null` signatures already filtered out
            }));
    }

    /**
     * Converts a price returned from the market maker's `price` endpoint
     * into an v2 order
     */
    private _v2priceToOrder(
        price: RfqtV2Prices[0],
        txOrigin: string,
        nonce: BigNumber,
        nonceBucket: BigNumber = new BigNumber(0),
    ): OtcOrder {
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
