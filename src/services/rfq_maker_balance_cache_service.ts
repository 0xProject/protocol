import { BigNumber } from '@0x/utils';
import { Counter, Gauge, Summary } from 'prom-client';

import { logger } from '../logger';
import { ERC20Owner } from '../types';
import { CacheClient } from '../utils/cache_client';
import { RfqBlockchainUtils } from '../utils/rfq_blockchain_utils';

const RFQ_BALANCE_CACHE_CHECKED = new Counter({
    name: 'rfq_balance_cache_checked',
    help: 'Number of times we checked balance cache',
});
const RFQ_BALANCE_CACHE_MISS = new Counter({
    name: 'rfq_balance_cache_missed',
    help: 'cache miss observed in balance cache',
});
const RFQ_BALANCE_CACHE_READ_LATENCY = new Summary({
    name: 'rfq_balance_cache_read_latency',
    help: 'Read latency for balance cache',
});
const RFQ_BALANCE_CACHE_WRITE_LATENCY = new Summary({
    name: 'rfq_balance_cache_write_latency',
    help: 'Write latency for balance cache',
});
const RFQ_BALANCE_CACHE_EVICT_LATENCY = new Summary({
    name: 'rfq_balance_cache_evict_latency',
    help: 'Evict latency for balance cache',
});
const RFQ_BALANCE_CACHE_NUM_ADDRESSES = new Gauge({
    name: 'rfq_balance_cache_num_addresses',
    help: 'Number of unique addresses in balance cache',
});

/**
 * RfqMakerBalanceCacheService is used by RfqmService to fetch maker token balances.
 * It maintains a balance cache that is periodically updated via on-chain balance checks.
 */
export class RfqMakerBalanceCacheService {
    constructor(private readonly _cacheClient: CacheClient, private readonly _blockchainUtils: RfqBlockchainUtils) {}

    /**
     * Gets token balances for supplied maker and token addresses from the maker balance cache.
     * Performs a balance check if balances are not found in the cache.
     * Returns an array of balances ordered by corresponding erc20Owner objects.
     */
    public async getERC20OwnerBalancesAsync(
        chainId: number,
        erc20Owners: ERC20Owner | ERC20Owner[],
    ): Promise<BigNumber[]> {
        const timerStopFunction = RFQ_BALANCE_CACHE_READ_LATENCY.startTimer();

        const erc20OwnersArr = Array.isArray(erc20Owners) ? erc20Owners : [erc20Owners];
        let cachedBalances: (BigNumber | null)[];
        try {
            RFQ_BALANCE_CACHE_CHECKED.inc(erc20OwnersArr.length);
            cachedBalances = await this._cacheClient.getERC20OwnerBalancesAsync(chainId, erc20OwnersArr);
        } catch (e) {
            timerStopFunction();
            logger.error({ chainId, erc20Owners }, 'Failed to read entries from maker balance cache');
            throw e;
        }

        // On cache miss (i.e. if balance is null), add to pending maker token addresses
        const pendingIndices: number[] = [];
        await Promise.all(
            cachedBalances.map(async (balance, i) => {
                if (balance === null) {
                    RFQ_BALANCE_CACHE_MISS.inc();
                    await this._cacheClient.addERC20OwnerAsync(chainId, erc20OwnersArr[i]);
                    pendingIndices.push(i);
                }
            }),
        );

        // Perform balance check and update balances accordingly
        // At this point, remaining null balances will be represented as zero balances
        // and will be subject to eviction.
        let balances: BigNumber[];
        if (pendingIndices.length !== 0) {
            const fetchedBalances = await this._blockchainUtils.getMinOfBalancesAndAllowancesAsync(
                erc20OwnersArr.filter((_, i) => pendingIndices.includes(i)),
            );
            balances = cachedBalances.map((balance) => {
                if (balance === null) {
                    const fetchedBalance = fetchedBalances.shift();
                    return fetchedBalance ? fetchedBalance : new BigNumber(0);
                }
                // balance should be a valid BigNumber at this point
                return balance;
            });
        } else {
            // balances should not be null here
            balances = cachedBalances.filter((balance): balance is BigNumber => balance !== null);
        }

        timerStopFunction();
        return balances;
    }

    /**
     * Updates cached token balances by making an on-chain balance check.
     * All newly observed erc20Owners included in the set of maintained maker token addresses are updated.
     */
    public async updateERC20OwnerBalancesAsync(chainId: number): Promise<void> {
        const timerStopFunction = RFQ_BALANCE_CACHE_WRITE_LATENCY.startTimer();
        try {
            const erc20Owners = await this._cacheClient.getERC20OwnersAsync(chainId);
            if (erc20Owners.length > 0) {
                RFQ_BALANCE_CACHE_NUM_ADDRESSES.set(erc20Owners.length);
                const balances = await this._blockchainUtils.getMinOfBalancesAndAllowancesAsync(erc20Owners);

                await this._cacheClient.setERC20OwnerBalancesAsync(chainId, erc20Owners, balances);
            }
        } catch (e) {
            logger.error({ chainId }, 'Failed to update entries for maker balance cache');
            throw e;
        } finally {
            timerStopFunction();
        }
    }

    /**
     * Performs eviction of stale cache entries with zero balances.
     */
    public async evictZeroBalancesAsync(chainId: number): Promise<number> {
        const timerStopFunction = RFQ_BALANCE_CACHE_EVICT_LATENCY.startTimer();
        try {
            return this._cacheClient.evictZeroBalancesAsync(chainId);
        } catch (e) {
            logger.error({ chainId }, 'Failed to evict entries from maker balance cache');
            throw e;
        } finally {
            timerStopFunction();
        }
    }

    /**
     * Safely close the maker balance cache service to avoid potential memory leak.
     */
    public async closeAsync(): Promise<void> {
        try {
            return this._cacheClient.closeAsync();
        } catch (e) {
            logger.error({ message: e.message, stack: e.stack }, 'Failed to close RFQm maker balance cache service');
            throw e;
        }
    }
}
