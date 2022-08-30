import { Pool, PoolsCache } from './pools_cache';

export class NoOpPoolsCache implements PoolsCache {
    public async getFreshPoolsForPairAsync(
        _takerToken: string,
        _makerToken: string,
        _timeoutMs?: number | undefined,
    ): Promise<Pool[]> {
        return [];
    }

    public getPoolAddressesForPair(_takerToken: string, _makerToken: string): string[] {
        return [];
    }

    public isFresh(_takerToken: string, _makerToken: string): boolean {
        return true;
    }
}
