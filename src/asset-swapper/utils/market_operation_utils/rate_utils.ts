import { FillQuoteTransformerOrderType } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';

import { MarketOperation } from '../../types';

import { SOURCE_FLAGS, ZERO_AMOUNT } from './constants';
import { adjustOutput } from './fills';
import {
    DexSample,
    ERC20BridgeSource,
    ExchangeProxyOverhead,
    FeeSchedule,
    Fill,
    FillAdjustor,
    MultiHopFillData,
} from './types';

/**
 * Returns the fee-adjusted rate of a two-hop quote. Returns zero if the
 * quote falls short of the target input.
 */
export function getTwoHopAdjustedRate(
    side: MarketOperation,
    twoHopQuote: DexSample<MultiHopFillData>,
    targetInput: BigNumber,
    outputAmountPerEth: BigNumber,
    fees: FeeSchedule,
    exchangeProxyOverhead: ExchangeProxyOverhead,
    fillAdjustor: FillAdjustor,
): BigNumber {
    const { output, input, fillData } = twoHopQuote;
    if (input.isLessThan(targetInput) || output.isZero()) {
        return ZERO_AMOUNT;
    }

    // Flags to indicate which sources are used
    const flags =
        SOURCE_FLAGS.MultiHop |
        SOURCE_FLAGS[fillData.firstHopSource.source] |
        SOURCE_FLAGS[fillData.secondHopSource.source];

    // Penalty of going to those sources in terms of output
    const sourcePenalty = outputAmountPerEth.times(fees[ERC20BridgeSource.MultiHop]!(fillData).fee).integerValue();

    // Create a Fill so it can be adjusted by the `FillAdjustor`
    const fill: Fill = {
        ...twoHopQuote,
        flags,
        type: FillQuoteTransformerOrderType.Bridge,
        adjustedOutput: adjustOutput(side, twoHopQuote.output, sourcePenalty),
        sourcePathId: `${ERC20BridgeSource.MultiHop}-${fillData.firstHopSource.source}-${fillData.secondHopSource.source}`,
        // We don't have this information at this stage
        gas: 0,
    };
    // Adjust the individual Fill
    // HACK: Chose the worst of slippage between the two sources in multihop
    const adjustedOutputLeft = fillAdjustor.adjustFills(
        side,
        [{ ...fill, source: fillData.firstHopSource.source }],
        targetInput,
    )[0].adjustedOutput;
    const adjustedOutputRight = fillAdjustor.adjustFills(
        side,
        [{ ...fill, source: fillData.secondHopSource.source }],
        targetInput,
    )[0].adjustedOutput;
    // In Sells, output smaller is worse (you're getting less out)
    // In Buys, output larger is worse (it's costing you more)
    const fillAdjustedOutput =
        side === MarketOperation.Sell
            ? BigNumber.min(adjustedOutputLeft, adjustedOutputRight)
            : BigNumber.max(adjustedOutputLeft, adjustedOutputRight);

    const pathPenalty = outputAmountPerEth.times(exchangeProxyOverhead(flags)).integerValue();
    const pathAdjustedOutput = adjustOutput(side, fillAdjustedOutput, pathPenalty);

    return getRate(side, input, pathAdjustedOutput);
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
 *
 * If it is a sell, output/input. If it is a buy, input/output.
 */
export function getRate(side: MarketOperation, input: BigNumber, output: BigNumber): BigNumber {
    if (input.eq(0) || output.eq(0)) {
        return ZERO_AMOUNT;
    }
    return side === MarketOperation.Sell ? output.div(input) : input.div(output);
}
