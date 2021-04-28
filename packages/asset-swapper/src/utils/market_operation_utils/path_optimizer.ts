import { BigNumber } from '@0x/utils';
import * as _ from 'lodash';

import { MarketOperation } from '../../types';

import { DEFAULT_PATH_PENALTY_OPTS, Path, PathPenaltyOpts } from './path';
import { ERC20BridgeSource, Fill } from './types';

// tslint:disable: prefer-for-of custom-no-magic-numbers completed-docs no-bitwise

const RUN_LIMIT_DECAY_FACTOR = 0.5;

/**
 * Find the optimal mixture of fills that maximizes (for sells) or minimizes
 * (for buys) output, while meeting the input requirement.
 */
export async function findOptimalPathAsync(
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
