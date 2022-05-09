import { MarketOperation, RfqRequestOpts, SignedNativeOrder } from '@0x/asset-swapper/lib/src/types';
import { BigNumber } from '@0x/utils';
import { AxiosInstance } from 'axios';

import { ONE_MINUTE_MS } from '../constants';
import { RfqMakerManager } from '../utils/rfq_maker_manager';

import { MetricsProxy, QuoteRequestor, V4RFQIndicativeQuoteMM } from './QuoteRequestor';

// Matches asset swapper:
// https://github.com/0xProject/protocol/blob/4327885a00c15bb17a3ab0c010d2b8071e366488/packages/asset-swapper/src/constants.ts#L34
const DEFAULT_EXPIRY_BUFFER_MS = ONE_MINUTE_MS * 2;

/**
 * A wrapper of `QuoteRequestor` constructed with an instance of `RfqMakerManager`
 * instead of `rfqAssetOfferings`. This allows the underlying Quote Requestor
 * to be refreshed with the pairs of RfqMakerManager are refreshed.
 */
export class RefreshingQuoteRequestor {
    private _quoteRequestor: QuoteRequestor;
    constructor(
        private readonly _rfqMakerManager: RfqMakerManager,
        private readonly _quoteRequestorHttpClient: AxiosInstance,
        private readonly _altRfqCreds?: { altRfqApiKey: string; altRfqProfile: string },
        private readonly _expiryBufferMs: number = DEFAULT_EXPIRY_BUFFER_MS,
        private readonly _metrics?: MetricsProxy,
    ) {
        this._quoteRequestor = this._createQuoteRequestor();
        this._rfqMakerManager.on(
            RfqMakerManager.REFRESHED_EVENT,
            () => (this._quoteRequestor = this._createQuoteRequestor()),
        );
    }

    /**
     * Passthrough to the internal `QuoteRequestor`'s `requestRfqtIndicativeQuotesAsync`
     * method.
     */
    public async requestRfqtIndicativeQuotesAsync(
        makerToken: string,
        takerToken: string,
        assetFillAmount: BigNumber,
        marketOperation: MarketOperation,
        comparisonPrice: BigNumber | undefined,
        options: RfqRequestOpts,
    ): Promise<V4RFQIndicativeQuoteMM[]> {
        return this._quoteRequestor.requestRfqtIndicativeQuotesAsync(
            makerToken,
            takerToken,
            assetFillAmount,
            marketOperation,
            comparisonPrice,
            options,
        );
    }

    /**
     * Passthrough to the internal `QuoteRequestor`'s `requestRfqtFirmQuotesAsync`
     * method.
     */
    public async requestRfqtFirmQuotesAsync(
        makerToken: string, // maker token
        takerToken: string, // taker token
        assetFillAmount: BigNumber,
        marketOperation: MarketOperation,
        comparisonPrice: BigNumber | undefined,
        options: RfqRequestOpts,
    ): Promise<SignedNativeOrder[]> {
        return this._quoteRequestor.requestRfqtFirmQuotesAsync(
            makerToken,
            takerToken,
            assetFillAmount,
            marketOperation,
            comparisonPrice,
            options,
        );
    }

    /**
     * Handler for when the RFQ Maker Manager emits a pairs refreshed event.
     * Creates a new `QuoteRequestor` instance with new pairs.
     */
    private _createQuoteRequestor(): QuoteRequestor {
        const rfqAssetOfferings = this._rfqMakerManager.getRfqmMakerOfferings();
        return new QuoteRequestor(
            rfqAssetOfferings,
            this._quoteRequestorHttpClient,
            this._altRfqCreds,
            this._expiryBufferMs,
            this._metrics,
        );
    }
}
