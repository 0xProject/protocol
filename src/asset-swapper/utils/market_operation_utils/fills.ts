import { FillQuoteTransformerOrderType } from '@0x/protocol-utils';
import { BigNumber, hexUtils } from '@0x/utils';

import { MarketOperation, NativeOrderWithFillableAmounts } from '../../types';

import { DEFAULT_FEE_ESTIMATE, POSITIVE_INF, SOURCE_FLAGS } from './constants';
import { DexSample, ERC20BridgeSource, FeeEstimate, FeeSchedule, Fill, MultiHopFillData } from './types';

/**
 * Converts the ETH value to an amount in output tokens.
 *
 * By default this prefers the outputAmountPerEth, but if this value
 * is zero it will utilize the inputAmountPerEth and input.
 */
export function ethToOutputAmount({
    input,
    output,
    ethAmount,
    inputAmountPerEth,
    outputAmountPerEth,
}: {
    input: BigNumber;
    output: BigNumber;
    inputAmountPerEth: BigNumber;
    outputAmountPerEth: BigNumber;
    ethAmount: BigNumber | number;
}): BigNumber {
    return !outputAmountPerEth.isZero()
        ? outputAmountPerEth.times(ethAmount).integerValue()
        : inputAmountPerEth.times(ethAmount).times(output.dividedToIntegerBy(input));
}

export function nativeOrderToFill(
    side: MarketOperation,
    order: NativeOrderWithFillableAmounts,
    targetInput: BigNumber = POSITIVE_INF,
    outputAmountPerEth: BigNumber,
    inputAmountPerEth: BigNumber,
    fees: FeeSchedule,
    filterNegativeAdjustedRateOrders = true,
): Fill | undefined {
    const sourcePathId = hexUtils.random();
    // Create a single path from all orders.
    const { fillableTakerAmount, fillableTakerFeeAmount, fillableMakerAmount, type } = order;
    const makerAmount = fillableMakerAmount;
    const takerAmount = fillableTakerAmount.plus(fillableTakerFeeAmount);
    const input = side === MarketOperation.Sell ? takerAmount : makerAmount;
    const output = side === MarketOperation.Sell ? makerAmount : takerAmount;
    const { fee, gas } =
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- TODO: fix me!
        fees[ERC20BridgeSource.Native] === undefined ? DEFAULT_FEE_ESTIMATE : fees[ERC20BridgeSource.Native]!(order);
    const outputPenalty = ethToOutputAmount({
        input,
        output,
        inputAmountPerEth,
        outputAmountPerEth,
        ethAmount: fee,
    });
    // targetInput can be less than the order size
    // whilst the penalty is constant, it affects the adjusted output
    // only up until the target has been exhausted.
    // A large order and an order at the exact target should be penalized
    // the same.
    const clippedInput = BigNumber.min(targetInput, input);
    // scale the clipped output inline with the input
    const clippedOutput = clippedInput.dividedBy(input).times(output);
    const adjustedOutput =
        side === MarketOperation.Sell ? clippedOutput.minus(outputPenalty) : clippedOutput.plus(outputPenalty);
    const adjustedRate =
        side === MarketOperation.Sell ? adjustedOutput.div(clippedInput) : clippedInput.div(adjustedOutput);
    // Optionally skip orders with rates that are <= 0.
    if (filterNegativeAdjustedRateOrders && adjustedRate.lte(0)) {
        return undefined;
    }

    return {
        sourcePathId,
        adjustedOutput,
        input: clippedInput,
        output: clippedOutput,
        flags: SOURCE_FLAGS[type === FillQuoteTransformerOrderType.Rfq ? 'RfqOrder' : 'LimitOrder'],
        source: ERC20BridgeSource.Native,
        type,
        fillData: { ...order },
        gas,
    };
}

export function dexSampleToFill(
    side: MarketOperation,
    sample: DexSample,
    outputAmountPerEth: BigNumber,
    inputAmountPerEth: BigNumber,
    fees: FeeSchedule,
): Fill {
    const sourcePathId = hexUtils.random();
    const { source, fillData } = sample;
    const input = sample.input;
    const output = sample.output;
    const { fee, gas } =
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- TODO: fix me!
        fees[source] === undefined ? DEFAULT_FEE_ESTIMATE : fees[source]!(sample.fillData) || DEFAULT_FEE_ESTIMATE;

    const penalty = ethToOutputAmount({
        input,
        output,
        inputAmountPerEth,
        outputAmountPerEth,
        ethAmount: fee,
    });

    return {
        sourcePathId,
        input,
        output,
        adjustedOutput: adjustOutput(side, output, penalty),
        source,
        fillData,
        type: FillQuoteTransformerOrderType.Bridge,
        flags: SOURCE_FLAGS[source],
        gas,
    };
}

export function twoHopSampleToFill(
    side: MarketOperation,
    twoHopSample: DexSample<MultiHopFillData>,
    outputAmountPerEth: BigNumber,
    multihopFeeEstimate: FeeEstimate,
): Fill {
    const { fillData } = twoHopSample;

    // Flags to indicate which sources are used
    const flags =
        SOURCE_FLAGS.MultiHop |
        SOURCE_FLAGS[fillData.firstHopSource.source] |
        SOURCE_FLAGS[fillData.secondHopSource.source];

    // Penalty of going to those sources in terms of output
    const sourcePenalty = outputAmountPerEth.times(multihopFeeEstimate(fillData).fee).integerValue();
    return {
        ...twoHopSample,
        flags,
        type: FillQuoteTransformerOrderType.Bridge,
        adjustedOutput: adjustOutput(side, twoHopSample.output, sourcePenalty),
        sourcePathId: `${ERC20BridgeSource.MultiHop}-${fillData.firstHopSource.source}-${fillData.secondHopSource.source}`,
        // We don't have this information at this stage
        gas: 0,
    };
}

/**
 *  Adjusts the output depending on whether this is a buy or a sell.
 *
 * If it is a sell, than output is lowered by the adjustment.
 * If it is a buy, than output is increased by adjustment.
 */
export function adjustOutput(side: MarketOperation, output: BigNumber, penalty: BigNumber): BigNumber {
    return side === MarketOperation.Sell ? output.minus(penalty) : output.plus(penalty);
}
