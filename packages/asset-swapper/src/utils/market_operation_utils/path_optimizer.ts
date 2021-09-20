import { ChainId } from '@0x/contract-addresses';
import { BigNumber } from '@0x/utils';
import * as _ from 'lodash';
import { OptimizerCapture, route, SerializedPath } from 'neon-router';
import { performance } from 'perf_hooks';

import { MarketOperation, NativeOrderWithFillableAmounts } from '../../types';
import { VIP_ERC20_BRIDGE_SOURCES_BY_CHAIN_ID, ZERO_AMOUNT } from '../market_operation_utils/constants';

import { dexSamplesToFills, nativeOrdersToFills } from './fills';
import { DEFAULT_PATH_PENALTY_OPTS, Path, PathPenaltyOpts } from './path';
import { getRate } from './rate_utils';
import { DexSample, ERC20BridgeSource, FeeSchedule, Fill, FillData } from './types';

// tslint:disable: prefer-for-of custom-no-magic-numbers completed-docs no-bitwise

const RUN_LIMIT_DECAY_FACTOR = 0.5;
const RUST_ROUTER_NUM_SAMPLES = 200;
const FILL_QUOTE_TRANSFORMER_GAS_OVERHEAD = new BigNumber(150e3);
// NOTE: The Rust router will panic with less than 3 samples
const MIN_NUM_SAMPLE_INPUTS = 3;

const isDexSample = (obj: DexSample | NativeOrderWithFillableAmounts): obj is DexSample => !!(obj as DexSample).source;

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
        const { source, fillData } = sampleOrNativeOrder;
        const fee = fees[source] === undefined ? 0 : fees[source]!(fillData) || 0;
        const outputFee = !outputAmountPerEth.isZero()
            ? outputAmountPerEth.times(fee)
            : inputAmountPerEth
                  .times(fee)
                  .times(sampleOrNativeOrder.output.dividedToIntegerBy(sampleOrNativeOrder.input));

        return outputFee;
    } else {
        const { input, output } = nativeOrderToNormalizedAmounts(side, sampleOrNativeOrder);
        const fee =
            fees[ERC20BridgeSource.Native] === undefined ? 0 : fees[ERC20BridgeSource.Native]!(sampleOrNativeOrder);
        const outputFee = !outputAmountPerEth.isZero()
            ? outputAmountPerEth.times(fee)
            : inputAmountPerEth.times(fee).times(output.dividedToIntegerBy(input));
        return outputFee;
    }
}

