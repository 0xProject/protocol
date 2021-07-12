import { BigNumber } from '@0x/utils';
import * as _ from 'lodash';
import { OptimizerCapture, route, SerializedPath } from 'neon-router';
import { performance } from 'perf_hooks';

import { MarketOperation } from '../../types';

import { DEFAULT_PATH_PENALTY_OPTS, Path, PathPenaltyOpts } from './path';
import { ERC20BridgeSource, Fill } from './types';

// tslint:disable: prefer-for-of custom-no-magic-numbers completed-docs no-bitwise

const RUN_LIMIT_DECAY_FACTOR = 0.5;
const RUST_ROUTER_NUM_SAMPLES = 200;
const SHOULD_USE_RUST_ROUTER = process.env.RUST_ROUTER === 'true';

type FillWithOutputFee = Fill & { outputFee: BigNumber };

function findOptimalRustPath(input: BigNumber, allFills: Fill[][]): Path {
    // Track sample id's to integers (required by rust router)
    const sampleIdLookup: { [key: string]: number } = {};
    let sampleIdCounter = 0;
    const fillToSampleId = (s: { source: string; sourcePathId: string; index: number }): number => {
        const key = `${s.source}-${s.sourcePathId}-${s.index}`;
        if (sampleIdLookup[key]) {
            return sampleIdLookup[key];
        } else {
            sampleIdLookup[key] = ++sampleIdCounter;
            return sampleIdLookup[key];
        }
    };

    const adjustedParsedFills = allFills.map(fills => {
        const adjustedFills: FillWithOutputFee[] = [];
        // NOTE: Output fee is negative for sells and positive for buys
        const outputFee = fills[0].adjustedOutput.minus(fills[0].output);
        // Samples are turned into Fills
        // Fills are dependent on their parent and have their parents information "subtracted" from them
        // e.g a samples for [1,10,100] => [5,50,500] look like [1, 9, 91] => [5, 40, 400]
        for (let i = 0; i < fills.length; i++) {
            const parsedFill: FillWithOutputFee = { ...fills[i], outputFee };
            if (parsedFill.index !== 0) {
                const parent = adjustedFills[i - 1];
                parsedFill.parent = parent;
                parsedFill.input = parsedFill.input.plus(parent.input);
                parsedFill.output = parsedFill.output.plus(parent.output);
                parsedFill.adjustedOutput = parsedFill.output.plus(outputFee);
            }
            adjustedFills.push(parsedFill);
        }
        return adjustedFills;
    });

    const pathsIn: SerializedPath[] = adjustedParsedFills.map(fills => ({
        ids: fills.map(f => fillToSampleId(f)),
        inputs: fills.map(f => f.input.integerValue().toNumber()),
        outputs: fills.map(f => f.output.integerValue().toNumber()),
        outputFees: fills.map(f => f.outputFee.integerValue().toNumber()),
    }));

    // TODO(kimpers): replace all numbers with BigNumber or BigInt?
    const rustArgs: OptimizerCapture = {
        side: 'Sell',
        // HACK: There can be off by 1 errors, somewhere...
        targetInput: input.plus(1).toNumber(),
        pathsIn,
    };

    const before = performance.now();
    const rustRoute: number[] = route(rustArgs, RUST_ROUTER_NUM_SAMPLES);
    console.log('Rust perf (real):', performance.now() - before);

    const fillsByPathId = _.groupBy(_.flatten(adjustedParsedFills), o => o.sourcePathId);

    // TODO: is this safe with regard to ordering??
    const sourcePathKeys = Object.keys(fillsByPathId);
    const fakeFills: Fill[] = [];
    const totalInputs = BigNumber.sum(...rustRoute);
    for (let i = 0; i < rustRoute.length; i++) {
        if (rustRoute[i] === 0) {
            continue;
        }
        const rustInput = new BigNumber(rustRoute[i]);
        // HACK: Handle the case where the router can under quote the input
        // Set the first fill just a tad higher
        const adjInput =
            totalInputs.lt(input) && fakeFills.length === 0 ? rustInput.plus(input.minus(totalInputs)) : rustInput;
        // Rust router has chosen this source;
        const sourcePathKey = sourcePathKeys[i];
        const fills = fillsByPathId[sourcePathKey];
        let fill = fills[fills.length - 1];
        // Descend to approach a closer fill for fillData which may not be consistent
        // throughout the path (UniswapV3) and for a closer guesstimate at
        // gas used
        for (let k = fills.length - 1; k >= 0; k--) {
            if (k === 0) {
                fill = fills[0];
            }
            if (rustInput.isGreaterThan(fills[k].input)) {
                // Between here and the previous fill
                // HACK: Use the midpoint between the two
                const left = fills[k];
                const right = fills[k + 1];
                if (left && right) {
                    const midPrice = left.output
                        .dividedBy(left.input)
                        .plus(right.output.dividedBy(right.input))
                        .dividedBy(2);
                    fill = {
                        ...right, // default to the greater (for gas used)
                        input: rustInput,
                        output: midPrice.times(rustInput).decimalPlaces(0),
                    };
                } else {
                    fill = left || right;
                }
                break;
            }
        }
        const adjustedOutput = fill.output
            .dividedBy(fill.input)
            .times(adjInput)
            .decimalPlaces(0);
        fakeFills.push({
            ...fill,
            input: adjInput,
            output: adjustedOutput,
            index: 0,
            parent: undefined,
        });
    }

    const fakePath = Path.create(MarketOperation.Sell, fakeFills, input);

    return fakePath;
}

/**
 * Find the optimal mixture of fills that maximizes (for sells) or minimizes
 * (for buys) output, while meeting the input requirement.
 */
async function findOptimalPathJSAsync(
    side: MarketOperation,
    fills: Fill[][],
    targetInput: BigNumber,
    runLimit: number,
    opts: PathPenaltyOpts,
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

/**
 * Finds the optimal path using either the Rust or JS based routers
 *
 */
export async function findOptimalPathAsync(
    side: MarketOperation,
    fills: Fill[][],
    targetInput: BigNumber,
    runLimit: number = 2 ** 8,
    opts: PathPenaltyOpts = DEFAULT_PATH_PENALTY_OPTS,
): Promise<Path | undefined> {
    // NOTE: only sells are currently supported by the rust router
    if (SHOULD_USE_RUST_ROUTER && side === MarketOperation.Sell) {
        console.log('-----USING RUST ROUTER!-------');
        return findOptimalRustPath(targetInput, fills);
    }

    console.log('-----USING JS ROUTER!-------');
    return findOptimalPathJSAsync(side, fills, targetInput, runLimit, opts);
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
