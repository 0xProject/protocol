import { assert } from '@0x/assert';
import { ChainId } from '@0x/contract-addresses';
import { OptimizerCapture, route, SerializedPath } from '@0x/neon-router';
import { FillQuoteTransformerOrderType } from '@0x/protocol-utils';
import { BigNumber, hexUtils } from '@0x/utils';
import * as _ from 'lodash';
import { performance } from 'perf_hooks';

import { SAMPLER_METRICS } from '../../../utils/sampler_metrics';
import { DEFAULT_WARNING_LOGGER } from '../../constants';
import { MarketOperation, NativeOrderWithFillableAmounts } from '../../types';

import { VIP_ERC20_BRIDGE_SOURCES_BY_CHAIN_ID, ZERO_AMOUNT } from './constants';
import { dexSampleToFill, ethToOutputAmount, nativeOrderToFill } from './fills';
import { Path, PathPenaltyOpts } from './path';
import { DexSample, ERC20BridgeSource, FeeSchedule, Fill, FillAdjustor, FillData } from './types';

// NOTE: The Rust router will panic with less than 3 samples
const MIN_NUM_SAMPLE_INPUTS = 3;

const isDexSample = (obj: DexSample | NativeOrderWithFillableAmounts): obj is DexSample => !!(obj as DexSample).source;

const ONE_BASE_UNIT = new BigNumber(1);

function nativeOrderToNormalizedAmounts(
    side: MarketOperation,
    nativeOrder: NativeOrderWithFillableAmounts,
): { input: BigNumber; output: BigNumber } {
    const { fillableTakerAmount, fillableTakerFeeAmount, fillableMakerAmount } = nativeOrder;
    const makerAmount = fillableMakerAmount;
    const takerAmount = fillableTakerAmount.plus(fillableTakerFeeAmount);
    const input = side === MarketOperation.Sell ? takerAmount : makerAmount;
    const output = side === MarketOperation.Sell ? makerAmount : takerAmount;

    return { input, output };
}

function calculateOuputFee(
    side: MarketOperation,
    sampleOrNativeOrder: DexSample | NativeOrderWithFillableAmounts,
    outputAmountPerEth: BigNumber,
    inputAmountPerEth: BigNumber,
    fees: FeeSchedule,
): BigNumber {
    if (isDexSample(sampleOrNativeOrder)) {
        const { input, output, source, fillData } = sampleOrNativeOrder;
        const fee = fees[source]?.(fillData).fee || ZERO_AMOUNT;
        const outputFee = ethToOutputAmount({
            input,
            output,
            inputAmountPerEth,
            outputAmountPerEth,
            ethAmount: fee,
        });
        return outputFee;
    } else {
        const { input, output } = nativeOrderToNormalizedAmounts(side, sampleOrNativeOrder);
        const fee = fees[ERC20BridgeSource.Native]?.(sampleOrNativeOrder).fee || ZERO_AMOUNT;
        const outputFee = ethToOutputAmount({
            input,
            output,
            inputAmountPerEth,
            outputAmountPerEth,
            ethAmount: fee,
        });
        return outputFee;
    }
}

