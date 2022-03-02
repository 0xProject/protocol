import { RfqMakerAssetOfferings } from '@0x/asset-swapper';
import * as EventEmitter from 'events';
import { Counter, Summary } from 'prom-client';

import { MakerIdsToConfigs, RfqMakerConfig, RFQ_PAIR_REFRESH_INTERVAL_MS, RFQ_WORKFLOW } from '../config';
import { RfqMaker } from '../entities';
import { logger } from '../logger';

import { ConfigManager } from './config_manager';
import { pairUtils } from './pair_utils';
import { RfqMakerDbUtils } from './rfq_maker_db_utils';

const RFQ_MAKER_PAIRS_REFRESH_FAILED = new Counter({
    name: 'rfq_maker_pairs_refresh_failed',
    help: 'A pair refreshing job failed.',
    labelNames: ['chainId', 'workflow'],
});
const RFQ_MAKER_PAIRS_REFRESH_SUCCEEDED = new Counter({
    name: 'rfq_maker_pairs_refresh_succeeded',
    help: 'A pair refreshing job succeeded.',
    labelNames: ['chainId', 'workflow'],
});
const RFQ_MAKER_PAIRS_REFRESH_LATENCY = new Summary({
    name: 'rfq_maker_pairs_refresh_latency',
    help: 'Latency for the maker pair refreshing job.',
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
const RfqMakerUrlField: 'rfqtMakerUri' | 'rfqmMakerUri' = `${RFQ_WORKFLOW}MakerUri`;

/**
 * Returns Asset Offerings from an RfqMakerConfig map and a list of RfqMaker
 */
const generateAssetOfferings = (makerConfigMap: MakerIdsToConfigs, makers: RfqMaker[]): RfqMakerAssetOfferings => {
    return makers.reduce((offering: RfqMakerAssetOfferings, maker: RfqMaker) => {
        if (makerConfigMap.has(maker.makerId)) {
            const makerConfig: RfqMakerConfig = makerConfigMap.get(maker.makerId)!;
            offering[makerConfig[RfqMakerUrlField]] = maker.pairs;
        }
        return offering;
    }, {});
};

/**
 * PairsManager abstracts away all operations for handling maker pairs
 */
export class PairsManager extends EventEmitter {
    public static REFRESHED_EVENT = 'refreshed';

    private readonly _rfqmMakerConfigMap: MakerIdsToConfigs;
    private readonly _rfqmMakerConfigMapForRfqOrder: MakerIdsToConfigs;
    private readonly _rfqmMakerConfigMapForOtcOrder: MakerIdsToConfigs;
    private _rfqmMakerOfferings: RfqMakerAssetOfferings;
    private _rfqmMakerOfferingsForRfqOrder: RfqMakerAssetOfferings;
    private _rfqmPairToMakerUrisForOtcOrder: PairsToUris;
    private _rfqMakerListUpdateTimeHash: string | null;

    constructor(private readonly _configManager: ConfigManager, private readonly _dbUtils: RfqMakerDbUtils) {
        super();

        this._rfqmMakerOfferings = {};
        this._rfqmMakerOfferingsForRfqOrder = {};
        this._rfqmPairToMakerUrisForOtcOrder = {};

        this._rfqmMakerConfigMap = this._configManager.getRfqmMakerConfigMap();
        this._rfqmMakerConfigMapForRfqOrder = this._configManager.getRfqmMakerConfigMapForRfqOrder();
        this._rfqmMakerConfigMapForOtcOrder = this._configManager.getRfqmMakerConfigMapForOtcOrder();
        this._rfqMakerListUpdateTimeHash = null;
    }

    /**
     * Initialize pairs data and set up periodical refreshing
     */
    public async initializeAsync(): Promise<void> {
        await this._refreshAsync();

        setInterval(async () => {
            await this._refreshAsync();
        }, RFQ_PAIR_REFRESH_INTERVAL_MS);
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
     * Refresh the pairs information for each maker by querying database.
     * Emit an 'refreshed' event for subscribers to refresh if the operation is successful.
     */
    private async _refreshAsync(): Promise<void> {
        const chainId = this._configManager.getChainId();
        const refreshTime = new Date();
        const timerStopFunction = RFQ_MAKER_PAIRS_REFRESH_LATENCY.labels(chainId.toString(), RFQ_WORKFLOW).startTimer();

        try {
            logger.info({ chainId, refreshTime }, `Check if refreshing is necessary.`);

            const rfqMakerListUpdateTimeHash = await this._dbUtils.getRfqMakersUpdateTimeHashAsync(chainId);

            if (rfqMakerListUpdateTimeHash === this._rfqMakerListUpdateTimeHash) {
                logger.info({ chainId, refreshTime }, `Pairs are up to date.`);
                return;
            }

            logger.info({ chainId, refreshTime }, `Start refreshing pairs.`);

            this._rfqMakerListUpdateTimeHash = rfqMakerListUpdateTimeHash;
            const rfqMakerList = await this._dbUtils.getRfqMakersAsync(chainId);

            this._rfqmMakerOfferings = generateAssetOfferings(this._rfqmMakerConfigMap, rfqMakerList);

            this._rfqmMakerOfferingsForRfqOrder = generateAssetOfferings(
                this._rfqmMakerConfigMapForRfqOrder,
                rfqMakerList,
            );

            const rfqmMakerOfferingsForOtcOrder = generateAssetOfferings(
                this._rfqmMakerConfigMapForOtcOrder,
                rfqMakerList,
            );
            this._rfqmPairToMakerUrisForOtcOrder = generatePairToMakerUriMap(rfqmMakerOfferingsForOtcOrder);

            this.emit(PairsManager.REFRESHED_EVENT);

            logger.info({ chainId, refreshTime }, `Successfully refreshed pairs.`);
            RFQ_MAKER_PAIRS_REFRESH_SUCCEEDED.labels(chainId.toString(), RFQ_WORKFLOW).inc();
        } catch (error) {
            logger.error({ chainId, refreshTime, errorMessage: error.message }, `Failed to refresh pairs.`);
            RFQ_MAKER_PAIRS_REFRESH_FAILED.labels(chainId.toString(), RFQ_WORKFLOW).inc();
        } finally {
            timerStopFunction();
        }
    }
}
