import { LogFunction, RfqMakerAssetOfferings } from '@0x/asset-swapper';
import { MetricsProxy, QuoteRequestor } from '@0x/asset-swapper/lib/src/utils/quote_requestor';
import { AxiosInstance } from 'axios';

import { RfqMakerManager } from './rfq_maker_manager';

/**
 * QuoteRequestorManager manages the most up to date QuoteRequestor instance and provide it to consumers.
 * It listens to RfqMakerManager for the `refreshed` event, which is emitted if the RfqMaker entities are successfully refreshed,
 * to renew the QuoteRequestor with the refreshed RfqMaker entities.
 */
export class QuoteRequestorManager {
    private _quoteRequestor!: QuoteRequestor;

    constructor(
        private readonly _rfqMakerManager: RfqMakerManager,
        private readonly _rfqtAssetOfferings: RfqMakerAssetOfferings,
        private readonly _quoteRequestorHttpClient: AxiosInstance,
        private readonly _altRfqCreds?: {
            altRfqApiKey: string;
            altRfqProfile: string;
        },
        private readonly _warningLogger?: LogFunction,
        private readonly _infoLogger?: LogFunction,
        private readonly _expiryBufferMs?: number,
        private readonly _metrics?: MetricsProxy,
    ) {
        this._renew();
        this._rfqMakerManager.on(RfqMakerManager.REFRESHED_EVENT, () => {
            this._renew();
        });
    }

    /**
     * Get the instance of most up to date QuoteRequestor
     */
    public getInstance(): QuoteRequestor {
        return this._quoteRequestor;
    }

    /**
     * Renew the cached QuoteRequestor instance with up to date RFQm asset offerings
     */
    private _renew(): void {
        this._quoteRequestor = new QuoteRequestor(
            this._rfqtAssetOfferings,
            this._rfqMakerManager.getRfqmMakerOfferingsForRfqOrder(),
            this._quoteRequestorHttpClient,
            this._altRfqCreds,
            this._warningLogger,
            this._infoLogger,
            this._expiryBufferMs,
            this._metrics,
        );
    }
}
