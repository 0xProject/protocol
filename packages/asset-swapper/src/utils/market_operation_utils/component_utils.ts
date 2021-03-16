import { MAINNET_COMPONENT_POOLS } from './constants';

// tslint:disable completed-docs
export function getComponentsForPair(takerToken: string, makerToken: string): string[] {
    const pools = Object.values(MAINNET_COMPONENT_POOLS)
        .filter(c => [makerToken, takerToken].every(t => c.tokens.includes(t)))
        .map(i => i.poolAddress);
    return pools;
}
