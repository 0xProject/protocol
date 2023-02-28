import { BigNumber } from '@0x/utils';
import { SwapQuote, ExchangeProxyContractOpts, CalldataInfo } from '../../types';
import { getMaxQuoteSlippageRate } from '../quote_consumer_utils';
import { FeatureRule, SwapContext } from './types';

export abstract class AbstractFeatureRule implements FeatureRule {
    /** Returns a commonly needed context.*/
    protected getSwapContext(quote: SwapQuote, opts: ExchangeProxyContractOpts): SwapContext {
        // Take the bounds from the worst case
        const sellAmount = BigNumber.max(
            quote.bestCaseQuoteInfo.totalTakerAmount,
            quote.worstCaseQuoteInfo.totalTakerAmount,
        );

        const ethAmount = quote.worstCaseQuoteInfo.protocolFeeInWeiAmount.plus(opts.isFromETH ? sellAmount : 0);
        const maxSlippage = getMaxQuoteSlippageRate(quote);

        return {
            sellToken: quote.takerToken,
            buyToken: quote.makerToken,
            sellAmount,
            minBuyAmount: quote.worstCaseQuoteInfo.makerAmount,
            ethAmount,
            maxSlippage,
        };
    }

    public abstract isCompatible(_quote: SwapQuote, _opts: ExchangeProxyContractOpts): boolean;
    public abstract createCalldata(_quote: SwapQuote, _opts: ExchangeProxyContractOpts): CalldataInfo;
}
