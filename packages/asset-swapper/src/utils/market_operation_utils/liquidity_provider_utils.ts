import { LiquidityProviderRegistry } from './types';

// tslint:disable completed-docs
export function getLiquidityProvidersForPair(
    registry: LiquidityProviderRegistry,
    takerToken: string,
    makerToken: string,
): string[] {
    return Object.entries(registry)
        .filter(([, plp]) => [makerToken, takerToken].every(t => plp.tokens.includes(t)))
        .map(([providerAddress]) => providerAddress);
}
