import { assert } from '@0x/assert';
import { ChainId } from '@0x/contract-addresses';
import { OptimizerCapture, route, SerializedPath } from '@0x/neon-router';
import { FillQuoteTransformerOrderType } from '@0x/protocol-utils';
import { BigNumber, hexUtils } from '@0x/utils';
import * as _ from 'lodash';
import { performance } from 'perf_hooks';

import { SAMPLER_METRICS } from '../../../utils/sampler_metrics';
import { DEFAULT_WARNING_LOGGER } from '../../constants';
import {
    MarketOperation,
    NativeOrderWithFillableAmounts,
    ERC20BridgeSource,
    FeeSchedule,
    Fill,
    FillAdjustor,
    FillData,
} from '../../types';

import { VIP_ERC20_BRIDGE_SOURCES_BY_CHAIN_ID, ZERO_AMOUNT } from './constants';
import { dexSampleToFill, ethToOutputAmount, nativeOrderToFill, twoHopSampleToFill } from './fills';
import { Path, PathPenaltyOpts } from './path';
import { DexSample, MultiHopFillData, PathContext } from './types';

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

interface RoutablePath {
    pathId: string;
    samplesOrNativeOrders: DexSample[] | NativeOrderWithFillableAmounts[];
    serializedPath: SerializedPath;
}

export class PathOptimizer {
    private pathContext: PathContext;
    private chainId: ChainId;
    private feeSchedule: FeeSchedule;
    private neonRouterNumSamples: number;
    private fillAdjustor: FillAdjustor;
    private pathPenaltyOpts: PathPenaltyOpts;
    private inputAmount: BigNumber;

    constructor(context: {
        pathContext: PathContext;
        chainId: ChainId;
        feeSchedule: FeeSchedule;
        neonRouterNumSamples: number;
        fillAdjustor: FillAdjustor;
        pathPenaltyOpts: PathPenaltyOpts;
        inputAmount: BigNumber;
    }) {
        this.pathContext = context.pathContext;
        this.chainId = context.chainId;
        this.feeSchedule = context.feeSchedule;
        this.neonRouterNumSamples = context.neonRouterNumSamples;
        this.fillAdjustor = context.fillAdjustor;
        this.pathPenaltyOpts = context.pathPenaltyOpts;
        this.inputAmount = context.inputAmount;
    }

    public findOptimalPathFromSamples(
        samples: DexSample[][],
        twoHopQuotes: DexSample<MultiHopFillData>[][],
        nativeOrders: NativeOrderWithFillableAmounts[],
    ): Path | undefined {
        const beforeTimeMs = performance.now();
        const sendMetrics = () => {
            SAMPLER_METRICS.logRouterDetails({
                router: 'neon-router',
                type: 'total',
                timingMs: performance.now() - beforeTimeMs,
            });
        };
        const paths = this.findRoutesAndCreateOptimalPath(samples, twoHopQuotes, nativeOrders);

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

    private findRoutesAndCreateOptimalPath(
        samples: DexSample[][],
        twoHopSamples: DexSample<MultiHopFillData>[][],
        nativeOrders: NativeOrderWithFillableAmounts[],
    ): { allSourcesPath: Path | undefined; vipSourcesPath: Path | undefined } | undefined {
        // Currently the rust router is unable to handle 1 base unit sized quotes and will error out
        // To avoid flooding the logs with these errors we just return an insufficient liquidity error
        // which is how the JS router handles these quotes today
        const inputAmount = this.inputAmount;
        if (inputAmount.isLessThanOrEqualTo(ONE_BASE_UNIT)) {
            return undefined;
        }

        // Ensure the expected data we require exists. In the case where all hops reverted
        // or there were no sources included that allowed for multi hop,
        // we can end up with an empty, but not undefined, fill data.
        const validTwoHopSamples = twoHopSamples.map((samples) => {
            return samples.filter(
                (sample) =>
                    sample &&
                    sample.fillData &&
                    sample.fillData.firstHopSource &&
                    sample.fillData.secondHopSource &&
                    sample.output.isGreaterThan(ZERO_AMOUNT),
            );
        });

        const singleSourceRoutablePaths = this.singleSourceSamplesToRoutablePaths(samples);
        const twoHopRoutablePaths = this.twoHopSamplesToRoutablePaths(validTwoHopSamples);
        const nativeOrderRoutablePaths = this.nativeOrdersToRoutablePaths(nativeOrders);

        const allRoutablePaths = [...singleSourceRoutablePaths, ...twoHopRoutablePaths, ...nativeOrderRoutablePaths];
        const serializedPaths = allRoutablePaths.map((path) => path.serializedPath);

        if (serializedPaths.length === 0) {
            return undefined;
        }

        const optimizerCapture: OptimizerCapture = {
            side: this.pathContext.side,
            targetInput: inputAmount.toNumber(),
            pathsIn: serializedPaths,
        };
        const { allSourcesRoute, vipSourcesRoute } = routeFromNeonRouter({
            optimizerCapture,
            numSamples: this.neonRouterNumSamples,
        });

        const allSourcesPath = this.createPathFromRoute(allRoutablePaths, allSourcesRoute, optimizerCapture);
        const vipSourcesPath = this.createPathFromRoute(allRoutablePaths, vipSourcesRoute, optimizerCapture);

        return {
            allSourcesPath,
            vipSourcesPath,
        };
    }

    private singleSourceSamplesToRoutablePaths(samples: DexSample[][]): RoutablePath[] {
        const routablePaths: RoutablePath[] = [];
        const vipSourcesSet = VIP_ERC20_BRIDGE_SOURCES_BY_CHAIN_ID[this.chainId];

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
                    const f = this.createFillFromDexSample(sample);
                    memo.ids.push(`${f.source}-${routablePaths.length}-${sampleIdx}`);
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

            const pathId = hexUtils.random();
            routablePaths.push({
                pathId,
                samplesOrNativeOrders: singleSourceSamplesWithOutput,
                serializedPath,
            });
        }

        return routablePaths;
    }

