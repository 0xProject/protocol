import { ZERO } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';
import { RedisClientType } from 'redis';

import { MAKER_TOKEN_BALANCE_EXPIRY_SECONDS } from '../constants';
import { ERC20Owner } from '../types';

import { splitAddresses } from './address_utils';
import { toPairString } from './pair_utils';

const OTC_ORDER_NONCE_BUCKET_COUNTER_KEY = (chainId: number) => `otcorder.nonce.bucket.counter.chain.${chainId}`;
// The value stored at this key is a set. The members of this set are each an ERC20_OWNER_BALANCE_KEY.
const ERC20_OWNERS_KEY = (chainId: number) => `erc20.owners.chain.${chainId}`;
const ERC20_OWNER_BALANCE_KEY = (chainId: number, ownerAddress: string, tokenAddress: string) =>
    `erc20.owner.balance.chain.${chainId}.${ownerAddress}.${tokenAddress}`;
// Use `chainId` and pair keys as Redis keys for sorted set entries, used for cooling down makers after bad last look rejection.
const LLR_COOLDOWN_SET_KEY = (chainId: number, tokenA: string, tokenB: string) =>
    `coolingdown.makers.chain.${chainId}.pair.${toPairString(tokenA, tokenB)}`;

export class CacheClient {
    constructor(private readonly _redisClient: RedisClientType) {}

    // Shut down the CacheClient safely
    public async closeAsync(): Promise<void> {
        return this._redisClient.quit();
    }

    // Get the next OtcOrder Bucket
    // NOTE: unliklely to ever hit this, but the node library we use tries to cast the response from Redis as a number.
    // However, MAX_INT for js is lower than MAX_INT for Redis. We also need to be aware of if Redis' MAX_INT ever gets hit (error)
    public async getNextOtcOrderBucketAsync(chainId: number): Promise<number> {
        return this._redisClient.incr(OTC_ORDER_NONCE_BUCKET_COUNTER_KEY(chainId));
    }

    /**
     * Fetches all maker token addresses to be updated.
     * Token addresses set stores unique erc20Owners as balance cache keys.
     */
    public async getERC20OwnersAsync(chainId: number): Promise<ERC20Owner[]> {
        const cacheKeys = await this._redisClient.sMembers(ERC20_OWNERS_KEY(chainId));
        // parse cache keys into ERC20Owner objects
        // cache key follows the format of `prefix.${chainId}.${owner}.${token}`
        return cacheKeys.map((cacheKey) => {
            const addresses = cacheKey.split('.');
            return {
                owner: addresses[addresses.length - 2],
                token: addresses[addresses.length - 1],
            };
        });
    }

    /**
     * Adds a newly observed erc20Owner to the set of known maker tokens.
     * The values in this set are keys used to retrieve the maker's balance.
     * They are iterated upon in the next maker balance cache update.
     */
    public async addERC20OwnerAsync(chainId: number, erc20Owner: ERC20Owner): Promise<void> {
        const { owners, tokens } = splitAddresses(erc20Owner);
        await this._redisClient.sAdd(ERC20_OWNERS_KEY(chainId), ERC20_OWNER_BALANCE_KEY(chainId, owners[0], tokens[0]));
    }

    /**
     * Evicts maker token addresses with zero balances from the cache.
     * We assume that market makers no longer supply liquidity for tokens with zero balances.
     */
    public async evictZeroBalancesAsync(chainId: number): Promise<number> {
        const setKey = ERC20_OWNERS_KEY(chainId);
        const cacheKeys = await this._redisClient.sMembers(setKey);
        if (cacheKeys.length === 0) {
            return 0;
        }
        const balances = await this._redisClient.mGet(cacheKeys);
        const evictedKeys = cacheKeys.filter((_, idx) => {
            const balance = balances[idx];
            return balance != null && ZERO.eq(new BigNumber(balance));
        });
        if (evictedKeys.length === 0) {
            return 0;
        }
        return this._redisClient.sRem(setKey, evictedKeys);
    }

