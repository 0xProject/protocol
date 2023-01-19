import { BigNumber } from '@0x/utils';
import { CalldataInfo, ExchangeProxyContractOpts, SwapQuote } from '../../types';

export interface SwapContext {
    sellToken: string;
    buyToken: string;
    sellAmount: BigNumber;
    minBuyAmount: BigNumber;
    ethAmount: BigNumber;
    maxSlippage: number;
}

export interface FeatureRule {
    isCompatible(quote: SwapQuote, opts: ExchangeProxyContractOpts): boolean;
    createCalldata(quote: SwapQuote, opts: ExchangeProxyContractOpts): CalldataInfo;
}

export interface FeatureRuleRegistry {
    getUniswapV2Rule(): FeatureRule;
    getTransformErc20Rule(): FeatureRule;
}
