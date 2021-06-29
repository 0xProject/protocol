import { BigNumber } from '@0x/utils';

import { DexSample, ERC20BridgeSource } from '../../network/types';
import { TwoHopFillData } from '../../network/two_hop_sampler'
import { MarketOperation } from '../../types';

import { SOURCE_FLAGS, ZERO_AMOUNT } from './constants';
import { ExchangeProxyOverhead, FeeSchedule, } from './types';

// tslint:disable:no-bitwise

/**
 * Returns the fee-adjusted rate of a two-hop quote. Returns zero if the
 * quote falls short of the target input.
 */
export function getTwoHopAdjustedRate(
    side: MarketOperation,
    twoHopQuote: DexSample<TwoHopFillData>,
    targetInput: BigNumber,
    outputAmountPerEth: BigNumber,
    fees: FeeSchedule = {},
    exchangeProxyOverhead: ExchangeProxyOverhead = () => ZERO_AMOUNT,
): BigNumber {
    const { output, input, fillData } = twoHopQuote;
    if (input.isLessThan(targetInput) || output.isZero()) {
        return ZERO_AMOUNT;
    }
    const penalty = outputAmountPerEth.times(
        exchangeProxyOverhead(
            SOURCE_FLAGS.MultiHop |
                SOURCE_FLAGS[fillData.firstHop.source] |
                SOURCE_FLAGS[fillData.secondHop.source],
            2,
        ).plus(fees[ERC20BridgeSource.MultiHop]!(fillData)),
    );
    const adjustedOutput = side === MarketOperation.Sell ? output.minus(penalty) : output.plus(penalty);
    return side === MarketOperation.Sell ? adjustedOutput.div(input) : input.div(adjustedOutput);
}

/**
 * Computes the "complete" rate given the input/output of a path.
 * This value penalizes the path if it falls short of the target input.
 */
export function getCompleteRate(
    side: MarketOperation,
    input: BigNumber,
    output: BigNumber,
    targetInput: BigNumber,
): BigNumber {
    if (input.eq(0) || output.eq(0) || targetInput.eq(0)) {
        return ZERO_AMOUNT;
    }
    // Penalize paths that fall short of the entire input amount by a factor of
    // input / targetInput => (i / t)
    if (side === MarketOperation.Sell) {
        // (o / i) * (i / t) => (o / t)
        return output.div(targetInput);
    }
    // (i / o) * (i / t)
    return input.div(output).times(input.div(targetInput));
}

/**
 * Computes the rate given the input/output of a path.
 */
export function getRate(side: MarketOperation, input: BigNumber, output: BigNumber): BigNumber {
    if (input.eq(0) || output.eq(0)) {
        return ZERO_AMOUNT;
    }
    return side === MarketOperation.Sell ? output.div(input) : input.div(output);
}
