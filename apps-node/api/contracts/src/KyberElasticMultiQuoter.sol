// SPDX-License-Identifier: Apache-2.0
/*

  Copyright 2022 ZeroEx Intl.

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

pragma solidity ^0.8;

import "./interfaces/IKyberSwapElastic.sol";
import "./libraries/Multiswap.sol";
import "@kyberelastic/interfaces/IFactory.sol";
import "@kyberelastic/libraries/TickMath.sol";
import "@kyberelastic/libraries/SwapMath.sol";
import "@kyberelastic/libraries/Linkedlist.sol";
import "@kyberelastic/libraries/LiqDeltaMath.sol";
import "@kyberelastic/periphery/libraries/PathHelper.sol";
import "@uniswap/v3-core/contracts/libraries/LowGasSafeMath.sol";

/// @title Provides quotes for multiple swap amounts
/// @notice Allows getting the expected amount out or amount in for multiple given swap amounts without executing the swap
contract KyberElasticMultiQuoter {
    using SafeCast for uint256;
    using LowGasSafeMath for int256;
    using SafeCast for int128;

    // temporary swap variables, some of which will be used to update the pool state
    struct SwapData {
        int256 specifiedAmount; // the specified amount (could be tokenIn or tokenOut)
        int256 returnedAmount; // the opposite amout of sourceQty
        uint160 sqrtP; // current sqrt(price), multiplied by 2^96
        int24 currentTick; // the tick associated with the current price
        int24 nextTick; // the next initialized tick
        uint160 nextSqrtP; // the price of nextTick
        bool isToken0; // true if specifiedAmount is in token0, false if in token1
        bool isExactInput; // true = input qty, false = output qty
        uint128 baseL; // the cached base pool liquidity without reinvestment liquidity
        uint128 reinvestL; // the cached reinvestment liquidity
        uint256 amountsIndex;
    }

    // TODO: same as uniswapv3 multiquoter logic. see if we can make generic.
    function quoteExactMultiInput(
        IFactory factory,
        bytes memory path,
        uint256[] memory amountsIn
    ) public view returns (uint256[] memory amountsOut, uint256[] memory gasEstimate) {
        for (uint256 i = 1; i < amountsIn.length; ++i) {
            require(amountsIn[i] >= amountsIn[i - 1], "multiswap amounts must be monotonically increasing");
        }
        gasEstimate = new uint256[](amountsIn.length);
        while (true) {
            (address tokenIn, address tokenOut, uint24 fee) = PathHelper.decodeFirstPool(path);

            // NOTE: this is equivalent to UniswapV3's zeroForOne.
            // if tokenIn < tokenOut, token input and specified token is token0, swap from 0 to 1
            bool isToken0 = tokenIn < tokenOut;
            IPool pool = IPool(factory.getPool(tokenIn, tokenOut, fee));

            // multiswap only accepts int256[] for input amounts
            int256[] memory amounts = new int256[](amountsIn.length);
            for (uint256 i = 0; i < amountsIn.length; ++i) {
                amounts[i] = int256(amountsIn[i]);
            }

            Multiswap.Result memory result = multiswap(
                pool,
                isToken0,
                amounts,
                isToken0 ? TickMath.MIN_SQRT_RATIO + 1 : TickMath.MAX_SQRT_RATIO - 1
            );

            for (uint256 i = 0; i < amountsIn.length; ++i) {
                amountsIn[i] = isToken0 ? uint256(-result.amounts1[i]) : uint256(-result.amounts0[i]);
                gasEstimate[i] += result.gasEstimates[i];
            }

            // decide whether to continue or terminate
            if (PathHelper.hasMultiplePools(path)) {
                path = PathHelper.skipToken(path);
            } else {
                return (amountsIn, gasEstimate);
            }
        }
    }

    // TODO: same as uniswapv3 multiquoter logic. see if we can make generic.
    function quoteExactMultiOutput(
        IFactory factory,
        bytes memory path,
        uint256[] memory amountsOut
    ) public view returns (uint256[] memory amountsIn, uint256[] memory gasEstimate) {
        for (uint256 i = 1; i < amountsOut.length; ++i) {
            require(amountsOut[i] >= amountsOut[i - 1], "multiswap amounts must be monotonically inreasing");
        }
        gasEstimate = new uint256[](amountsOut.length);
        while (true) {
            (address tokenOut, address tokenIn, uint24 fee) = PathHelper.decodeFirstPool(path);

            // NOTE: this is equivalent to UniswapV3's zeroForOne.
            // if tokenIn > tokenOut, output token and specified token is token0, swap from token1 to token0
            bool isToken0 = tokenIn > tokenOut;
            IPool pool = IPool(factory.getPool(tokenIn, tokenOut, fee));

            // multiswap only accepts int256[] for input amounts
            int256[] memory amounts = new int256[](amountsOut.length);
            for (uint256 i = 0; i < amountsOut.length; ++i) {
                amounts[i] = -int256(amountsOut[i]);
            }

            Multiswap.Result memory result = multiswap(
                pool,
                isToken0,
                amounts,
                isToken0 ? TickMath.MAX_SQRT_RATIO - 1 : TickMath.MIN_SQRT_RATIO + 1
            );

            for (uint256 i = 0; i < amountsOut.length; ++i) {
                amountsOut[i] = isToken0 ? uint256(result.amounts0[i]) : uint256(result.amounts1[i]);
                gasEstimate[i] += result.gasEstimates[i];
            }

            // decide whether to continue or terminate
            if (PathHelper.hasMultiplePools(path)) {
                path = PathHelper.skipToken(path);
            } else {
                return (amountsOut, gasEstimate);
            }
        }
    }

    /// @dev Return initial data before swapping
    /// @param willUpTick whether is up/down tick
    /// @return baseL current pool base liquidity without reinvestment liquidity
    /// @return reinvestL current pool reinvestment liquidity
    /// @return sqrtP current pool sqrt price
    /// @return currentTick current pool tick
    /// @return nextTick next tick to calculate data
    function _getInitialSwapData(
        IPool pool,
        bool willUpTick
    ) internal view returns (uint128 baseL, uint128 reinvestL, uint160 sqrtP, int24 currentTick, int24 nextTick) {
        (sqrtP, currentTick, nextTick, ) = pool.getPoolState();

        (baseL, reinvestL, ) = pool.getLiquidityState();

        if (willUpTick) {
            (, nextTick) = pool.initializedTicks(nextTick);
        }
    }

    /// @notice swap multiple amounts of token0 for token1 or token1 for token0
    function multiswap(
        IPool pool,
        bool isToken0,
        int256[] memory amounts,
        uint160 limitSqrtP
    ) private view returns (Multiswap.Result memory result) {
        result.gasEstimates = new uint256[](amounts.length);
        result.amounts0 = new int256[](amounts.length);
        result.amounts1 = new int256[](amounts.length);
        uint256 gasBefore = gasleft();

        SwapData memory swapData;
        swapData.specifiedAmount = amounts[0];
        swapData.isToken0 = isToken0;
        swapData.isExactInput = swapData.specifiedAmount > 0;

        // tick (token1Qty/token0Qty) will increase for swapping from token1 to token0
        bool willUpTick = (swapData.isExactInput != isToken0);
        (
            swapData.baseL,
            swapData.reinvestL,
            swapData.sqrtP,
            swapData.currentTick,
            swapData.nextTick
        ) = _getInitialSwapData(pool, willUpTick);
        swapData.amountsIndex = 0;

        // verify limitSqrtP
        if (willUpTick) {
            require(limitSqrtP > swapData.sqrtP && limitSqrtP < TickMath.MAX_SQRT_RATIO, "bad limitSqrtP");
        } else {
            require(limitSqrtP < swapData.sqrtP && limitSqrtP > TickMath.MIN_SQRT_RATIO, "bad limitSqrtP");
        }

        uint24 swapFeeUnits = pool.swapFeeUnits();

        // continue swapping while specified input/output isn't satisfied or price limit not reached
        while (swapData.specifiedAmount != 0 && swapData.sqrtP != limitSqrtP) {
            // math calculations work with the assumption that the price diff is capped to 5%
            // since tick distance is uncapped between currentTick and nextTick
            // we use tempNextTick to satisfy our assumption with MAX_TICK_DISTANCE is set to be matched this condition
            int24 tempNextTick = swapData.nextTick;
            if (willUpTick && tempNextTick > C.MAX_TICK_DISTANCE + swapData.currentTick) {
                tempNextTick = swapData.currentTick + C.MAX_TICK_DISTANCE;
            } else if (!willUpTick && tempNextTick < swapData.currentTick - C.MAX_TICK_DISTANCE) {
                tempNextTick = swapData.currentTick - C.MAX_TICK_DISTANCE;
            }

            swapData.nextSqrtP = TickMath.getSqrtRatioAtTick(tempNextTick);

            {
                uint160 targetSqrtP = swapData.nextSqrtP;
                // ensure next sqrtP (and its corresponding tick) does not exceed price limit
                if (willUpTick == (swapData.nextSqrtP > limitSqrtP)) {
                    targetSqrtP = limitSqrtP;
                }

                int256 usedAmount;
                int256 returnedAmount;
                uint256 deltaL;
                // local scope for targetSqrtP, usedAmount, returnedAmount and deltaL
                (usedAmount, returnedAmount, deltaL, swapData.sqrtP) = SwapMath.computeSwapStep(
                    swapData.baseL + swapData.reinvestL,
                    swapData.sqrtP,
                    targetSqrtP,
                    swapFeeUnits,
                    swapData.specifiedAmount,
                    swapData.isExactInput,
                    swapData.isToken0
                );

                swapData.specifiedAmount -= usedAmount;
                swapData.returnedAmount += returnedAmount;
                swapData.reinvestL += deltaL.toUint128();
            }

            // if price has not reached the next sqrt price
            if (swapData.sqrtP != swapData.nextSqrtP) {
                swapData.currentTick = TickMath.getTickAtSqrtRatio(swapData.sqrtP);
                if (swapData.amountsIndex == amounts.length - 1) {
                    break;
                }
            } else {
                swapData.currentTick = willUpTick ? tempNextTick : tempNextTick - 1;

                // if tempNextTick is not next initialized tick
                if (tempNextTick == swapData.nextTick) {
                    (swapData.baseL, swapData.nextTick) = _updateLiquidityAndCrossTick(
                        pool,
                        swapData.nextTick,
                        swapData.baseL,
                        willUpTick
                    );
                }
            }
            if (swapData.specifiedAmount == 0) {
                (result.amounts0[swapData.amountsIndex], result.amounts1[swapData.amountsIndex]) = isToken0 ==
                    swapData.isExactInput
                    ? (amounts[swapData.amountsIndex], swapData.returnedAmount)
                    : (swapData.returnedAmount, amounts[swapData.amountsIndex]);

                result.gasEstimates[swapData.amountsIndex] = gasBefore - gasleft();

                if (swapData.amountsIndex == amounts.length - 1) {
                    return (result);
                }

                swapData.amountsIndex += 1;
                swapData.specifiedAmount = amounts[swapData.amountsIndex].sub(amounts[swapData.amountsIndex - 1]);
            }
        }

        for (uint256 i = swapData.amountsIndex; i < amounts.length; ++i) {
            (result.amounts0[i], result.amounts1[i]) = isToken0 == swapData.isExactInput
                ? (amounts[i] - swapData.specifiedAmount, swapData.returnedAmount)
                : (swapData.returnedAmount, amounts[i] - swapData.specifiedAmount);
        }

        result.gasEstimates[swapData.amountsIndex] = gasBefore - gasleft();
    }

    /// @dev Update liquidity net data and do cross tick
    function _updateLiquidityAndCrossTick(
        IPool pool,
        int24 nextTick,
        uint128 currentLiquidity,
        bool willUpTick
    ) internal view returns (uint128 newLiquidity, int24 newNextTick) {
        (, int128 liquidityNet, , ) = pool.ticks(nextTick);
        if (willUpTick) {
            (, newNextTick) = pool.initializedTicks(nextTick);
        } else {
            (newNextTick, ) = pool.initializedTicks(nextTick);
            liquidityNet = -liquidityNet;
        }
        newLiquidity = LiqDeltaMath.applyLiquidityDelta(
            currentLiquidity,
            liquidityNet >= 0 ? uint128(liquidityNet) : liquidityNet.revToUint128(),
            liquidityNet >= 0
        );
    }
}
