import { FillQuoteTransformerOrderType } from '@0x/protocol-utils';
import { BigNumber, hexUtils } from '@0x/utils';

import { NativeOrderWithFillableAmounts } from '../native_orders';
import { MarketOperation } from '../../types';

import { POSITIVE_INF, SOURCE_FLAGS, ZERO_AMOUNT } from './constants';
import { DexSample, ERC20BridgeSource, Fill, GenericBridgeFill, NativeOrderFill } from './types';

// tslint:disable: prefer-for-of no-bitwise completed-docs

/**
 * Create `Fill` objects from orders and dex quotes.
 */
export function createFills(opts: {
    side: MarketOperation;
    orders?: NativeOrderWithFillableAmounts[];
    dexQuotes?: DexSample[][];
    targetInput?: BigNumber;
    outputAmountPerEth?: BigNumber;
    inputAmountPerEth?: BigNumber;
    gasPrice: BigNumber;
}): Fill[][] {
    const { side } = opts;
    const orders = opts.orders || [];
    const dexQuotes = opts.dexQuotes || [];
    const outputAmountPerEth = opts.outputAmountPerEth || ZERO_AMOUNT;
    const inputAmountPerEth = opts.inputAmountPerEth || ZERO_AMOUNT;
    // Create native fills.
    const nativeFills = nativeOrdersToFills(
        side,
        orders.filter(o => o.fillableTakerAmount.isGreaterThan(0)),
        opts.targetInput,
        outputAmountPerEth,
        inputAmountPerEth,
        opts.gasPrice,
    );
    // Create DEX fills.
    const dexFills = dexQuotes.map(singleSourceSamples =>
        dexSamplesToFills(side, singleSourceSamples, outputAmountPerEth, inputAmountPerEth, opts.gasPrice),
    );
    return [...dexFills, nativeFills]
        .map(p => clipFillsToInput(p, opts.targetInput))
        .filter(fills => hasLiquidity(fills));
}

function clipFillsToInput(fills: Fill[], targetInput: BigNumber = POSITIVE_INF): Fill[] {
    const clipped: Fill[] = [];
    let input = ZERO_AMOUNT;
    for (const fill of fills) {
        if (input.gte(targetInput)) {
            break;
        }
        input = input.plus(fill.input);
        clipped.push(fill);
    }
    return clipped;
}

function hasLiquidity(fills: Fill[]): boolean {
    if (fills.length === 0) {
        return false;
    }
    const totalInput = BigNumber.sum(...fills.map(fill => fill.input));
    const totalOutput = BigNumber.sum(...fills.map(fill => fill.output));
    if (totalInput.isZero() || totalOutput.isZero()) {
        return false;
    }
    return true;
}

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
        ? outputAmountPerEth.times(ethAmount)
        : inputAmountPerEth.times(ethAmount).times(output.dividedToIntegerBy(input));
}

export function nativeOrdersToFills(
    side: MarketOperation,
    orders: NativeOrderWithFillableAmounts[],
    targetInput: BigNumber = POSITIVE_INF,
    outputAmountPerEth: BigNumber,
    inputAmountPerEth: BigNumber,
    gasPrice: BigNumber,
    filterNegativeAdjustedRateOrders: boolean = true,
): NativeOrderFill[] {
    if (orders.length === 0) {
        return [];
    }
    const sourcePathId = hexUtils.random();
    // Create a single path from all orders.
    let fills: Array<NativeOrderFill & { adjustedRate: BigNumber }> = [];
    for (const o of orders) {
        const { fillableTakerAmount, fillableMakerAmount, type } = o;
        // TODO(lawrence): handle taker fees.
        if (o.fillableTakerFeeAmount.gt(0)) {
            continue;
        }
        let input, output;
        if (side === MarketOperation.Sell) {
            input = fillableTakerAmount;
            output = fillableMakerAmount;
        } else {
            input = fillableMakerAmount;
            output = fillableTakerAmount;
        }
        const outputPenalty = ethToOutputAmount({
            input,
            output,
            inputAmountPerEth,
            outputAmountPerEth,
            ethAmount: gasPrice.times(o.gasCost),
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
            continue;
        }
        fills.push({
            type,
            sourcePathId,
            adjustedOutput,
            adjustedRate,
            input: clippedInput,
            output: clippedOutput,
            flags: SOURCE_FLAGS[type === FillQuoteTransformerOrderType.Rfq ? 'RfqOrder' : 'LimitOrder'],
            index: 0, // TBD
            parent: undefined, // TBD
            source: ERC20BridgeSource.Native,
            gasCost: o.gasCost,
            data: {
                order: o.order,
                signature: o.signature,
                fillableTakerAmount: o.fillableTakerAmount,
            },
        });
    }
    // Sort by descending adjusted rate.
    fills = fills.sort((a, b) => b.adjustedRate.comparedTo(a.adjustedRate));
    // Re-index fills.
    for (let i = 0; i < fills.length; ++i) {
        fills[i].parent = i === 0 ? undefined : fills[i - 1];
        fills[i].index = i;
    }
    return fills;
}

export function dexSamplesToFills(
    side: MarketOperation,
    samples: DexSample[],
    outputAmountPerEth: BigNumber,
    inputAmountPerEth: BigNumber,
    gasPrice: BigNumber,
): GenericBridgeFill[] {
    const sourcePathId = hexUtils.random();
    const fills: GenericBridgeFill[] = [];
    // Drop any non-zero entries. This can occur if the any fills on Kyber were UniswapReserves
    // We need not worry about Kyber fills going to UniswapReserve as the input amount
    // we fill is the same as we sampled. I.e we received [0,20,30] output from [1,2,3] input
    // and we only fill [2,3] on Kyber (as 1 returns 0 output)
    const nonzeroSamples = samples.filter(q => !q.output.isZero());
    for (let i = 0; i < nonzeroSamples.length; i++) {
        const sample = nonzeroSamples[i];
        const prevSample = i === 0 ? undefined : nonzeroSamples[i - 1];
        const { source, encodedFillData, metadata } = sample;
        const input = sample.input.minus(prevSample ? prevSample.input : 0);
        const output = sample.output.minus(prevSample ? prevSample.output : 0);
        const fee = gasPrice.times(sample.gasCost);

        let penalty = ZERO_AMOUNT;
        if (i === 0) {
            // Only the first fill in a DEX path incurs a penalty.
            penalty = ethToOutputAmount({
                input,
                output,
                inputAmountPerEth,
                outputAmountPerEth,
                ethAmount: fee,
            });
        }
        const adjustedOutput = side === MarketOperation.Sell ? output.minus(penalty) : output.plus(penalty);

        fills.push({
            sourcePathId,
            input,
            output,
            adjustedOutput,
            source,
            type: FillQuoteTransformerOrderType.Bridge,
            gasCost: sample.gasCost,
            index: i,
            parent: i !== 0 ? fills[fills.length - 1] : undefined,
            flags: SOURCE_FLAGS[source],
            data: {
                ...metadata,
                encodedFillData,
            },
        });
    }
    return fills;
}
