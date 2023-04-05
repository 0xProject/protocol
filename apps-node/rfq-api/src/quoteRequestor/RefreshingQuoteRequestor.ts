import { Signature } from '@0x/protocol-utils';
import type { MarketOperation } from '@0x/types';
import { BigNumber } from '@0x/utils';
import { AxiosInstance } from 'axios';

import { ONE_SECOND_MS } from '../core/constants';
import type { SignedNativeOrder } from '../core/types';
import { RfqMakerManager } from '../utils/rfq_maker_manager';

import { METRICS_PROXY } from './MetricsProxyImpl';
import type { RfqRequestOpts } from './QuoteRequestor';
import { MetricsProxy, QuoteRequestor, V4RFQIndicativeQuoteMM } from './QuoteRequestor';

// This number should not be greater than 90s. Otherwise, the RFQt quotes from Jump and WM are likely to be filtered out
const DEFAULT_EXPIRY_BUFFER_MS = ONE_SECOND_MS * 80;

/**
 * A wrapper of `QuoteRequestor` constructed with an instance of `RfqMakerManager`
 * instead of `rfqAssetOfferings`. This allows the underlying Quote Requestor
 * to be refreshed with the pairs of RfqMakerManager are refreshed.
 */
export class RefreshingQuoteRequestor {
    private _quoteRequestor: QuoteRequestor;
    private readonly _metrics: MetricsProxy;
    constructor(
        private readonly _rfqMakerManager: RfqMakerManager,
        private readonly _quoteRequestorHttpClient: AxiosInstance,
        private readonly _altRfqCreds?: { altRfqApiKey: string; altRfqProfile: string },
        private readonly _expiryBufferMs: number = DEFAULT_EXPIRY_BUFFER_MS,
    ) {
        this._metrics = METRICS_PROXY;
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
     * Passthrough to the internal `QuoteRequestor`'s `getMakerUriForSignature`
     * method.
     */
    public getMakerUriForSignature(signature: Signature): string | undefined {
        return this._quoteRequestor.getMakerUriForSignature(signature);
    }

    /**
     * Handler for when the RFQ Maker Manager emits a pairs refreshed event.
     * Creates a new `QuoteRequestor` instance with new pairs.
     */
    private _createQuoteRequestor(): QuoteRequestor {
        const rfqAssetOfferings = this._rfqMakerManager.getRfqtV1MakerOfferings();
        return new QuoteRequestor(
            rfqAssetOfferings,
            this._quoteRequestorHttpClient,
            this._altRfqCreds,
            this._expiryBufferMs,
            this._metrics,
        );
    }
}
