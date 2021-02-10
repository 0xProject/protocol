import { Pool } from '@balancer-labs/sor/dist/types';

import { BalancerPoolsCache } from '../../src/utils/market_operation_utils/balancer_utils';

export interface Handlers {
    getPoolsForPairAsync: (takerToken: string, makerToken: string) => Promise<Pool[]>;
    _fetchPoolsForPairAsync: (takerToken: string, makerToken: string) => Promise<Pool[]>;
    _loadTopPoolsAsync: () => Promise<void>;
}

export class MockBalancerPoolsCache extends BalancerPoolsCache {
    constructor(public handlers: Partial<Handlers>) {
        super();
    }

    public async getPoolsForPairAsync(takerToken: string, makerToken: string): Promise<Pool[]> {
        return this.handlers.getPoolsForPairAsync
            ? this.handlers.getPoolsForPairAsync(takerToken, makerToken)
            : super.getPoolsForPairAsync(takerToken, makerToken);
    }

    protected async _fetchPoolsForPairAsync(takerToken: string, makerToken: string): Promise<Pool[]> {
        return this.handlers._fetchPoolsForPairAsync
            ? this.handlers._fetchPoolsForPairAsync(takerToken, makerToken)
            : super._fetchPoolsForPairAsync(takerToken, makerToken);
    }

    protected async _loadTopPoolsAsync(): Promise<void> {
        if (this.handlers && this.handlers._loadTopPoolsAsync) {
            return this.handlers._loadTopPoolsAsync();
        }
    }
}
