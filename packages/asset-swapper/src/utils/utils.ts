import { ChainId } from '@0x/contract-addresses';

// TODO(kimpers): Consolidate this implementation with the one in @0x/token-metadata
export function valueByChainId<T>(rest: Partial<{ [key in ChainId]: T }>, defaultValue: T): { [key in ChainId]: T } {
    // TODO I don't like this but iterating through enums is weird
    return {
        [ChainId.Mainnet]: defaultValue,
        [ChainId.Ropsten]: defaultValue,
        [ChainId.Rinkeby]: defaultValue,
        [ChainId.Kovan]: defaultValue,
        [ChainId.Ganache]: defaultValue,
        [ChainId.BSC]: defaultValue,
        [ChainId.Polygon]: defaultValue,
        [ChainId.PolygonMumbai]: defaultValue,
        [ChainId.Avalanche]: defaultValue,
        [ChainId.Fantom]: defaultValue,
        ...(rest || {}),
    };
}
