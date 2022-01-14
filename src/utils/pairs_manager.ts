import { RfqMakerAssetOfferings } from '@0x/asset-swapper';
import * as EventEmitter from 'events';
import { Counter, Summary } from 'prom-client';

import { MakerIdsToConfigs, RfqMakerConfig, RFQ_PAIR_REFRESH_INTERVAL_MS, RFQ_WORKFLOW } from '../config';
import { RfqMakerPairs } from '../entities';
import { logger } from '../logger';

import { ConfigManager } from './config_manager';
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

const RfqMakerUrlField: 'rfqtMakerUri' | 'rfqmMakerUri' = `${RFQ_WORKFLOW}MakerUri`;
/**
 * Returns Asset Offerings from an RfqMakerConfig map and a list of RfqMakerPairs
 */
const generateAssetOfferings = (
    makerConfigMap: MakerIdsToConfigs,
    makerPairsList: RfqMakerPairs[],
): RfqMakerAssetOfferings => {
    return makerPairsList.reduce((offering: RfqMakerAssetOfferings, pairs: RfqMakerPairs) => {
        if (makerConfigMap.has(pairs.makerId)) {
            const makerConfig: RfqMakerConfig = makerConfigMap.get(pairs.makerId)!;
            offering[makerConfig[RfqMakerUrlField]] = pairs.pairs;
        }
        return offering;
    }, {});
};

/**
 * PairsManager abstracts away all operations for handling maker pairs
 */
export class PairsManager extends EventEmitter {
    public static REFRESHED_EVENT = 'refreshed';

    private readonly _rfqtMakerConfigMapForRfqOrder: MakerIdsToConfigs;
    private _rfqtMakerOfferingsForRfqOrder: RfqMakerAssetOfferings;
    private _rfqMakerPairsListUpdateTimeHash: string | null;

    constructor(private readonly _configManager: ConfigManager, private readonly _dbUtils: RfqMakerDbUtils) {
        super();

        this._rfqtMakerOfferingsForRfqOrder = {};
        this._rfqtMakerConfigMapForRfqOrder = this._configManager.getRfqtMakerConfigMapForRfqOrder();
        this._rfqMakerPairsListUpdateTimeHash = null;
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
     * Get the RfqMakerAssetOfferings for RfqOrder
     */
    public getRfqtMakerOfferingsForRfqOrder(): RfqMakerAssetOfferings {
        return this._rfqtMakerOfferingsForRfqOrder;
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

            const rfqMakerPairsListUpdateTimeHash = await this._dbUtils.getPairsArrayUpdateTimeHashAsync(chainId);

            if (rfqMakerPairsListUpdateTimeHash === this._rfqMakerPairsListUpdateTimeHash) {
                logger.info({ chainId, refreshTime }, `Pairs are up to date.`);
                return;
            }

            logger.info({ chainId, refreshTime }, `Start refreshing pairs.`);

            this._rfqMakerPairsListUpdateTimeHash = rfqMakerPairsListUpdateTimeHash;
            const rfqMakerPairs = await this._dbUtils.getPairsArrayAsync(chainId);

            this._rfqtMakerOfferingsForRfqOrder = generateAssetOfferings(
                this._rfqtMakerConfigMapForRfqOrder,
                rfqMakerPairs,
            );

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
