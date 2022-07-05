import { AltRfqMakerAssetOfferings } from '@0x/asset-swapper/lib/src/types';
import { MarketOperation } from '@0x/types';
import { BigNumber } from '@0x/utils';

import { Integrator } from '../config';
import { NULL_ADDRESS } from '../constants';
import { QuoteRequestor, SignedNativeOrderMM, V4RFQIndicativeQuoteMM } from '../quoteRequestor/QuoteRequestor';
import { QuoteServerPriceParams, RequireOnlyOne, RfqtV2PricesApiRequest, RfqtV2PricesApiResponse } from '../types';
import { QuoteServerClient } from '../utils/quote_server_client';
import { RfqMakerManager } from '../utils/rfq_maker_manager';

type RfqtV2PricesApiRequestWithIntegrator = Omit<RfqtV2PricesApiRequest, 'integratorId'> & {
    integrator: Integrator;
};

/**
 * Converts the parameters of an RFQt v2 prices request from 0x API
 * into the format needed for `QuoteServerClient` to call the market makers
 */
function transformRfqtV2PricesParameters(
    p: RfqtV2PricesApiRequestWithIntegrator,
    chainId: number,
): QuoteServerPriceParams {
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
        feeToken: NULL_ADDRESS,
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
    ) {}

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
        txOrigin: string; // expect this to be the taker address
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
                txOrigin,
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
    public async getV2PricesAsync(parameters: RfqtV2PricesApiRequestWithIntegrator): Promise<RfqtV2PricesApiResponse> {
        const { integrator, makerToken, takerToken } = parameters;

        // Fetch the makers active on this pair
        const makers = this._rfqMakerManager
            .getRfqtV2MakersForPair(makerToken, takerToken)
            .filter((m) => m.rfqtUri !== null);

        // Short circuit if no makers are active
        if (!makers.length) {
            return [];
        }

        // TODO (haozhuo): check to see if MM passes circuit breaker

        const prices = (
            await this._quoteServerClient.batchGetPriceV2Async(
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
}
