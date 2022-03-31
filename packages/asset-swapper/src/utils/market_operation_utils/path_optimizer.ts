import { assert } from '@0x/assert';
import { ChainId } from '@0x/contract-addresses';
import { OptimizerCapture, route, SerializedPath } from '@0x/neon-router';
import { BigNumber, hexUtils } from '@0x/utils';
import * as _ from 'lodash';
import { performance } from 'perf_hooks';

import { DEFAULT_WARNING_LOGGER } from '../../constants';
import { MarketOperation, NativeOrderWithFillableAmounts } from '../../types';

import { VIP_ERC20_BRIDGE_SOURCES_BY_CHAIN_ID, ZERO_AMOUNT } from './constants';
import { dexSamplesToFills, ethToOutputAmount, nativeOrdersToFills } from './fills';
import { DEFAULT_PATH_PENALTY_OPTS, Path, PathPenaltyOpts } from './path';
import { DexSample, ERC20BridgeSource, FeeSchedule, Fill, FillData, SamplerMetrics } from './types';

// tslint:disable: prefer-for-of custom-no-magic-numbers completed-docs no-bitwise

const RUN_LIMIT_DECAY_FACTOR = 0.5;
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
        const fee = fees[source]?.(fillData) || 0;
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
        const fee = fees[ERC20BridgeSource.Native]?.(sampleOrNativeOrder) || 0;
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
): { allSourcesPath: Path | undefined; vipSourcesPath: Path | undefined } | undefined {
    // Currently the rust router is unable to handle 1 base unit sized quotes and will error out
    // To avoid flooding the logs with these errors we just return an insufficient liquidity error
    // which is how the JS router handles these quotes today
    if (input.isLessThanOrEqualTo(ONE_BASE_UNIT)) {
        return undefined;
    }

    const createFill = (sample: DexSample): Fill | undefined => {
        const fills = dexSamplesToFills(side, [sample], opts.outputAmountPerEth, opts.inputAmountPerEth, fees);
        // NOTE: If the sample has 0 output dexSamplesToFills will return [] because no fill can be created
        if (fills.length === 0) {
            return undefined;
        }

        return fills[0];
    };

    const createPathFromStrategy = (sourcesRustRoute: Float64Array, sourcesOutputAmounts: Float64Array) => {
        const routesAndSamplesAndOutputs = _.zip(
            sourcesRustRoute,
            samplesAndNativeOrdersWithResults,
            sourcesOutputAmounts,
            sampleSourcePathIds,
        );
        const adjustedFills: Fill[] = [];
        const totalRoutedAmount = BigNumber.sum(...sourcesRustRoute);

        const scale = input.dividedBy(totalRoutedAmount);
        for (const [
            routeInput,
            routeSamplesAndNativeOrders,
            outputAmount,
            sourcePathId,
        ] of routesAndSamplesAndOutputs) {
            if (!Number.isFinite(outputAmount)) {
                DEFAULT_WARNING_LOGGER(rustArgs, `neon-router: invalid route outputAmount ${outputAmount}`);
                return undefined;
            }
            if (!routeInput || !routeSamplesAndNativeOrders || !outputAmount) {
                continue;
            }
            // TODO(kimpers): [TKR-241] amounts are sometimes clipped in the router due to precision loss for number/f64
            // we can work around it by scaling it and rounding up. However now we end up with a total amount of a couple base units too much
            const rustInputAdjusted = BigNumber.min(
                new BigNumber(routeInput).multipliedBy(scale).integerValue(BigNumber.ROUND_CEIL),
                input,
            );

            const current = routeSamplesAndNativeOrders[routeSamplesAndNativeOrders.length - 1];
            if (!isDexSample(current)) {
                const nativeFill = nativeOrdersToFills(
                    side,
                    [current],
                    rustInputAdjusted,
                    opts.outputAmountPerEth,
                    opts.inputAmountPerEth,
                    fees,
                    false,
                )[0] as Fill | undefined;
                // Note: If the order has an adjusted rate of less than or equal to 0 it will be skipped
                // and nativeFill will be `undefined`
                if (nativeFill) {
                    // NOTE: For Limit/RFQ orders we are done here. No need to scale output
                    adjustedFills.push({ ...nativeFill, sourcePathId: sourcePathId ?? hexUtils.random() });
                }
                continue;
            }

            // NOTE: For DexSamples only
            let fill = createFill(current);
            if (!fill) {
                continue;
            }
            const routeSamples = routeSamplesAndNativeOrders as Array<DexSample<FillData>>;
            // Descend to approach a closer fill for fillData which may not be consistent
            // throughout the path (UniswapV3) and for a closer guesstimate at
            // gas used

            assert.assert(routeSamples.length >= 1, 'Found no sample to use for source');
            for (let k = routeSamples.length - 1; k >= 0; k--) {
                if (k === 0) {
                    fill = createFill(routeSamples[0]) ?? fill;
                }
                if (rustInputAdjusted.isGreaterThan(routeSamples[k].input)) {
                    const left = routeSamples[k];
                    const right = routeSamples[k + 1];
                    if (left && right) {
                        fill =
                            createFill({
                                ...right, // default to the greater (for gas used)
                                input: rustInputAdjusted,
                                output: new BigNumber(outputAmount),
                            }) ?? fill;
                    } else {
                        assert.assert(Boolean(left || right), 'No valid sample to use');
                        fill = createFill(left || right) ?? fill;
                    }
                    break;
                }
            }

            // TODO(kimpers): remove once we have solved the rounding/precision loss issues in the Rust router
            const maxSampledOutput = BigNumber.max(...routeSamples.map(s => s.output));
            // Scale output by scale factor but never go above the largest sample in sell quotes (unknown liquidity)  or below 1 base unit (unfillable)
            const scaleOutput = (output: BigNumber) => {
                // Don't try to scale 0 output as it will be clamped to 1
                if (output.eq(ZERO_AMOUNT)) {
                    return output;
                }

                const scaled = output
                    .times(scale)
                    .decimalPlaces(0, side === MarketOperation.Sell ? BigNumber.ROUND_FLOOR : BigNumber.ROUND_CEIL);
                const capped = MarketOperation.Sell ? BigNumber.min(scaled, maxSampledOutput) : scaled;

                return BigNumber.max(capped, 1);
            };

            adjustedFills.push({
                ...fill,
                input: rustInputAdjusted,
                output: scaleOutput(fill.output),
                adjustedOutput: scaleOutput(fill.adjustedOutput),
                index: 0,
                parent: undefined,
                sourcePathId: sourcePathId ?? hexUtils.random(),
            });
        }

        if (adjustedFills.length === 0) {
            return undefined;
        }

        const pathFromRustInputs = Path.create(side, adjustedFills, input, opts);

        return pathFromRustInputs;
    };

    const samplesAndNativeOrdersWithResults: Array<DexSample[] | NativeOrderWithFillableAmounts[]> = [];
    const serializedPaths: SerializedPath[] = [];
    const sampleSourcePathIds: string[] = [];
    for (const singleSourceSamples of samples) {
        if (singleSourceSamples.length === 0) {
            continue;
        }

        const sourcePathId = hexUtils.random();
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

        // TODO(kimpers): Do we need to handle 0 entries, from eg Kyber?
        const serializedPath = singleSourceSamplesWithOutput.reduce<SerializedPath>(
            (memo, sample, sampleIdx) => {
                memo.ids.push(`${sample.source}-${serializedPaths.length}-${sampleIdx}`);
                memo.inputs.push(sample.input.integerValue().toNumber());
                memo.outputs.push(sample.output.integerValue().toNumber());
                memo.outputFees.push(
                    calculateOuputFee(side, sample, opts.outputAmountPerEth, opts.inputAmountPerEth, fees)
                        .integerValue()
                        .toNumber(),
                );

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
            const id = `${ERC20BridgeSource.Native}-${serializedPaths.length}-${idx}-${i}`;
            inputs.push(currentInput.integerValue().toNumber());
            outputs.push(currentOutput.integerValue().toNumber());
            outputFees.push(fee);
            ids.push(id);
        }

        const serializedPath: SerializedPath = {
            ids,
            inputs,
            outputs,
            outputFees,
            isVip: true,
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

export function findOptimalRustPathFromSamples(
    side: MarketOperation,
    samples: DexSample[][],
    nativeOrders: NativeOrderWithFillableAmounts[],
    input: BigNumber,
    opts: PathPenaltyOpts,
    fees: FeeSchedule,
    chainId: ChainId,
    neonRouterNumSamples: number,
    samplerMetrics?: SamplerMetrics,
): Path | undefined {
    const beforeTimeMs = performance.now();
    const sendMetrics = () => {
        // tslint:disable-next-line: no-unused-expression
        samplerMetrics &&
            samplerMetrics.logRouterDetails({
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
    );

    if (!paths) {
        sendMetrics();
        return undefined;
    }

    const { allSourcesPath, vipSourcesPath } = paths;

    if (!allSourcesPath || vipSourcesPath?.isBetterThan(allSourcesPath)) {
        sendMetrics();
        return vipSourcesPath;
    }

    sendMetrics();
    return allSourcesPath;
}

/**
 * Find the optimal mixture of fills that maximizes (for sells) or minimizes
 * (for buys) output, while meeting the input requirement.
 */
export async function findOptimalPathJSAsync(
    side: MarketOperation,
    fills: Fill[][],
    targetInput: BigNumber,
    runLimit: number = 2 ** 8,
    samplerMetrics?: SamplerMetrics,
    opts: PathPenaltyOpts = DEFAULT_PATH_PENALTY_OPTS,
): Promise<Path | undefined> {
    const beforeTimeMs = performance.now();
    // Sort fill arrays by descending adjusted completed rate.
    // Remove any paths which cannot impact the optimal path
    const sortedPaths = reducePaths(fillsToSortedPaths(fills, side, targetInput, opts), side);
    if (sortedPaths.length === 0) {
        return undefined;
    }
    const rates = rateBySourcePathId(sortedPaths);
    let optimalPath = sortedPaths[0];
    for (const [i, path] of sortedPaths.slice(1).entries()) {
        optimalPath = mixPaths(side, optimalPath, path, targetInput, runLimit * RUN_LIMIT_DECAY_FACTOR ** i, rates);
        // Yield to event loop.
        await Promise.resolve();
    }
    const finalPath = optimalPath.isComplete() ? optimalPath : undefined;
    // tslint:disable-next-line: no-unused-expression
    samplerMetrics &&
        samplerMetrics.logRouterDetails({
            router: 'js',
            type: 'total',
            timingMs: performance.now() - beforeTimeMs,
        });
    return finalPath;
}

// Sort fill arrays by descending adjusted completed rate.
export function fillsToSortedPaths(
    fills: Fill[][],
    side: MarketOperation,
    targetInput: BigNumber,
    opts: PathPenaltyOpts,
): Path[] {
    const paths = fills.map(singleSourceFills => Path.create(side, singleSourceFills, targetInput, opts));
    const sortedPaths = paths.sort((a, b) => {
        const aRate = a.adjustedCompleteRate();
        const bRate = b.adjustedCompleteRate();
        // There is a case where the adjusted completed rate isn't sufficient for the desired amount
        // resulting in a NaN div by 0 (output)
        if (bRate.isNaN()) {
            return -1;
        }
        if (aRate.isNaN()) {
            return 1;
        }
        return bRate.comparedTo(aRate);
    });
    return sortedPaths;
}

// Remove paths which have no impact on the optimal path
export function reducePaths(sortedPaths: Path[], side: MarketOperation): Path[] {
    // Any path which has a min rate that is less than the best adjusted completed rate has no chance of improving
    // the overall route.
    const bestNonNativeCompletePath = sortedPaths.filter(
        p => p.isComplete() && p.fills[0].source !== ERC20BridgeSource.Native,
    )[0];

    // If there is no complete path then just go ahead with the sorted paths
    // I.e if the token only exists on sources which cannot sell to infinity
    // or buys where X is greater than all the tokens available in the pools
    if (!bestNonNativeCompletePath) {
        return sortedPaths;
    }
    const bestNonNativeCompletePathAdjustedRate = bestNonNativeCompletePath.adjustedCompleteRate();
    if (!bestNonNativeCompletePathAdjustedRate.isGreaterThan(0)) {
        return sortedPaths;
    }

    const filteredPaths = sortedPaths.filter(p =>
        p.bestRate().isGreaterThanOrEqualTo(bestNonNativeCompletePathAdjustedRate),
    );
    return filteredPaths;
}

function mixPaths(
    side: MarketOperation,
    pathA: Path,
    pathB: Path,
    targetInput: BigNumber,
    maxSteps: number,
    rates: { [id: string]: BigNumber },
): Path {
    const _maxSteps = Math.max(maxSteps, 32);
    let steps = 0;
    // We assume pathA is the better of the two initially.
    let bestPath: Path = pathA;

    const _walk = (path: Path, remainingFills: Fill[]) => {
        steps += 1;
        if (path.isBetterThan(bestPath)) {
            bestPath = path;
        }
        const remainingInput = targetInput.minus(path.size().input);
        if (remainingInput.isGreaterThan(0)) {
            for (let i = 0; i < remainingFills.length && steps < _maxSteps; ++i) {
                const fill = remainingFills[i];
                // Only walk valid paths.
                if (!path.isValidNextFill(fill)) {
                    continue;
                }
                // Remove this fill from the next list of candidate fills.
                const nextRemainingFills = remainingFills.slice();
                nextRemainingFills.splice(i, 1);
                // Recurse.
                _walk(Path.clone(path).append(fill), nextRemainingFills);
            }
        }
    };
    const allFills = [...pathA.fills, ...pathB.fills];
    // Sort subpaths by rate and keep fills contiguous to improve our
    // chances of walking ideal, valid paths first.
    const sortedFills = allFills.sort((a, b) => {
        if (a.sourcePathId !== b.sourcePathId) {
            return rates[b.sourcePathId].comparedTo(rates[a.sourcePathId]);
        }
        return a.index - b.index;
    });
    _walk(Path.create(side, [], targetInput, pathA.pathPenaltyOpts), sortedFills);
    if (!bestPath.isValid()) {
        throw new Error('nooope');
    }
    return bestPath;
}

function rateBySourcePathId(paths: Path[]): { [id: string]: BigNumber } {
    return _.fromPairs(paths.map(p => [p.fills[0].sourcePathId, p.adjustedRate()]));
}
