import { CalldataInfo, ExchangeProxyContractOpts, SwapQuote } from '../../types';

export interface FeatureRule {
    isCompatible(quote: SwapQuote, opts: ExchangeProxyContractOpts): boolean;
    createCalldata(quote: SwapQuote, opts: ExchangeProxyContractOpts): CalldataInfo;
}

export interface FeatureRuleRegistry {
    getTransformErc20Rule(): FeatureRule;
}