    private twoHopSamplesToRoutablePaths(twoHopSamples: DexSample<MultiHopFillData>[][]): RoutablePath[] {
        return twoHopSamples.map((samples, i) => {
            const fills = samples.map((sample) => this.createFillFromTwoHopSample(sample));
            const outputFees = fills.map((fill) =>
                fill.output.minus(fill.adjustedOutput).absoluteValue().integerValue().toNumber(),
            );

            const serializedPath: SerializedPath = {
                ids: fills.map((fill) => fill.sourcePathId),
                inputs: fills.map((fill) => fill.input.integerValue().toNumber()),
                outputs: fills.map((fill) => fill.output.integerValue().toNumber()),
                outputFees,
                isVip: false,
            };
            return {
                pathId: `two-hop-${i}`,
                samplesOrNativeOrders: samples,
                serializedPath,
            };
        });
    }

    private nativeOrdersToRoutablePaths(nativeOrders: NativeOrderWithFillableAmounts[]): RoutablePath[] {
        const routablePaths: RoutablePath[] = [];
        const nativeOrderSourcePathId = hexUtils.random();

        for (const [idx, nativeOrder] of nativeOrders.entries()) {
            const { input: normalizedOrderInput, output: normalizedOrderOutput } = nativeOrderToNormalizedAmounts(
                this.pathContext.side,
                nativeOrder,
            );
            // NOTE: skip dummy order created in swap_quoter
            // TODO: remove dummy order and this logic once we don't need the JS router
            if (normalizedOrderInput.isLessThanOrEqualTo(0) || normalizedOrderOutput.isLessThanOrEqualTo(0)) {
                continue;
            }
            const fee = this.calculateOutputFee(nativeOrder).integerValue().toNumber();

            // HACK: due to an issue with the Rust router interpolation we need to create exactly 40 samples from the native order
            const ids = [];
            const inputs = [];
            const outputs = [];
            const outputFees = [];

            // NOTE: Limit orders can be both larger or smaller than the input amount
            // If the order is larger than the input we can scale the order to the size of
            // the quote input (order pricing is constant) and then create 40 "samples" up to
            // and including the full quote input amount.
            // If the order is smaller we don't need to scale anything, we will just end up
            // with trailing duplicate samples for the order input as we cannot go higher
            const scaleToInput = BigNumber.min(this.inputAmount.dividedBy(normalizedOrderInput), 1);

            for (let i = 1; i < this.neonRouterNumSamples; i++) {
                const fraction = i / (this.neonRouterNumSamples - 1);
                const currentInput = BigNumber.min(
                    normalizedOrderInput.times(scaleToInput).times(fraction),
                    normalizedOrderInput,
                );
                const currentOutput = BigNumber.min(
                    normalizedOrderOutput.times(scaleToInput).times(fraction),
                    normalizedOrderOutput,
                );
                const id = `${ERC20BridgeSource.Native}-${nativeOrder.type}-${routablePaths.length}-${idx}-${i}`;
                inputs.push(currentInput.integerValue().toNumber());
                outputs.push(currentOutput.integerValue().toNumber());
                outputFees.push(fee);
                ids.push(id);
            }

            // We have a VIP for the Rfq and Otc order types, Limit order currently goes through FQT
            const isVip = nativeOrder.type !== FillQuoteTransformerOrderType.Limit;

            const serializedPath: SerializedPath = {
                ids,
                inputs,
                outputs,
                outputFees,
                isVip,
            };

            routablePaths.push({
                pathId: nativeOrderSourcePathId,
                samplesOrNativeOrders: [nativeOrder],
                serializedPath: serializedPath,
            });
        }

        return routablePaths;
    }

