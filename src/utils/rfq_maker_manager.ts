import { RfqMakerAssetOfferings } from '@0x/asset-swapper';
import * as EventEmitter from 'events';
import { Counter, Summary } from 'prom-client';

import { MakerIdSet, RFQ_MAKER_REFRESH_INTERVAL_MS, RFQ_WORKFLOW } from '../config';
import { RfqMaker } from '../entities';
import { logger } from '../logger';

import { ConfigManager } from './config_manager';
import { pairUtils } from './pair_utils';
import { RfqMakerDbUtils } from './rfq_maker_db_utils';

const RFQ_MAKER_REFRESH_FAILED = new Counter({
    name: 'rfq_maker_refresh_failed',
    help: 'A maker refreshing job failed.',
    labelNames: ['chainId', 'workflow'],
});
const RFQ_MAKER_REFRESH_SUCCEEDED = new Counter({
    name: 'rfq_maker_refresh_succeeded',
    help: 'A maker refreshing job succeeded.',
    labelNames: ['chainId', 'workflow'],
});
const RFQ_MAKER_REFRESH_LATENCY = new Summary({
    name: 'rfq_maker_refresh_latency',
    help: 'Latency for the maker maker refreshing job.',
    labelNames: ['chainId', 'workflow'],
});

/**
 * Transform RfqMakerAssetOfferings into an object of the form:
 *
 * {
 *   "0xtokenA-0xtokenB": ["https://maker1.asdf", "https://maker2.asdf"],
 *   "0xtokenC-0xtokenD": ["https://maker1.asdf", "https://maker2.asdf"]
 * }
 */
const generatePairToMakerUriMap = (offerings: RfqMakerAssetOfferings): PairsToUris => {
    if (!offerings) {
        return {};
    }

    const makerUris = Object.keys(offerings);
    const res: PairsToUris = {};
    makerUris.forEach((makerUri) => {
        const pairs = offerings[makerUri];
        pairs.forEach((pair) => {
            const key = pairUtils.toKey(...pair);
            if (res[key] !== undefined) {
                res[key].push(makerUri);
            } else {
                res[key] = [makerUri];
            }
        });
    });

    return res;
};

type PairsToUris = Record<string, string[]>;

/**
 * Returns Asset Offerings from an RfqMakerConfig map and a list of RfqMaker
 */
const generateAssetOfferings = (makerIdSet: MakerIdSet, makers: RfqMaker[]): RfqMakerAssetOfferings => {
    return makers.reduce((offering: RfqMakerAssetOfferings, maker: RfqMaker) => {
        if (makerIdSet.has(maker.makerId) && maker.rfqmUri !== null) {
            offering[maker.rfqmUri] = maker.pairs;
        }
        return offering;
    }, {});
};

/**
 * RfqMakersManager abstracts away all operations for handling RfqMaker entities
 */
export class RfqMakerManager extends EventEmitter {
    public static REFRESHED_EVENT = 'refreshed';

    private readonly _rfqmMakerIdSet: MakerIdSet;
    private readonly _rfqmMakerIdSetForRfqOrder: MakerIdSet;
    private readonly _rfqmMakerIdSetForOtcOrder: MakerIdSet;
    private _rfqmMakerOfferings: RfqMakerAssetOfferings;
    private _rfqmMakerOfferingsForRfqOrder: RfqMakerAssetOfferings;
    private _rfqmPairToMakerUrisForOtcOrder: PairsToUris;
    private _rfqMakerListUpdateTimeHash: string | null;

    constructor(
        private readonly _configManager: ConfigManager,
        private readonly _dbUtils: RfqMakerDbUtils,
        private readonly _chainId: number,
    ) {
        super();

        this._rfqmMakerOfferings = {};
        this._rfqmMakerOfferingsForRfqOrder = {};
        this._rfqmPairToMakerUrisForOtcOrder = {};

        this._rfqmMakerIdSet = this._configManager.getRfqmMakerIdSet();
        this._rfqmMakerIdSetForRfqOrder = this._configManager.getRfqmMakerIdSetForRfqOrder();
        this._rfqmMakerIdSetForOtcOrder = this._configManager.getRfqmMakerIdSetForOtcOrder();
        this._rfqMakerListUpdateTimeHash = null;
    }

    /**
     * Initialize RfqMaker entities and set up periodical refreshing
     */
    public async initializeAsync(): Promise<void> {
        await this._refreshAsync();

        setInterval(async () => {
            await this._refreshAsync();
        }, RFQ_MAKER_REFRESH_INTERVAL_MS);
    }

    /**
     * Get a list of RFQm Maker Uris that support this pair on OtcOrder
     */
    public getRfqmMakerUrisForPairOnOtcOrder(makerToken: string, takerToken: string): string[] {
        return this._rfqmPairToMakerUrisForOtcOrder[pairUtils.toKey(makerToken, takerToken)] || [];
    }

    /**
     * Get the RfqMakerAssetOfferings for rfq or otc orders
     */
    public getRfqmMakerOfferings(): RfqMakerAssetOfferings {
        return this._rfqmMakerOfferings;
    }

    /**
     * Get the RfqMakerAssetOfferings for RfqOrder
     */
    public getRfqmMakerOfferingsForRfqOrder(): RfqMakerAssetOfferings {
        return this._rfqmMakerOfferingsForRfqOrder;
    }

    /**
     * Refresh RfqMaker entities by querying database.
     * Emit an 'refreshed' event for subscribers to refresh if the operation is successful.
     */
    private async _refreshAsync(): Promise<void> {
        const chainId = this._chainId;
        const refreshTime = new Date();
        const timerStopFunction = RFQ_MAKER_REFRESH_LATENCY.labels(chainId.toString(), RFQ_WORKFLOW).startTimer();

        try {
            const rfqMakerListUpdateTimeHash = await this._dbUtils.getRfqMakersUpdateTimeHashAsync(chainId);
            if (rfqMakerListUpdateTimeHash === this._rfqMakerListUpdateTimeHash) {
                return;
            }

            logger.info({ chainId, refreshTime }, `Start refreshing makers.`);

            this._rfqMakerListUpdateTimeHash = rfqMakerListUpdateTimeHash;
            const rfqMakerList = await this._dbUtils.getRfqMakersAsync(chainId);

            this._rfqmMakerOfferings = generateAssetOfferings(this._rfqmMakerIdSet, rfqMakerList);

            this._rfqmMakerOfferingsForRfqOrder = generateAssetOfferings(this._rfqmMakerIdSetForRfqOrder, rfqMakerList);

            const rfqmMakerOfferingsForOtcOrder = generateAssetOfferings(this._rfqmMakerIdSetForOtcOrder, rfqMakerList);
            this._rfqmPairToMakerUrisForOtcOrder = generatePairToMakerUriMap(rfqmMakerOfferingsForOtcOrder);

            this.emit(RfqMakerManager.REFRESHED_EVENT);

            logger.info({ chainId, refreshTime }, `Successfully refreshed makers.`);
            RFQ_MAKER_REFRESH_SUCCEEDED.labels(chainId.toString(), RFQ_WORKFLOW).inc();
        } catch (error) {
            logger.error({ chainId, refreshTime, errorMessage: error.message }, `Failed to refresh makers.`);
            RFQ_MAKER_REFRESH_FAILED.labels(chainId.toString(), RFQ_WORKFLOW).inc();
        } finally {
            timerStopFunction();
        }
    }
}
