/**
 * Types migrated from Asset Swapper
 */

import { FillQuoteTransformerOrderType, LimitOrderFields, RfqOrderFields, Signature } from '@0x/protocol-utils';

export enum SwapQuoterError {
    NoEtherTokenContractFound = 'NO_ETHER_TOKEN_CONTRACT_FOUND',
    StandardRelayerApiError = 'STANDARD_RELAYER_API_ERROR',
    InsufficientAssetLiquidity = 'INSUFFICIENT_ASSET_LIQUIDITY',
    AssetUnavailable = 'ASSET_UNAVAILABLE',
    NoGasPriceProvidedOrEstimated = 'NO_GAS_PRICE_PROVIDED_OR_ESTIMATED',
    AssetDataUnsupported = 'ASSET_DATA_UNSUPPORTED',
    PriceImpactTooHigh = 'PRICE_IMPACT_TOO_HIGH',
}

export interface SignedOrder<T> {
    order: T;
    type: FillQuoteTransformerOrderType.Limit | FillQuoteTransformerOrderType.Rfq;
    signature: Signature;
}
export type SignedNativeOrder = SignedOrder<LimitOrderFields> | SignedOrder<RfqOrderFields>;