function findRoutesAndCreateOptimalPath(
    side: MarketOperation,
    samples: DexSample[][],
    nativeOrders: NativeOrderWithFillableAmounts[],
    input: BigNumber,
    opts: PathPenaltyOpts,
    fees: FeeSchedule,
    neonRouterNumSamples: number,
    vipSourcesSet: Set<ERC20BridgeSource>,
    fillAdjustor: FillAdjustor,
): { allSourcesPath: Path | undefined; vipSourcesPath: Path | undefined } | undefined {
    // Currently the rust router is unable to handle 1 base unit sized quotes and will error out
    // To avoid flooding the logs with these errors we just return an insufficient liquidity error
    // which is how the JS router handles these quotes today
    if (input.isLessThanOrEqualTo(ONE_BASE_UNIT)) {
        return undefined;
    }

    // Create a `Fill` from a dex sample and adjust it with any passed in
    // adjustor
    const createFillFromDexSample = (sample: DexSample): Fill => {
        const fill = dexSampleToFill(side, sample, opts.outputAmountPerEth, opts.inputAmountPerEth, fees);
        const adjustedFills = fillAdjustor.adjustFills(side, [fill], input);
        return adjustedFills[0];
    };

    const createPathFromStrategy = (optimalRouteInputs: Float64Array, optimalRouteOutputs: Float64Array) => {
        /**
         * inputs are the amounts to fill at each source index
         * e.g fill 2076 at index 4
         *  [ 0, 0, 0, 0, 2076, 464, 230,
         *    230, 0, 0, 0 ]
         *  the sum represents the total input amount
         *
         *  outputs are the amounts we expect out at each source index
         *  [ 0, 0, 0, 0, 42216, 9359, 4677,
         *    4674, 0, 0, 0 ]
         *  the sum represents the total expected output amount
         */

        const routesAndSamplesAndOutputs = _.zip(
            optimalRouteInputs,
            optimalRouteOutputs,
            samplesAndNativeOrdersWithResults,
            sampleSourcePathIds,
        );
        const adjustedFills: Fill[] = [];
        const totalRoutedAmount = BigNumber.sum(...optimalRouteInputs);

        // Due to precision errors we can end up with a totalRoutedAmount that is not exactly equal to the input
        const precisionErrorScalar = input.dividedBy(totalRoutedAmount);

        for (const [
            routeInput,
            outputAmount,
            routeSamplesAndNativeOrders,
            sourcePathId,
        ] of routesAndSamplesAndOutputs) {
            if (!Number.isFinite(outputAmount)) {
                DEFAULT_WARNING_LOGGER(rustArgs, `neon-router: invalid route outputAmount ${outputAmount}`);
                return undefined;
            }
            if (!routeInput || !routeSamplesAndNativeOrders || !outputAmount) {
                continue;
            }
            // TODO: [TKR-241] amounts are sometimes clipped in the router due to precision loss for number/f64
            // we can work around it by scaling it and rounding up. However now we end up with a total amount of a couple base units too much
            const routeInputCorrected = BigNumber.min(
                precisionErrorScalar.multipliedBy(routeInput).integerValue(BigNumber.ROUND_CEIL),
                input,
            );

            const current = routeSamplesAndNativeOrders[routeSamplesAndNativeOrders.length - 1];
            // If it is a native single order we only have one Input/output
            // we want to convert this to an array of samples
            if (!isDexSample(current)) {
                const nativeFill = nativeOrderToFill(
                    side,
                    current,
                    routeInputCorrected,
                    opts.outputAmountPerEth,
                    opts.inputAmountPerEth,
                    fees,
                    false,
                );
                // Note: If the order has an adjusted rate of less than or equal to 0 it will be undefined
                if (nativeFill) {
                    // NOTE: For Limit/RFQ orders we are done here. No need to scale output
                    adjustedFills.push({ ...nativeFill, sourcePathId: sourcePathId ?? hexUtils.random() });
                }
                continue;
            }

            // NOTE: For DexSamples only
            let fill = createFillFromDexSample(current);
            if (!fill) {
                continue;
            }
            const routeSamples = routeSamplesAndNativeOrders as DexSample<FillData>[];

            // From the output of the router, find the closest Sample in terms of input.
            // The Router may have chosen an amount to fill that we do not have a measured sample of
            // Choosing this accurately is required in some sources where the `FillData` may change depending
            // on the size of the trade. For example, UniswapV3 has variable gas cost
            // which increases with input.
            assert.assert(routeSamples.length >= 1, 'Found no sample to use for source');
            for (let k = routeSamples.length - 1; k >= 0; k--) {
                // If we're at the last remaining sample that's all we have left to use
                if (k === 0) {
                    fill = createFillFromDexSample(routeSamples[0]) ?? fill;
                }
                if (routeInputCorrected.isGreaterThan(routeSamples[k].input)) {
                    const left = routeSamples[k];
                    const right = routeSamples[k + 1];
                    if (left && right) {
                        fill =
                            createFillFromDexSample({
                                ...right, // default to the greater (for gas used)
                                input: routeInputCorrected,
                                output: new BigNumber(outputAmount).integerValue(),
                            }) ?? fill;
                    } else {
                        assert.assert(Boolean(left || right), 'No valid sample to use');
                        fill = createFillFromDexSample(left || right) ?? fill;
                    }
                    break;
                }
            }

            // TODO: remove once we have solved the rounding/precision loss issues in the Rust router
            const maxSampledOutput = BigNumber.max(...routeSamples.map((s) => s.output)).integerValue();
            // Scale output by scale factor but never go above the largest sample in sell quotes (unknown liquidity)  or below 1 base unit (unfillable)
            const scaleOutput = (output: BigNumber) => {
                const capped = BigNumber.min(output.integerValue(), maxSampledOutput);
                return BigNumber.max(capped, 1);
            };

            adjustedFills.push({
                ...fill,
                input: routeInputCorrected,
                output: scaleOutput(fill.output),
                adjustedOutput: scaleOutput(fill.adjustedOutput),
                sourcePathId: sourcePathId ?? hexUtils.random(),
            });
        }

        if (adjustedFills.length === 0) {
            return undefined;
        }

        const pathFromRustInputs = Path.create(side, adjustedFills, input, opts);

        return pathFromRustInputs;
    };

    const samplesAndNativeOrdersWithResults: (DexSample[] | NativeOrderWithFillableAmounts[])[] = [];
    const serializedPaths: SerializedPath[] = [];
    const sampleSourcePathIds: string[] = [];
    for (const singleSourceSamples of samples) {
        if (singleSourceSamples.length === 0) {
            continue;
        }

        const singleSourceSamplesWithOutput = [...singleSourceSamples];
        for (let i = singleSourceSamples.length - 1; i >= 0; i--) {
            const currentOutput = singleSourceSamples[i].output;
            if (currentOutput.isZero() || !currentOutput.isFinite()) {
                // Remove trailing 0/invalid output samples
                singleSourceSamplesWithOutput.pop();
            } else {
                break;
            }
        }

        if (singleSourceSamplesWithOutput.length < MIN_NUM_SAMPLE_INPUTS) {
            continue;
        }

        // TODO: Do we need to handle 0 entries, from eg Kyber?
        const serializedPath = singleSourceSamplesWithOutput.reduce<SerializedPath>(
            (memo, sample, sampleIdx) => {
                // Use the fill from createFillFromDexSample to apply
                // any user supplied adjustments
                const f = createFillFromDexSample(sample);
                memo.ids.push(`${f.source}-${serializedPaths.length}-${sampleIdx}`);
                memo.inputs.push(f.input.integerValue().toNumber());
                memo.outputs.push(f.output.integerValue().toNumber());
                // Calculate the penalty of this sample as the diff between the
                // output and the adjusted output
                const outputFee = f.output.minus(f.adjustedOutput).absoluteValue().integerValue().toNumber();
                memo.outputFees.push(outputFee);

                return memo;
            },
            {
                ids: [],
                inputs: [],
                outputs: [],
                outputFees: [],
                isVip: vipSourcesSet.has(singleSourceSamplesWithOutput[0]?.source),
            },
        );

        samplesAndNativeOrdersWithResults.push(singleSourceSamplesWithOutput);
        serializedPaths.push(serializedPath);

        const sourcePathId = hexUtils.random();
        sampleSourcePathIds.push(sourcePathId);
    }

    const nativeOrdersourcePathId = hexUtils.random();
    for (const [idx, nativeOrder] of nativeOrders.entries()) {
        const { input: normalizedOrderInput, output: normalizedOrderOutput } = nativeOrderToNormalizedAmounts(
            side,
            nativeOrder,
        );
        // NOTE: skip dummy order created in swap_quoter
        // TODO: remove dummy order and this logic once we don't need the JS router
        if (normalizedOrderInput.isLessThanOrEqualTo(0) || normalizedOrderOutput.isLessThanOrEqualTo(0)) {
            continue;
        }
        const fee = calculateOuputFee(side, nativeOrder, opts.outputAmountPerEth, opts.inputAmountPerEth, fees)
            .integerValue()
            .toNumber();

        // HACK: due to an issue with the Rust router interpolation we need to create exactly 13 samples from the native order
        const ids = [];
        const inputs = [];
        const outputs = [];
        const outputFees = [];

        // NOTE: Limit orders can be both larger or smaller than the input amount
        // If the order is larger than the input we can scale the order to the size of
        // the quote input (order pricing is constant) and then create 13 "samples" up to
        // and including the full quote input amount.
        // If the order is smaller we don't need to scale anything, we will just end up
        // with trailing duplicate samples for the order input as we cannot go higher
        const scaleToInput = BigNumber.min(input.dividedBy(normalizedOrderInput), 1);
        for (let i = 1; i <= 13; i++) {
            const fraction = i / 13;
            const currentInput = BigNumber.min(
                normalizedOrderInput.times(scaleToInput).times(fraction),
                normalizedOrderInput,
            );
            const currentOutput = BigNumber.min(
                normalizedOrderOutput.times(scaleToInput).times(fraction),
                normalizedOrderOutput,
            );
            const id = `${ERC20BridgeSource.Native}-${nativeOrder.type}-${serializedPaths.length}-${idx}-${i}`;
            inputs.push(currentInput.integerValue().toNumber());
            outputs.push(currentOutput.integerValue().toNumber());
            outputFees.push(fee);
            ids.push(id);
        }

        // We have a VIP for the Rfq order type, Limit order currently goes through FQT
        const isVip = nativeOrder.type !== FillQuoteTransformerOrderType.Limit;

        const serializedPath: SerializedPath = {
            ids,
            inputs,
            outputs,
            outputFees,
            isVip,
        };

        samplesAndNativeOrdersWithResults.push([nativeOrder]);
        serializedPaths.push(serializedPath);
        sampleSourcePathIds.push(nativeOrdersourcePathId);
    }

    if (serializedPaths.length === 0) {
        return undefined;
    }

    const rustArgs: OptimizerCapture = {
        side,
        targetInput: input.toNumber(),
        pathsIn: serializedPaths,
    };

    const allSourcesRustRoute = new Float64Array(rustArgs.pathsIn.length);
    const allSourcesOutputAmounts = new Float64Array(rustArgs.pathsIn.length);
    const vipSourcesRustRoute = new Float64Array(rustArgs.pathsIn.length);
    const vipSourcesOutputAmounts = new Float64Array(rustArgs.pathsIn.length);

    route(
        rustArgs,
        allSourcesRustRoute,
        allSourcesOutputAmounts,
        vipSourcesRustRoute,
        vipSourcesOutputAmounts,
        neonRouterNumSamples,
    );
    assert.assert(
        rustArgs.pathsIn.length === allSourcesRustRoute.length,
        'different number of sources in the Router output than the input',
    );
    assert.assert(
        rustArgs.pathsIn.length === allSourcesOutputAmounts.length,
        'different number of sources in the Router output amounts results than the input',
    );
    assert.assert(
        rustArgs.pathsIn.length === vipSourcesRustRoute.length,
        'different number of sources in the Router output than the input',
    );
    assert.assert(
        rustArgs.pathsIn.length === vipSourcesOutputAmounts.length,
        'different number of sources in the Router output amounts results than the input',
    );

    const allSourcesPath = createPathFromStrategy(allSourcesRustRoute, allSourcesOutputAmounts);
    const vipSourcesPath = createPathFromStrategy(vipSourcesRustRoute, vipSourcesOutputAmounts);

    return {
        allSourcesPath,
        vipSourcesPath,
    };
}