function createPathFromSamples(
    side: MarketOperation,
    samples: DexSample[][],
    nativeOrders: NativeOrderWithFillableAmounts[],
    input: BigNumber,
    opts: PathPenaltyOpts,
    fees: FeeSchedule,
): Path {
    const createFill = (sampleOrOrder: DexSample | NativeOrderWithFillableAmounts) =>
        isDexSample(sampleOrOrder)
            ? dexSamplesToFills(side, [sampleOrOrder], opts.outputAmountPerEth, opts.inputAmountPerEth, fees)[0]
            : nativeOrdersToFills(
                  side,
                  [sampleOrOrder],
                  input,
                  opts.outputAmountPerEth,
                  opts.inputAmountPerEth,
                  fees,
              )[0];
    // Track sample id's to integers (required by rust router)
    const sampleIdLookup: { [key: string]: number } = {};
    let sampleIdCounter = 0;
    const sampleToId = (source: ERC20BridgeSource, index: number): number => {
        const key = `${source}-${index}`;
        if (sampleIdLookup[key]) {
            return sampleIdLookup[key];
        } else {
            sampleIdLookup[key] = ++sampleIdCounter;
            return sampleIdLookup[key];
        }
    };

    const samplesAndNativeOrdersWithResults: Array<DexSample[] | NativeOrderWithFillableAmounts[]> = [];
    const serializedPaths: SerializedPath[] = [];
    for (const singleSourceSamples of samples) {
        const singleSourceSamplesWithOutput = singleSourceSamples.filter(sample =>
            sample.output.isGreaterThan(ZERO_AMOUNT),
        );
        if (singleSourceSamplesWithOutput.length < MIN_NUM_SAMPLE_INPUTS) {
            continue;
        }

        // TODO(kimpers): Do we need to handle 0 entries, from eg Kyber?
        const serializedPath = singleSourceSamplesWithOutput.reduce<SerializedPath>(
            (memo, sample, sampleIdx) => {
                memo.ids.push(sampleToId(sample.source, sampleIdx));
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
            },
        );

        samplesAndNativeOrdersWithResults.push(singleSourceSamplesWithOutput);
        serializedPaths.push(serializedPath);
    }

    for (const [idx, nativeOrder] of nativeOrders.entries()) {
        const { input: normalizedOrderInput, output: normalizedOrderOutput } = nativeOrderToNormalizedAmounts(
            side,
            nativeOrder,
        );
        // NOTE: skip dummy order created in swap_quoter
        // TODO: remove dummy order and this logic once we don't need the JS router
        if (normalizedOrderInput.isLessThanOrEqualTo(0) && normalizedOrderOutput.isLessThanOrEqualTo(0)) {
            continue;
        }

        // TODO(kimpers): Does this need more exact rounding?
        // HACK: the router requires at minimum 3 samples as a basis for interpolation
        const inputs = [
            0,
            normalizedOrderInput
                .dividedBy(2)
                .integerValue()
                .toNumber(),
            normalizedOrderInput.integerValue().toNumber(),
        ];
        const outputs = [
            0,
            normalizedOrderOutput
                .dividedBy(2)
                .integerValue()
                .toNumber(),
            normalizedOrderOutput.integerValue().toNumber(),
        ];

        const serializedPath: SerializedPath = {
            ids: [sampleToId(ERC20BridgeSource.Native, idx)],
            inputs,
            outputs,
            outputFees: [
                calculateOuputFee(side, nativeOrder, opts.outputAmountPerEth, opts.inputAmountPerEth, fees)
                    .integerValue()
                    .toNumber(),
            ],
        };

        samplesAndNativeOrdersWithResults.push([nativeOrder]);
        serializedPaths.push(serializedPath);
    }

    const rustArgs: OptimizerCapture = {
        side,
        targetInput: input.toNumber(),
        pathsIn: serializedPaths,
    };

    const before = performance.now();
    const allSourcesRustRoute: number[] = route(rustArgs, RUST_ROUTER_NUM_SAMPLES);
    console.log('Rust perf (real):', performance.now() - before, 'ms');

    const routesAndSamples = _.zip(allSourcesRustRoute, samplesAndNativeOrdersWithResults);

    const adjustedFills: Fill[] = [];
    const totalInputs = BigNumber.sum(...allSourcesRustRoute);
    for (const [routeInput, routeSamplesAndNativeOrders] of routesAndSamples) {
        if (!routeInput || !routeSamplesAndNativeOrders) {
            continue;
        }

        const current = routeSamplesAndNativeOrders[routeSamplesAndNativeOrders.length - 1];
        let fill = createFill(current);
        if (!isDexSample(current)) {
            // NOTE: Limit/RFQ orders we are done here. No need to scale output
            break;
        }

        const rustInput = new BigNumber(routeInput);
        // NOTE: For DexSamples only
        const routeSamples = routeSamplesAndNativeOrders as Array<DexSample<FillData>>;
        // Descend to approach a closer fill for fillData which may not be consistent
        // throughout the path (UniswapV3) and for a closer guesstimate at
        // gas used
        for (let k = routeSamples.length - 1; k >= 0; k--) {
            if (k === 0) {
                fill = createFill(routeSamples[0]);
            }
            if (rustInput.isGreaterThan(routeSamples[k].input)) {
                // Between here and the previous fill
                // HACK: Use the midpoint between the two
                const left = routeSamples[k];
                const right = routeSamples[k + 1];
                if (left && right) {
                    const leftPrice = left.output.dividedBy(left.input);
                    const rightPrice = right.output.dividedBy(right.input);
                    const scaledPrice = leftPrice
                        .minus(rightPrice)
                        .dividedBy(left.input.minus(right.input))
                        .times(rustInput.minus(right.input))
                        .plus(rightPrice);
                    console.log(
                        `Left price ${leftPrice.toString()}, right: ${rightPrice.toString()}, scaledPrice: ${scaledPrice.toString()}`,
                    );
                    const output = scaledPrice.times(rustInput).decimalPlaces(0);
                    fill = createFill({
                        ...right, // default to the greater (for gas used)
                        input: rustInput,
                        output,
                    });
                } else {
                    fill = createFill(left || right);
                }
                break;
            }
        }

        // TODO: can't scale native orders!?
        //// HACK: Handle the case where the router can under quote the input
        //// Set the first fill just a tad higher
        const adjustedInput =
            totalInputs.lt(input) && adjustedFills.length === 0 ? rustInput.plus(input.minus(totalInputs)) : rustInput;
        const scaleOutput = (output: BigNumber) =>
            output
                .dividedBy(fill.input)
                .times(adjustedInput)
                .decimalPlaces(0, side === MarketOperation.Sell ? BigNumber.ROUND_FLOOR : BigNumber.ROUND_CEIL);
        adjustedFills.push({
            ...fill,
            input: adjustedInput,
            output: scaleOutput(fill.output),
            adjustedOutput: scaleOutput(fill.adjustedOutput),
            index: 0,
            parent: undefined,
        });
    }

    const pathFromRustInputs = Path.create(side, adjustedFills, input);

    return pathFromRustInputs;
}

