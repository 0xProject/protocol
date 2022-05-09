import { AltRfqMakerAssetOfferings, SignedNativeOrder } from '@0x/asset-swapper/lib/src/types';
import { MarketOperation } from '@0x/types';
import { BigNumber } from '@0x/utils';

import { Integrator } from '../config';
import { QuoteRequestor, V4RFQIndicativeQuoteMM } from '../quoteRequestor/QuoteRequestor';

/**
 * Central class to contain the logic to handle RFQT Trades.
 *
 * `"v1"` functions support `MetaTransaction` trades while
 * `"v2"` functions (will) support `OtcOrder` trades.
 *
 * `v1` relies heavily on `QuoteRequestor` which has been copied over
 * from `0x/asset-swapper`.
 */
export class RfqtService {
    constructor(private readonly _quoteRequestor: QuoteRequestor) {}

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
    }): Promise<SignedNativeOrder[]> {
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

        return this._quoteRequestor.requestRfqtFirmQuotesAsync(
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
    }
}
