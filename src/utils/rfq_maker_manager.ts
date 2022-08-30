import { RfqMakerAssetOfferings } from '@0x/asset-swapper';
import * as EventEmitter from 'events';
import { Counter, Summary } from 'prom-client';

import { MakerIdSet, RfqWorkFlowType, RFQ_MAKER_REFRESH_INTERVAL_MS } from '../config';
import { RfqMaker } from '../entities';
import { logger } from '../logger';

import { ConfigManager } from './config_manager';
import { toPairString } from './pair_utils';
import { RfqMakerDbUtils } from './rfq_maker_db_utils';

const RFQ_MAKER_REFRESH_FAILED = new Counter({
    name: 'rfq_maker_refresh_failed',
    help: 'A maker refreshing job failed.',
    labelNames: ['chainId'],
});
const RFQ_MAKER_REFRESH_SUCCEEDED = new Counter({
    name: 'rfq_maker_refresh_succeeded',
    help: 'A maker refreshing job succeeded.',
    labelNames: ['chainId'],
});
const RFQ_MAKER_REFRESH_LATENCY = new Summary({
    name: 'rfq_maker_refresh_latency',
    help: 'Latency for the maker maker refreshing job.',
    labelNames: ['chainId'],
});

/**
 * Filters an array of makers (fetched from the database) to remove
 * those (1) not in the set `ids`, and (2) who have no URI set for the
 * given `workflow`
 */
function filterMakers(makers: RfqMaker[], workflow: RfqWorkFlowType, ids: MakerIdSet): RfqMaker[] {
    return makers.filter(
        (maker: RfqMaker) =>
            ids.has(maker.makerId) &&
            ((workflow === 'rfqm' && maker.rfqmUri !== null) || (workflow === 'rfqt' && maker.rfqtUri !== null)),
    );
}

/**
 * Transforms an array of makers into their asset offerings for a given workflow
 */
function makersToAssetOfferings(makers: RfqMaker[], workflow: RfqWorkFlowType): RfqMakerAssetOfferings {
    return makers.reduce((result: RfqMakerAssetOfferings, m) => {
        const uri: string | null = workflow === 'rfqm' ? m.rfqmUri : m.rfqtUri;

        if (!uri) {
            throw new Error();
        }
        result[uri] = m.pairs;
        return result;
    }, {});
}

/**
 * Filters the given `makers` to only those trading on the given `pair`
 */
function makersForPair(makers: RfqMaker[], pair: string): RfqMaker[] {
    return makers.filter((m: RfqMaker) => {
        return m.pairs.map((p) => toPairString(...p)).includes(pair);
    });
}

/**
 * Unifies the maker configuration collected from environment variables
 * and the `rfq_maker_pairs` database. Once initialized, refreshes itself
 * per the `RFQ_MAKER_REFRESH_INTERVAL_MS` configuration variable.
 *
 * Usage:
 * // Instantiate instance
 * const rfqMakerManager = new RfqMakerManager(configManager, dbUtils, chainId);
 * // Initialize
 * await rfqMakerManager.initializeAsync();
 */
export class RfqMakerManager extends EventEmitter {
    public static REFRESHED_EVENT = 'refreshed';

    private _rfqmMakers: RfqMaker[];
    private _rfqtV1Makers: RfqMaker[];
    private _rfqtV2Makers: RfqMaker[];

    private _rfqMakerListUpdateHash: string | null;

    constructor(
        private readonly _configManager: ConfigManager,
        private readonly _dbUtils: RfqMakerDbUtils,
        private readonly _chainId: number,
    ) {
        super();

        this._rfqmMakers = [];
        this._rfqtV1Makers = [];
        this._rfqtV2Makers = [];

        this._rfqMakerListUpdateHash = null;
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
     * Get the RfqMakerAssetOfferings for rfqt orders with rfq order type
     */
    public getRfqtV1MakerOfferings(): RfqMakerAssetOfferings {
        return makersToAssetOfferings(this._rfqtV1Makers, 'rfqt');
    }

    /**
     * Get the Rfqt MakerAssetOfferings for Otc Order
     */
    public getRfqtV2MakerOfferings(): RfqMakerAssetOfferings {
        return makersToAssetOfferings(this._rfqtV2Makers, 'rfqt');
    }

    /**
     * Returns the `RfqMaker` entities trading the given token pair
     * on RFQt V2
     */
    public getRfqtV2MakersForPair(tokenAAddress: string, tokenBAddress: string): RfqMaker[] {
        return makersForPair(this._rfqtV2Makers, toPairString(tokenAAddress, tokenBAddress)) || [];
    }

    /**
     * Get the RfqMakerAssetOfferings for RFQm orders.
     * As of Q1 2022, the RFQ order type has been deprecated
     * and only OTC orders are used on RFQm.
     */
    public getRfqmV2MakerOfferings(): RfqMakerAssetOfferings {
        return makersToAssetOfferings(this._rfqmMakers, 'rfqm');
    }

    /**
     * Get a list of RFQm Maker Uris that support this pair on OtcOrder
     */
    public getRfqmV2MakerUrisForPair(
        makerToken: string,
        takerToken: string,
        whitelistMakerIds: string[] | null = null,
    ): string[] {
        let makers = makersForPair(this._rfqmMakers, toPairString(makerToken, takerToken)) || [];

        if (whitelistMakerIds !== null) {
            makers = makers.filter((maker) => whitelistMakerIds.includes(maker.makerId));
        }

        return makers.map((m) => m.rfqmUri).filter((uri: string | null): uri is string => uri !== null);
    }

    /**
     * Find maker ID from its RFQm URI
     */
    public findMakerIdWithRfqmUri(makerRfqmUri: string): string | null {
        const maker = this._rfqmMakers.find((m) => m.rfqmUri === makerRfqmUri);
        return maker?.makerId || null;
    }

    /**
     * Refresh RfqMaker entities by querying database.
     * Emit an 'refreshed' event for subscribers to refresh if the operation is successful.
     */
    private async _refreshAsync(): Promise<void> {
        const chainId = this._chainId;
        const refreshTime = new Date();
        const timerStopFunction = RFQ_MAKER_REFRESH_LATENCY.labels(chainId.toString()).startTimer();

        try {
            const rfqMakerListUpdateHash = await this._dbUtils.getRfqMakersUpdateTimeHashAsync(chainId);
            if (rfqMakerListUpdateHash === this._rfqMakerListUpdateHash) {
                return;
            }
            this._rfqMakerListUpdateHash = rfqMakerListUpdateHash;

            const rfqMakerList = await this._dbUtils.getRfqMakersAsync(chainId);

            this._rfqtV1Makers = filterMakers(rfqMakerList, 'rfqt', this._configManager.getRfqtMakerIdSetForRfqOrder());
            this._rfqtV2Makers = filterMakers(rfqMakerList, 'rfqt', this._configManager.getRfqtMakerIdSetForOtcOrder());
            this._rfqmMakers = filterMakers(rfqMakerList, 'rfqm', this._configManager.getRfqmMakerIdSetForOtcOrder());

            this.emit(RfqMakerManager.REFRESHED_EVENT);

            logger.info({ chainId, refreshTime }, `Successfully refreshed makers.`);
            RFQ_MAKER_REFRESH_SUCCEEDED.labels(chainId.toString()).inc();
        } catch (error) {
            logger.error({ chainId, refreshTime, errorMessage: error.message }, `Failed to refresh makers.`);
            RFQ_MAKER_REFRESH_FAILED.labels(chainId.toString()).inc();
        } finally {
            timerStopFunction();
        }
    }
}