    /**
     * Gets maker balances for provided erc20Owners from the cache.
     * A cache miss will result in a null value, and otherwise a valid BigNumber.
     * Throws an error if invalid addresses are passed.
     * Each GET is a fast O(1) read request to the cache.
     */
    public async getERC20OwnerBalancesAsync(chainId: number, erc20Owners: ERC20Owner[]): Promise<(BigNumber | null)[]> {
        const cacheKeys = this._validateAndGetBalanceCacheKeys(chainId, erc20Owners);
        const balances = await this._redisClient.mGet(cacheKeys);
        return balances.map((balance) => (balance ? new BigNumber(balance) : null));
    }

    /**
     * Sets and/or updates maker balances for provided maker and token addresses.
     * Refreshes cache entry expiries to two minutes from now.
     * Throws an error if invalid addresses or balances are passed.
     * Each SET is a fast O(1) write request to the cache.
     */
    public async setERC20OwnerBalancesAsync(
        chainId: number,
        erc20Owners: ERC20Owner[],
        balances: BigNumber[],
    ): Promise<void> {
        const cacheKeys = this._validateAndGetBalanceCacheKeys(chainId, erc20Owners, balances);
        await Promise.all(
            cacheKeys.map(async (cacheKey, i) =>
                this._redisClient.set(cacheKey, balances[i].toString(), { EX: MAKER_TOKEN_BALANCE_EXPIRY_SECONDS }),
            ),
        );
    }

    /**
     * Add maker to cooldown sorted set of given pair. Maker Ids in the sorted set are sorted by
     * cooldown period endTime, so as to allow quickly filter out these with expired cooldown period.
     *
     * @param makerId ID of maker to be added or updated
     * @param endTime time stamp to end the cooldown period, in millisecond
     * @param chainId chainId of the pair
     * @param tokenA address of one trading token
     * @param tokenB address of the other trading token
     * @returns whether the sorted set get updated
     */
    public async addMakerToCooldownAsync(
        makerId: string,
        endTime: number,
        chainId: number,
        tokenA: string,
        tokenB: string,
    ): Promise<boolean> {
        const changedMemberCount = await this._redisClient.ZADD(
            LLR_COOLDOWN_SET_KEY(chainId, tokenA, tokenB),
            { score: endTime, value: makerId },
            {
                GT: true, // Only update if setting a higher score
                CH: true, // return number of set members get changed (added and updated)
            },
        );
        return changedMemberCount > 0;
    }

    /**
     * Get a list of makers that are cooling down for given pair. Only includes unexpired entries.
     *
     * @param chainId chainId of the pair
     * @param tokenA address of one trading token
     * @param tokenB address of the other trading token
     * @returns array of maker IDs
     */
    public async getMakersInCooldownForPairAsync(chainId: number, tokenA: string, tokenB: string): Promise<string[]> {
        // Sorted set members use cooldown expiration time as scores, so selecting members with scores larger than `Date.now()`
        // will give a complete list of makers in cooldown.
        const minScore = Date.now();
        const maxScore = '+inf';
        return this._redisClient.ZRANGE(LLR_COOLDOWN_SET_KEY(chainId, tokenA, tokenB), minScore, maxScore, {
            BY: 'SCORE',
        });
    }

    /**
     * Validates maker and token addresses.
     * If balances are passed, validates that every cache key has a corresponding value.
     * Generates a cache key for every pair through string concatenation.
     */
    // tslint:disable-next-line: prefer-function-over-method
    private _validateAndGetBalanceCacheKeys(
        chainId: number,
        erc20Owners: ERC20Owner[],
        balances?: BigNumber[],
    ): string[] {
        if (balances && erc20Owners.length !== balances.length) {
            throw new Error('Maker addresses do not match balances');
        }
        const { owners, tokens } = splitAddresses(erc20Owners);
        return owners.map((owner, i) => {
            return ERC20_OWNER_BALANCE_KEY(chainId, owner, tokens[i]);
        });
    }
}
