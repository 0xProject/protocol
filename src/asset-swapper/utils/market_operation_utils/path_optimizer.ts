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

export class PathOptimizer {
    private side: MarketOperation;
    private chainId: ChainId;
    private feeSchedule: FeeSchedule;
    private neonRouterNumSamples: number;
    private fillAdjustor: FillAdjustor;
    private pathPenaltyOpts: PathPenaltyOpts;
    private inputAmount: BigNumber;

    constructor(context: {
        side: MarketOperation;
        chainId: ChainId;
        feeSchedule: FeeSchedule;
        neonRouterNumSamples: number;
        fillAdjustor: FillAdjustor;
        pathPenaltyOpts: PathPenaltyOpts;
        inputAmount: BigNumber;
    }) {
        this.side = context.side;
        this.chainId = context.chainId;
        this.feeSchedule = context.feeSchedule;
        this.neonRouterNumSamples = context.neonRouterNumSamples;
        this.fillAdjustor = context.fillAdjustor;
        this.pathPenaltyOpts = context.pathPenaltyOpts;
        this.inputAmount = context.inputAmount;
    }

    public findOptimalPathFromSamples(
        samples: DexSample[][],
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
        const paths = this.findRoutesAndCreateOptimalPath(samples, nativeOrders);

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
        nativeOrders: NativeOrderWithFillableAmounts[],
    ): { allSourcesPath: Path | undefined; vipSourcesPath: Path | undefined } | undefined {
        // Currently the rust router is unable to handle 1 base unit sized quotes and will error out
        // To avoid flooding the logs with these errors we just return an insufficient liquidity error
        // which is how the JS router handles these quotes today
        const inputAmount = this.inputAmount;
        if (inputAmount.isLessThanOrEqualTo(ONE_BASE_UNIT)) {
            return undefined;
        }

        const samplesAndNativeOrdersWithResults: (DexSample[] | NativeOrderWithFillableAmounts[])[] = [];
        const serializedPaths: SerializedPath[] = [];
        const sampleSourcePathIds: string[] = [];

        const vipSourcesSet = VIP_ERC20_BRIDGE_SOURCES_BY_CHAIN_ID[this.chainId];
        //  TODO: factor out single source logic.
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
                    const f = this.createFillFromDexSample(sample, inputAmount);
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

        //  TODO: factor out native order logic.
        const nativeOrderSourcePathId = hexUtils.random();
        for (const [idx, nativeOrder] of nativeOrders.entries()) {
            const { input: normalizedOrderInput, output: normalizedOrderOutput } = nativeOrderToNormalizedAmounts(
                this.side,
                nativeOrder,
            );
            // NOTE: skip dummy order created in swap_quoter
            // TODO: remove dummy order and this logic once we don't need the JS router
            if (normalizedOrderInput.isLessThanOrEqualTo(0) || normalizedOrderOutput.isLessThanOrEqualTo(0)) {
                continue;
            }
            const fee = this.calculateOutputFee(nativeOrder).integerValue().toNumber();

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
            const scaleToInput = BigNumber.min(inputAmount.dividedBy(normalizedOrderInput), 1);
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

            // We have a VIP for the Rfq and Otc order types, Limit order currently goes through FQT
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
            sampleSourcePathIds.push(nativeOrderSourcePathId);
        }

        if (serializedPaths.length === 0) {
            return undefined;
        }

        const optimizerCapture: OptimizerCapture = {
            side: this.side,
            targetInput: inputAmount.toNumber(),
            pathsIn: serializedPaths,
        };
        const { allSourcesRoute, vipSourcesRoute } = routeFromNeonRouter({
            optimizerCapture,
            numSamples: this.neonRouterNumSamples,
        });

        const allSourcesPath = this.createPathFromRoute(
            samplesAndNativeOrdersWithResults,
            sampleSourcePathIds,
            allSourcesRoute,
            optimizerCapture,
        );
        const vipSourcesPath = this.createPathFromRoute(
            samplesAndNativeOrdersWithResults,
            sampleSourcePathIds,
            vipSourcesRoute,
            optimizerCapture,
        );

        return {
            allSourcesPath,
            vipSourcesPath,
        };
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
            const { input, output } = nativeOrderToNormalizedAmounts(this.side, sampleOrNativeOrder);
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
    private createFillFromDexSample(sample: DexSample, inputAmount: BigNumber): Fill {
        const fill = dexSampleToFill(
            this.side,
            sample,
            this.pathPenaltyOpts.outputAmountPerEth,
            this.pathPenaltyOpts.inputAmountPerEth,
            this.feeSchedule,
        );
        const adjustedFills = this.fillAdjustor.adjustFills(this.side, [fill], inputAmount);
        return adjustedFills[0];
    }

    // TODO: `optimizerCapture` is only used for logging -- consider removing it.
    private createPathFromRoute(
        samplesAndNativeOrdersWithResults: (DexSample[] | NativeOrderWithFillableAmounts[])[],
        sampleSourcePathIds: string[],
        route: Route,
        optimizerCapture: OptimizerCapture,
    ) {
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
            route.inputAmounts,
            route.outputAmounts,
            samplesAndNativeOrdersWithResults,
            sampleSourcePathIds,
        );
        const adjustedFills: Fill[] = [];
        const totalRoutedAmount = BigNumber.sum(...route.inputAmounts);
        const inputAmount = this.inputAmount;

        // Due to precision errors we can end up with a totalRoutedAmount that is not exactly equal to the input
        const precisionErrorScalar = inputAmount.dividedBy(totalRoutedAmount);

        for (const [
            routeInputAmount,
            outputAmount,
            routeSamplesAndNativeOrders,
            sourcePathId,
        ] of routesAndSamplesAndOutputs) {
            if (!Number.isFinite(outputAmount)) {
                DEFAULT_WARNING_LOGGER(optimizerCapture, `neon-router: invalid route outputAmount ${outputAmount}`);
                return undefined;
            }
            if (!routeInputAmount || !routeSamplesAndNativeOrders || !outputAmount) {
                continue;
            }
            // TODO: [TKR-241] amounts are sometimes clipped in the router due to precision loss for number/f64
            // we can work around it by scaling it and rounding up. However now we end up with a total amount of a couple base units too much
            const routeInputCorrected = BigNumber.min(
                precisionErrorScalar.multipliedBy(routeInputAmount).integerValue(BigNumber.ROUND_CEIL),
                inputAmount,
            );

            const current = routeSamplesAndNativeOrders[routeSamplesAndNativeOrders.length - 1];
            // If it is a native single order we only have one Input/output
            // we want to convert this to an array of samples
            if (!isDexSample(current)) {
                const nativeFill = nativeOrderToFill(
                    this.side,
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
                    adjustedFills.push({ ...nativeFill, sourcePathId: sourcePathId ?? hexUtils.random() });
                }
                continue;
            }

            // NOTE: For DexSamples only
            let fill = this.createFillFromDexSample(current, inputAmount);
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
                    fill = this.createFillFromDexSample(routeSamples[0], inputAmount) ?? fill;
                }
                if (routeInputCorrected.isGreaterThan(routeSamples[k].input)) {
                    const left = routeSamples[k];
                    const right = routeSamples[k + 1];
                    if (left && right) {
                        fill =
                            this.createFillFromDexSample(
                                {
                                    ...right, // default to the greater (for gas used)
                                    input: routeInputCorrected,
                                    output: new BigNumber(outputAmount).integerValue(),
                                },
                                inputAmount,
                            ) ?? fill;
                    } else {
                        assert.assert(Boolean(left || right), 'No valid sample to use');
                        fill = this.createFillFromDexSample(left || right, inputAmount) ?? fill;
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

        const pathFromRustInputs = Path.create(this.side, adjustedFills, inputAmount, this.pathPenaltyOpts);

        return pathFromRustInputs;
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
