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

import "@cryptoalgebra/core/contracts/libraries/TickMath.sol";
import "@cryptoalgebra/core/contracts/libraries/PriceMovementMath.sol";
import "@cryptoalgebra/core/contracts/libraries/SafeCast.sol";
import "@cryptoalgebra/core/contracts/libraries/LowGasSafeMath.sol";
import "@cryptoalgebra/core/contracts/libraries/LiquidityMath.sol";
import "@cryptoalgebra/periphery/contracts/libraries/Path.sol";

import "./interfaces/IAlgebra.sol";
import "./MultiQuoter.sol";

contract AlgebraMultiQuoter is MultiQuoter {
    using SafeCast for uint256;
    using LowGasSafeMath for int256;
    using Path for bytes;

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
        if (isExactInput) {
            (tokenIn, tokenOut) = path.decodeFirstPool();
        } else {
            (tokenOut, tokenIn) = path.decodeFirstPool();
        }

        zeroForOne = tokenIn < tokenOut;
        pool = IAlgebraFactory(factory).poolByPair(tokenIn, tokenOut);
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
        IAlgebraPool pool = IAlgebraPool(p);

        (uint160 sqrtPriceX96Start, int24 tickStart, uint16 fee, , , , ) = pool.globalState();
        int24 tickSpacing = pool.tickSpacing();

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
            (state.sqrtPriceX96, step.amountIn, step.amountOut, step.feeAmount) = PriceMovementMath
                .movePriceTowardsTarget(
                    zeroForOne,
                    state.sqrtPriceX96,
                    (zeroForOne == (step.sqrtPriceNextX96 < sqrtPriceLimitX96))
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
                    result.gasEstimates[state.amountsIndex] = state.gasAggregate + (step.gasBefore - gasleft());
                } else {
                    // we are moving to the next tick
                    result.gasEstimates[state.amountsIndex] = state.gasAggregate;
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
            result.gasEstimates[i] = state.gasAggregate;
        }
    }

    /// @notice Returns the next initialized tick contained in the same word (or adjacent word) as the tick that is either
    /// to the left (less than or equal to) or right (greater than) of the given tick
    /// @param pool The Algebra pool to get next tick for
    /// @param tick The starting tick
    /// @param tickSpacing The spacing between usable ticks
    /// @param lte Whether to search for the next initialized tick to the left (less than or equal to the starting tick)
    /// @return next The next initialized or uninitialized tick up to 256 ticks away from the current tick
    /// @return initialized Whether the next tick is initialized, as the function only searches within up to 256 ticks
    function nextInitializedTickWithinOneWord(
        IAlgebraPool pool,
        int24 tick,
        int24 tickSpacing,
        bool lte
    ) private view returns (int24 next, bool initialized) {
        {
            // compress and round towards negative infinity if negative
            assembly {
                tick := sub(sdiv(tick, tickSpacing), and(slt(tick, 0), not(iszero(smod(tick, tickSpacing)))))
            }
        }

        if (lte) {
            // unpacking not made into a separate function for gas and contract size savings
            int16 rowNumber;
            uint8 bitNumber;
            assembly {
                bitNumber := and(tick, 0xFF)
                rowNumber := shr(8, tick)
            }
            uint256 _row = pool.tickTable(rowNumber) << (255 - bitNumber); // all the 1s at or to the right of the current bitNumber

            if (_row != 0) {
                tick -= int24(255 - getMostSignificantBit(_row));
                return (tick * tickSpacing, true);
            } else {
                tick -= int24(bitNumber);
                return (tick * tickSpacing, false);
            }
        } else {
            // start from the word of the next tick, since the current tick state doesn't matter
            tick += 1;
            int16 rowNumber;
            uint8 bitNumber;
            assembly {
                bitNumber := and(tick, 0xFF)
                rowNumber := shr(8, tick)
            }

            // all the 1s at or to the left of the bitNumber
            uint256 _row = pool.tickTable(rowNumber) >> (bitNumber);

            if (_row != 0) {
                tick += int24(getSingleSignificantBit(-_row & _row)); // least significant bit
                return (tick * tickSpacing, true);
            } else {
                tick += int24(255 - bitNumber);
                return (tick * tickSpacing, false);
            }
        }
    }

    /// @notice get position of single 1-bit
    /// @dev it is assumed that word contains exactly one 1-bit, otherwise the result will be incorrect
    /// @param word The word containing only one 1-bit
    function getSingleSignificantBit(uint256 word) internal pure returns (uint8 singleBitPos) {
        assembly {
            singleBitPos := iszero(and(word, 0x5555555555555555555555555555555555555555555555555555555555555555))
            singleBitPos := or(
                singleBitPos,
                shl(7, iszero(and(word, 0x00000000000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF)))
            )
            singleBitPos := or(
                singleBitPos,
                shl(6, iszero(and(word, 0x0000000000000000FFFFFFFFFFFFFFFF0000000000000000FFFFFFFFFFFFFFFF)))
            )
            singleBitPos := or(
                singleBitPos,
                shl(5, iszero(and(word, 0x00000000FFFFFFFF00000000FFFFFFFF00000000FFFFFFFF00000000FFFFFFFF)))
            )
            singleBitPos := or(
                singleBitPos,
                shl(4, iszero(and(word, 0x0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF0000FFFF)))
            )
            singleBitPos := or(
                singleBitPos,
                shl(3, iszero(and(word, 0x00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF00FF)))
            )
            singleBitPos := or(
                singleBitPos,
                shl(2, iszero(and(word, 0x0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F0F)))
            )
            singleBitPos := or(
                singleBitPos,
                shl(1, iszero(and(word, 0x3333333333333333333333333333333333333333333333333333333333333333)))
            )
        }
    }

    /// @notice get position of most significant 1-bit (leftmost)
    /// @dev it is assumed that before the call, a check will be made that the argument (word) is not equal to zero
    /// @param word The word containing at least one 1-bit
    function getMostSignificantBit(uint256 word) internal pure returns (uint8 mostBitPos) {
        assembly {
            word := or(word, shr(1, word))
            word := or(word, shr(2, word))
            word := or(word, shr(4, word))
            word := or(word, shr(8, word))
            word := or(word, shr(16, word))
            word := or(word, shr(32, word))
            word := or(word, shr(64, word))
            word := or(word, shr(128, word))
            word := sub(word, shr(1, word))
        }
        return (getSingleSignificantBit(word));
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
