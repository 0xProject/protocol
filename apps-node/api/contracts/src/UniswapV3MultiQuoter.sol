// SPDX-License-Identifier: Apache-2.0
/*
  Copyright 2021 ZeroEx Intl.
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

pragma solidity ^0.7;
pragma experimental ABIEncoderV2;

import "@uniswap/v3-core/contracts/libraries/TickMath.sol";
import "@uniswap/v3-core/contracts/libraries/SwapMath.sol";
import "@uniswap/v3-periphery/contracts/libraries/Path.sol";
import "@uniswap/v3-core/contracts/libraries/LiquidityMath.sol";
import "@uniswap/v3-core/contracts/libraries/BitMath.sol";
import "@uniswap/v3-core/contracts/libraries/SafeCast.sol";
import "@uniswap/v3-core/contracts/libraries/LowGasSafeMath.sol";

import "./interfaces/IUniswapV3.sol";
import "./MultiQuoter.sol";

contract UniswapV3MultiQuoter is MultiQuoter {
    using Path for bytes;
    using SafeCast for uint256;
    using LowGasSafeMath for int256;

    // the top level state of the multiswap, the results are transient.
    struct SwapState {
        // the amount remaining to be swapped in/out of the input/output asset
        int256 amountSpecifiedRemaining;
        // the amount already swapped out/in of the output/input asset
        int256 amountCalculated;
        // current sqrt(price)
        uint160 sqrtPriceX96;
        // the tick associated with the current price
        int24 tick;
        // the current liquidity in range
        uint128 liquidity;
        // the current quote amount we are querying liquidity for
        uint256 amountsIndex;
        // the current aggregate gas estimate for multi swap
        uint256 gasAggregate;
    }

    // the intermediate calculations for each tick and quote amount
    struct StepComputations {
        // the price at the beginning of the step
        uint160 sqrtPriceStartX96;
        // the next tick to swap to from the current tick in the swap direction
        int24 tickNext;
        // whether tickNext is initialized or not
        bool initialized;
        // sqrt(price) for the next tick (1/0)
        uint160 sqrtPriceNextX96;
        // how much is being swapped in in this step
        uint256 amountIn;
        // how much is being swapped out
        uint256 amountOut;
        // how much fee is being paid in
        uint256 feeAmount;
        // how much gas was left before the current step
        uint256 gasBefore;
    }

    /// @inheritdoc MultiQuoter
    function getFirstSwapDetails(
        address factory,
        bytes memory path,
        bool isExactInput
    ) internal view override returns (address pool, bool zeroForOne) {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        if (isExactInput) {
            (tokenIn, tokenOut, fee) = path.decodeFirstPool();
        } else {
            (tokenOut, tokenIn, fee) = path.decodeFirstPool();
        }

        zeroForOne = tokenIn < tokenOut;
        pool = IUniswapV3Factory(factory).getPool(tokenIn, tokenOut, fee);
    }

    /// @inheritdoc MultiQuoter
    function multiswap(
        address p,
        bool zeroForOne,
        int256[] memory amounts
    ) internal view override returns (MultiSwapResult memory result) {
        result.gasEstimates = new uint256[](amounts.length);
        result.amounts0 = new int256[](amounts.length);
        result.amounts1 = new int256[](amounts.length);

        uint160 sqrtPriceLimitX96 = zeroForOne ? TickMath.MIN_SQRT_RATIO + 1 : TickMath.MAX_SQRT_RATIO - 1;
        IUniswapV3Pool pool = IUniswapV3Pool(p);

        (uint160 sqrtPriceX96Start, int24 tickStart, , , , , ) = pool.slot0();
        int24 tickSpacing = pool.tickSpacing();
        uint24 fee = pool.fee();

        bool exactInput = amounts[0] > 0;

        SwapState memory state = SwapState({
            amountSpecifiedRemaining: amounts[0],
            amountCalculated: 0,
            sqrtPriceX96: sqrtPriceX96Start,
            tick: tickStart,
            liquidity: pool.liquidity(),
            amountsIndex: 0,
            gasAggregate: 0
        });

        // continue swapping as long as we haven't used the entire input/output and haven't reached the price limit
        while (state.amountSpecifiedRemaining != 0 && state.sqrtPriceX96 != sqrtPriceLimitX96) {
            StepComputations memory step;
            step.gasBefore = gasleft();

            step.sqrtPriceStartX96 = state.sqrtPriceX96;

            (step.tickNext, step.initialized) = nextInitializedTickWithinOneWord(
                pool,
                state.tick,
                tickSpacing,
                zeroForOne
            );

            // ensure that we do not overshoot the min/max tick, as the tick bitmap is not aware of these bounds
            if (step.tickNext < TickMath.MIN_TICK) {
                step.tickNext = TickMath.MIN_TICK;
            } else if (step.tickNext > TickMath.MAX_TICK) {
                step.tickNext = TickMath.MAX_TICK;
            }

            // get the price for the next tick
            step.sqrtPriceNextX96 = TickMath.getSqrtRatioAtTick(step.tickNext);

            // compute values to swap to the target tick, price limit, or point where input/output amount is exhausted
            (state.sqrtPriceX96, step.amountIn, step.amountOut, step.feeAmount) = SwapMath.computeSwapStep(
                state.sqrtPriceX96,
                (zeroForOne ? step.sqrtPriceNextX96 < sqrtPriceLimitX96 : step.sqrtPriceNextX96 > sqrtPriceLimitX96)
                    ? sqrtPriceLimitX96
                    : step.sqrtPriceNextX96,
                state.liquidity,
                state.amountSpecifiedRemaining,
                fee
            );

            if (exactInput) {
                state.amountSpecifiedRemaining -= (step.amountIn + step.feeAmount).toInt256();
                state.amountCalculated = state.amountCalculated.sub(step.amountOut.toInt256());
            } else {
                state.amountSpecifiedRemaining += step.amountOut.toInt256();
                state.amountCalculated = state.amountCalculated.add((step.amountIn + step.feeAmount).toInt256());
            }

            // shift tick if we reached the next price
            if (state.sqrtPriceX96 == step.sqrtPriceNextX96) {
                // if the tick is initialized, run the tick transition
                if (step.initialized) {
                    (, int128 liquidityNet, , , , , , ) = pool.ticks(step.tickNext);

                    // if we're moving leftward, we interpret liquidityNet as the opposite sign
                    // safe because liquidityNet cannot be type(int128).min
                    if (zeroForOne) liquidityNet = -liquidityNet;

                    state.liquidity = LiquidityMath.addDelta(state.liquidity, liquidityNet);
                }

                state.tick = zeroForOne ? step.tickNext - 1 : step.tickNext;
                state.gasAggregate += step.gasBefore - gasleft();
            } else if (state.sqrtPriceX96 != step.sqrtPriceStartX96) {
                // recompute unless we're on a lower tick boundary (i.e. already transitioned ticks), and haven't moved
                state.tick = TickMath.getTickAtSqrtRatio(state.sqrtPriceX96);
            }

            if (state.amountSpecifiedRemaining == 0) {
                (result.amounts0[state.amountsIndex], result.amounts1[state.amountsIndex]) = zeroForOne == exactInput
                    ? (amounts[state.amountsIndex], state.amountCalculated)
                    : (state.amountCalculated, amounts[state.amountsIndex]);

                if (state.sqrtPriceX96 != step.sqrtPriceNextX96) {
                    result.gasEstimates[state.amountsIndex] = scaleMultiswapGasEstimate(
                        state.gasAggregate + (step.gasBefore - gasleft())
                    );
                } else {
                    // we are moving to the next tick
                    result.gasEstimates[state.amountsIndex] = scaleMultiswapGasEstimate(state.gasAggregate);
                }

                if (state.amountsIndex == amounts.length - 1) {
                    return (result);
                }

                state.amountsIndex += 1;
                state.amountSpecifiedRemaining = amounts[state.amountsIndex].sub(amounts[state.amountsIndex - 1]);
            }
        }

        for (uint256 i = state.amountsIndex; i < amounts.length; ++i) {
            (result.amounts0[i], result.amounts1[i]) = zeroForOne == exactInput
                ? (amounts[i] - state.amountSpecifiedRemaining, state.amountCalculated)
                : (state.amountCalculated, amounts[i] - state.amountSpecifiedRemaining);
            result.gasEstimates[i] = scaleMultiswapGasEstimate(state.gasAggregate);
        }
    }

    /// @notice Returns the multiswap gas estimate scaled to UniswapV3Pool:swap estimates
    /// @dev These parameters have been determined by running a linear regression between UniswapV3QuoterV2
    /// gas estimates and the unscaled gas estimates from multiswap
    /// @param multiSwapEstimate the gas estimate from multiswap
    /// @return swapEstimate the gas estimate equivalent for UniswapV3Pool:swap
    function scaleMultiswapGasEstimate(uint256 multiSwapEstimate) private pure returns (uint256 swapEstimate) {
        return (166 * multiSwapEstimate) / 100 + 50000;
    }

    /// @notice Returns the next initialized tick contained in the same word (or adjacent word) as the tick that is either
    /// to the left (less than or equal to) or right (greater than) of the given tick
    /// @param pool The UniswapV3 pool to get next tick for
    /// @param tick The starting tick
    /// @param tickSpacing The spacing between usable ticks
    /// @param lte Whether to search for the next initialized tick to the left (less than or equal to the starting tick)
    /// @return next The next initialized or uninitialized tick up to 256 ticks away from the current tick
    /// @return initialized Whether the next tick is initialized, as the function only searches within up to 256 ticks
    function nextInitializedTickWithinOneWord(
        IUniswapV3Pool pool,
        int24 tick,
        int24 tickSpacing,
        bool lte
    ) internal view returns (int24 next, bool initialized) {
        int24 compressed = tick / tickSpacing;
        if (tick < 0 && tick % tickSpacing != 0) compressed--; // round towards negative infinity

        if (lte) {
            (int16 wordPos, uint8 bitPos) = position(compressed);
            // all the 1s at or to the right of the current bitPos
            uint256 mask = (1 << bitPos) - 1 + (1 << bitPos);
            uint256 masked = pool.tickBitmap(wordPos) & mask;

            // if there are no initialized ticks to the right of or at the current tick, return rightmost in the word
            initialized = masked != 0;
            // overflow/underflow is possible, but prevented externally by limiting both tickSpacing and tick
            next = initialized
                ? (compressed - int24(bitPos - BitMath.mostSignificantBit(masked))) * tickSpacing
                : (compressed - int24(bitPos)) * tickSpacing;
        } else {
            // start from the word of the next tick, since the current tick state doesn't matter
            (int16 wordPos, uint8 bitPos) = position(compressed + 1);
            // all the 1s at or to the left of the bitPos
            uint256 mask = ~((1 << bitPos) - 1);
            uint256 masked = pool.tickBitmap(wordPos) & mask;

            // if there are no initialized ticks to the left of the current tick, return leftmost in the word
            initialized = masked != 0;
            // overflow/underflow is possible, but prevented externally by limiting both tickSpacing and tick
            next = initialized
                ? (compressed + 1 + int24(BitMath.leastSignificantBit(masked) - bitPos)) * tickSpacing
                : (compressed + 1 + int24(type(uint8).max - bitPos)) * tickSpacing;
        }
    }

    /// @notice Computes the position in the mapping where the initialized bit for a tick lives
    /// @param tick The tick for which to compute the position
    /// @return wordPos The key in the mapping containing the word in which the bit is stored
    /// @return bitPos The bit position in the word where the flag is stored
    function position(int24 tick) private pure returns (int16 wordPos, uint8 bitPos) {
        wordPos = int16(tick >> 8);
        bitPos = uint8(tick % 256);
    }

    /// @inheritdoc MultiQuoter
    function pathHasMultiplePools(bytes memory path) internal pure override returns (bool) {
        return path.hasMultiplePools();
    }

    /// @inheritdoc MultiQuoter
    function pathSkipToken(bytes memory path) internal pure override returns (bytes memory) {
        return path.skipToken();
    }
}
