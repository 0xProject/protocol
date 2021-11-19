import { BigNumber } from '@0x/utils';

import { MarketOperation } from '../../types';

import { ZERO_AMOUNT } from './constants';

// tslint:disable:no-bitwise

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