export function findOptimalRustPathFromSamples(
    side: MarketOperation,
    samples: DexSample[][],
    nativeOrders: NativeOrderWithFillableAmounts[],
    input: BigNumber,
    opts: PathPenaltyOpts,
    fees: FeeSchedule,
    chainId: ChainId,
): Path {
    const before = performance.now();
    const logPerformance = () => console.log('Total routing function performance', performance.now() - before, 'ms');
    const allSourcesPath = createPathFromSamples(side, samples, nativeOrders, input, opts, fees);

    const vipSources = VIP_ERC20_BRIDGE_SOURCES_BY_CHAIN_ID[chainId];

    // HACK(kimpers): The Rust router currently doesn't account for VIP sources correctly
    // we need to try to route them in isolation and compare with the results all sources
    if (vipSources.length > 0) {
        const vipSourcesSet = new Set(vipSources);
        const vipSourcesSamples = samples.filter(s => s[0] && vipSourcesSet.has(s[0].source));
        const vipSourcesPath = createPathFromSamples(side, vipSourcesSamples, [], input, opts, fees);

        const { input: allSourcesInput, output: allSourcesOutput } = allSourcesPath.adjustedSize();
        // NOTE: For sell quotes input is the taker asset and for buy quotes input is the maker asset
        const gasCostInWei = FILL_QUOTE_TRANSFORMER_GAS_OVERHEAD.times(opts.gasPrice);
        const fqtOverheadInOutputToken = gasCostInWei.times(opts.outputAmountPerEth);
        const outputWithFqtOverhead =
            side === MarketOperation.Sell
                ? allSourcesOutput.minus(fqtOverheadInOutputToken)
                : allSourcesOutput.plus(fqtOverheadInOutputToken);
        const allSourcesAdjustedRateWithFqtOverhead = getRate(side, allSourcesInput, outputWithFqtOverhead);
        console.log(
            `FQT OVERHEAD percentage ${allSourcesOutput
                .minus(outputWithFqtOverhead)
                .div(allSourcesOutput)
                .toString()}`,
        );

        if (vipSourcesPath.adjustedRate().isGreaterThan(allSourcesAdjustedRateWithFqtOverhead)) {
            console.log('-------------VIP SOURCES WON!!------');
            logPerformance();
            return vipSourcesPath;
        }
    }

    logPerformance();
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
    opts: PathPenaltyOpts = DEFAULT_PATH_PENALTY_OPTS,
): Promise<Path | undefined> {
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
    return optimalPath.isComplete() ? optimalPath : undefined;
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
