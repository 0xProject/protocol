import { LiquidityProviderRegistry } from './types';

export function getLiquidityProvidersForPair(
    registry: LiquidityProviderRegistry,
    takerToken: string,
    makerToken: string,
): { providerAddress: string; gasCost: number }[] {
    return Object.entries(registry)
        .filter(([, plp]) => [makerToken, takerToken].every((t) => plp.tokens.includes(t)))
        .map(([providerAddress]) => {
            let gasCost: number;
            if (typeof registry[providerAddress].gasCost === 'number') {
                gasCost = registry[providerAddress].gasCost as number;
            } else {
                gasCost = (registry[providerAddress].gasCost as (takerToken: string, makerToken: string) => number)(
                    takerToken,
                    makerToken,
                );
            }
            return {
                providerAddress,
                gasCost,
            };
        });
}
