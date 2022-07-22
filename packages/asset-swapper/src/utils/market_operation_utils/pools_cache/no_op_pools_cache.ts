import { Pool, PoolsCache } from './pools_cache';

export class NoOpPoolsCache implements PoolsCache {
    // tslint:disable-next-line: prefer-function-over-method
    public async getFreshPoolsForPairAsync(
        _takerToken: string,
        _makerToken: string,
        _timeoutMs?: number | undefined,
    ): Promise<Pool[]> {
        return [];
    }

    // tslint:disable-next-line: prefer-function-over-method
    public getPoolAddressesForPair(_takerToken: string, _makerToken: string): string[] {
        return [];
    }

    // tslint:disable-next-line: prefer-function-over-method
    public isFresh(_takerToken: string, _makerToken: string): boolean {
        return true;
    }
}