    private calculateOutputFee(sampleOrNativeOrder: DexSample | NativeOrderWithFillableAmounts): BigNumber {
        const { inputAmountPerEth, outputAmountPerEth } = this.pathPenaltyOpts;
        if (isDexSample(sampleOrNativeOrder)) {
            const { input, output, source, fillData } = sampleOrNativeOrder;
            const fee = this.feeSchedule[source]?.(fillData).fee || ZERO_AMOUNT;
            const outputFee = ethToOutputAmount({
                input,
                output,
                inputAmountPerEth,
                outputAmountPerEth,
                ethAmount: fee,
            });
            return outputFee;
        } else {
            const { input, output } = nativeOrderToNormalizedAmounts(this.pathContext.side, sampleOrNativeOrder);
            const fee = this.feeSchedule[ERC20BridgeSource.Native]?.(sampleOrNativeOrder).fee || ZERO_AMOUNT;
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

    // Create a `Fill` from a dex sample and adjust it with any passed in
    // adjustor
    private createFillFromDexSample(sample: DexSample): Fill {
        const fill = dexSampleToFill(
            this.pathContext.side,
            sample,
            this.pathPenaltyOpts.outputAmountPerEth,
            this.pathPenaltyOpts.inputAmountPerEth,
            this.feeSchedule,
        );
        const adjustedFills = this.fillAdjustor.adjustFills(this.pathContext.side, [fill]);
        return adjustedFills[0];
    }

    private createFillFromTwoHopSample(sample: DexSample<MultiHopFillData>): Fill {
        const { fillData } = sample;
        const side = this.pathContext.side;

        const multihopFeeEstimate = this.feeSchedule[ERC20BridgeSource.MultiHop];
        const fill = twoHopSampleToFill(side, sample, this.pathPenaltyOpts.outputAmountPerEth, multihopFeeEstimate);
        const fillAdjustor = this.fillAdjustor;

        // Adjust the individual Fill
        // HACK: Chose the worst of slippage between the two sources in multihop
        const adjustedFillFirstHop = fillAdjustor.adjustFills(side, [
            { ...fill, source: fillData.firstHopSource.source },
        ])[0];
        const adjustedFillSecondHop = fillAdjustor.adjustFills(side, [
            { ...fill, source: fillData.secondHopSource.source },
        ])[0];

        // In Sells, output smaller is worse (you're getting less out)
        if (side === MarketOperation.Sell) {
            if (adjustedFillFirstHop.adjustedOutput.lt(adjustedFillSecondHop.adjustedOutput)) {
                return adjustedFillFirstHop;
            }
            return adjustedFillSecondHop;
        }

        // In Buys, output larger is worse (it's costing you more)
        if (adjustedFillFirstHop.adjustedOutput.lt(adjustedFillSecondHop.adjustedOutput)) {
            return adjustedFillSecondHop;
        }
        return adjustedFillFirstHop;
    }

    // TODO: `optimizerCapture` is only used for logging -- consider removing it.
    private createPathFromRoute(routablePaths: RoutablePath[], route: Route, optimizerCapture: OptimizerCapture) {
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

        const routesAndPath = _.zip(route.inputAmounts, route.outputAmounts, routablePaths);
        const adjustedFills: Fill[] = [];
        const totalRoutedAmount = BigNumber.sum(...route.inputAmounts);
        const inputAmount = this.inputAmount;

        // Due to precision errors we can end up with a totalRoutedAmount that is not exactly equal to the input
        const precisionErrorScalar = inputAmount.dividedBy(totalRoutedAmount);

        for (const [routeInputAmount, outputAmount, routablePath] of routesAndPath) {
            if (!Number.isFinite(outputAmount)) {
                DEFAULT_WARNING_LOGGER(optimizerCapture, `neon-router: invalid route outputAmount ${outputAmount}`);
                return undefined;
            }
            if (!routeInputAmount || !routablePath || !outputAmount) {
                continue;
            }
            const { samplesOrNativeOrders, pathId } = routablePath;

            // TODO: [TKR-241] amounts are sometimes clipped in the router due to precision loss for number/f64
            // we can work around it by scaling it and rounding up. However now we end up with a total amount of a couple base units too much
            const routeInputCorrected = BigNumber.min(
                precisionErrorScalar.multipliedBy(routeInputAmount).integerValue(BigNumber.ROUND_CEIL),
                inputAmount,
            );

            const current = samplesOrNativeOrders[samplesOrNativeOrders.length - 1];
            // If it is a native single order we only have one Input/output
            // we want to convert this to an array of samples
            if (!isDexSample(current)) {
                const nativeFill = nativeOrderToFill(
                    this.pathContext.side,
                    current,
                    routeInputCorrected,
                    this.pathPenaltyOpts.outputAmountPerEth,
                    this.pathPenaltyOpts.inputAmountPerEth,
                    this.feeSchedule,
                    false,
                );
                // Note: If the order has an adjusted rate of less than or equal to 0 it will be undefined
                if (nativeFill) {
                    // NOTE: For Limit/RFQ orders we are done here. No need to scale output
                    adjustedFills.push({ ...nativeFill, sourcePathId: pathId ?? hexUtils.random() });
                }
                continue;
            }

            // NOTE: For DexSamples only
            let fill = this.createFillFromDexSample(current);
            if (!fill) {
                continue;
            }
            const routeSamples = samplesOrNativeOrders as DexSample<FillData>[];

            // From the output of the router, find the closest Sample in terms of input.
            // The Router may have chosen an amount to fill that we do not have a measured sample of
            // Choosing this accurately is required in some sources where the `FillData` may change depending
            // on the size of the trade. For example, UniswapV3 has variable gas cost
            // which increases with input.
            assert.assert(routeSamples.length >= 1, 'Found no sample to use for source');
            for (let k = routeSamples.length - 1; k >= 0; k--) {
                // If we're at the last remaining sample that's all we have left to use
                if (k === 0) {
                    fill = this.createFillFromDexSample(routeSamples[0]) ?? fill;
                }
                if (routeInputCorrected.isGreaterThan(routeSamples[k].input)) {
                    const left = routeSamples[k];
                    const right = routeSamples[k + 1];
                    if (left && right) {
                        fill =
                            this.createFillFromDexSample({
                                ...right, // default to the greater (for gas used)
                                input: routeInputCorrected,
                                output: new BigNumber(outputAmount).integerValue(),
                            }) ?? fill;
                    } else {
                        assert.assert(Boolean(left || right), 'No valid sample to use');
                        fill = this.createFillFromDexSample(left || right) ?? fill;
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
                sourcePathId: pathId ?? hexUtils.random(),
            });
        }

        if (adjustedFills.length === 0) {
            return undefined;
        }

        return Path.create(this.pathContext, adjustedFills, inputAmount, this.pathPenaltyOpts);
    }
}

interface NeonRouterParams {
    optimizerCapture: OptimizerCapture;
    numSamples: number;
}

interface NeonRouterOutput {
    allSourcesRoute: Route;
    vipSourcesRoute: Route;
}

interface Route {
    inputAmounts: Float64Array;
    outputAmounts: Float64Array;
}

function routeFromNeonRouter(params: NeonRouterParams): NeonRouterOutput {
    const { optimizerCapture, numSamples } = params;
    const numPathsIn = optimizerCapture.pathsIn.length;

    // Output holders:
    const allSourcesInputAmounts = new Float64Array(numPathsIn);
    const allSourcesOutputAmounts = new Float64Array(numPathsIn);
    const vipSourcesInputAmounts = new Float64Array(numPathsIn);
    const vipSourcesOutputAmounts = new Float64Array(numPathsIn);

    route(
        optimizerCapture,
        allSourcesInputAmounts,
        allSourcesOutputAmounts,
        vipSourcesInputAmounts,
        vipSourcesOutputAmounts,
        numSamples,
    );

    assert.assert(
        numPathsIn === allSourcesInputAmounts.length,
        'different number of sources in the Router output than the input',
    );
    assert.assert(
        numPathsIn === allSourcesOutputAmounts.length,
        'different number of sources in the Router output amounts results than the input',
    );
    assert.assert(
        numPathsIn === vipSourcesInputAmounts.length,
        'different number of sources in the Router output than the input',
    );
    assert.assert(
        numPathsIn === vipSourcesOutputAmounts.length,
        'different number of sources in the Router output amounts results than the input',
    );

    return {
        allSourcesRoute: {
            inputAmounts: allSourcesInputAmounts,
            outputAmounts: allSourcesOutputAmounts,
        },
        vipSourcesRoute: {
            inputAmounts: vipSourcesInputAmounts,
            outputAmounts: vipSourcesOutputAmounts,
        },
    };
}
