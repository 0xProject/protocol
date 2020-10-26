import { LiquidityProviderRegistry } from './types';

// tslint:disable completed-docs
export function getLiquidityProvidersForPair(
    registry: LiquidityProviderRegistry,
    takerToken: string,
    makerToken: string,
): string[] {
    return Object.entries(registry)
        .filter(([, tokens]) => [makerToken, takerToken].every(t => tokens.includes(t)))
        .map(([providerAddress]) => providerAddress);
}
