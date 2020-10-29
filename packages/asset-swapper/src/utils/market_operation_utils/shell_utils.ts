import { MAINNET_SHELL_POOLS } from './constants';

// tslint:disable completed-docs
export function getShellsForPair(takerToken: string, makerToken: string): string[] {
    return Object.values(MAINNET_SHELL_POOLS)
        .filter(c => [makerToken, takerToken].every(t => c.tokens.includes(t)))
        .map(i => i.poolAddress);
}