export function findOptimalPathFromSamples(
    side: MarketOperation,
    samples: DexSample[][],
    nativeOrders: NativeOrderWithFillableAmounts[],
    input: BigNumber,
    opts: PathPenaltyOpts,
    fees: FeeSchedule,
    chainId: ChainId,
    neonRouterNumSamples: number,
    fillAdjustor: FillAdjustor,
): Path | undefined {
    const beforeTimeMs = performance.now();
    const sendMetrics = () => {
        SAMPLER_METRICS.logRouterDetails({
            router: 'neon-router',
            type: 'total',
            timingMs: performance.now() - beforeTimeMs,
        });
    };
    const vipSourcesSet = new Set(VIP_ERC20_BRIDGE_SOURCES_BY_CHAIN_ID[chainId]);
    const paths = findRoutesAndCreateOptimalPath(
        side,
        samples,
        nativeOrders,
        input,
        opts,
        fees,
        neonRouterNumSamples,
        vipSourcesSet,
        fillAdjustor,
    );

    if (!paths) {
        sendMetrics();
        return undefined;
    }

    const { allSourcesPath, vipSourcesPath } = paths;

    if (!allSourcesPath || vipSourcesPath?.isAdjustedBetterThan(allSourcesPath)) {
        sendMetrics();
        return vipSourcesPath;
    }

    sendMetrics();
    return allSourcesPath;
}
