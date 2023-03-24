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

// transitive dependencies PathHelper.sol and BytesLib.sol require 0.8.9
pragma solidity 0.8.9;

import "@uniswap/v3-core/contracts/libraries/LowGasSafeMath.sol";
import "@kybernetwork/ks-elastic-sc/contracts/libraries/TickMath.sol";
import "@kybernetwork/ks-elastic-sc/contracts/libraries/SwapMath.sol";
import "@kybernetwork/ks-elastic-sc/contracts/libraries/Linkedlist.sol";
import "@kybernetwork/ks-elastic-sc/contracts/libraries/LiqDeltaMath.sol";
import "@kybernetwork/ks-elastic-sc/contracts/periphery/libraries/PathHelper.sol";

import "./interfaces/IKyberElastic.sol";
import "./MultiQuoter.sol";

contract KyberElasticMultiQuoter is MultiQuoter {
    using SafeCast for uint256;
    using LowGasSafeMath for int256;
    using SafeCast for int128;
    using PathHelper for bytes;

    // temporary swap variables, some of which will be used to update the pool state
    struct SwapData {
        int256 specifiedAmount; // the specified amount (could be tokenIn or tokenOut)
        int256 returnedAmount; // the opposite amout of sourceQty
        uint160 sqrtP; // current sqrt(price), multiplied by 2^96
        int24 currentTick; // the tick associated with the current price
        int24 nextTick; // the next initialized tick
        uint160 nextSqrtP; // the price of nextTick
        bool zeroForOne; // true if the inputs amounts are in terms of token0
        bool isExactInput; // true = input qty, false = output qty
        uint128 baseL; // the cached base pool liquidity without reinvestment liquidity
        uint128 reinvestL; // the cached reinvestment liquidity
        uint256 amountsIndex; // index at which amount we're currently swapping to
        uint256 gasAggregate; // amount of gas used up to the current tick
        uint256 gasResidual; // amount of gas used between current tick and current price
    }

    /// @inheritdoc MultiQuoter
    function getFirstSwapDetails(
        address factory,
        bytes memory path,
        bool isExactInput
    ) internal view override returns (address pool, bool zeroForOne) {
        (address tokenA, address tokenB, uint24 fee) = path.decodeFirstPool();
        zeroForOne = tokenA < tokenB;
        pool = IKyberElasticFactory(factory).getPool(tokenA, tokenB, fee);
    }

    /// @dev Return initial data before swapping
    /// @param willUpTick whether is up/down tick
    /// @return baseL current pool base liquidity without reinvestment liquidity
    /// @return reinvestL current pool reinvestment liquidity
    /// @return sqrtP current pool sqrt price
    /// @return currentTick current pool tick
    /// @return nextTick next tick to calculate data
    function _getInitialSwapData(
        IKyberElasticPool pool,
        bool willUpTick
    ) internal view returns (uint128 baseL, uint128 reinvestL, uint160 sqrtP, int24 currentTick, int24 nextTick) {
        (sqrtP, currentTick, nextTick, ) = pool.getPoolState();

        (baseL, reinvestL, ) = pool.getLiquidityState();

        if (willUpTick) {
            (, nextTick) = pool.initializedTicks(nextTick);
        }
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
        uint256 gasBefore = gasleft();

        IKyberElasticPool pool = IKyberElasticPool(p);

        SwapData memory swapData;
        swapData.specifiedAmount = amounts[0];
        swapData.zeroForOne = zeroForOne;
        swapData.isExactInput = swapData.specifiedAmount > 0;

        // tick (token1Qty/token0Qty) will increase for swapping from token1 to token0
        bool willUpTick = (swapData.isExactInput != zeroForOne);
        uint160 limitSqrtP = willUpTick ? TickMath.MAX_SQRT_RATIO - 1 : TickMath.MIN_SQRT_RATIO + 1;
        (
            swapData.baseL,
            swapData.reinvestL,
            swapData.sqrtP,
            swapData.currentTick,
            swapData.nextTick
        ) = _getInitialSwapData(pool, willUpTick);

        swapData.amountsIndex = 0;
        swapData.gasAggregate = 0;
        swapData.gasResidual = 0;

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
                    swapData.zeroForOne
                );

                swapData.specifiedAmount -= usedAmount;
                swapData.returnedAmount += returnedAmount;
                swapData.reinvestL += deltaL.toUint128();
            }

            // if price has not reached the next sqrt price (still liquidity in current tick)
            if (swapData.sqrtP != swapData.nextSqrtP) {
                swapData.currentTick = TickMath.getTickAtSqrtRatio(swapData.sqrtP);
                // use max since we want to over estimate
                swapData.gasResidual = max(swapData.gasResidual, gasBefore - gasleft());
                gasBefore = gasleft();
            } else {
                gasBefore = gasleft();
                swapData.currentTick = willUpTick ? tempNextTick : tempNextTick - 1;

                if (tempNextTick == swapData.nextTick) {
                    (swapData.baseL, swapData.nextTick) = _updateLiquidityAndCrossTick(
                        pool,
                        swapData.nextTick,
                        swapData.baseL,
                        willUpTick
                    );
                }
                swapData.gasAggregate += (gasBefore - gasleft() + swapData.gasResidual);
                swapData.gasResidual = 0;
                gasBefore = gasleft();
            }
            if (swapData.specifiedAmount == 0) {
                (result.amounts0[swapData.amountsIndex], result.amounts1[swapData.amountsIndex]) = zeroForOne ==
                    swapData.isExactInput
                    ? (amounts[swapData.amountsIndex], swapData.returnedAmount)
                    : (swapData.returnedAmount, amounts[swapData.amountsIndex]);

                result.gasEstimates[swapData.amountsIndex] = swapData.gasAggregate + swapData.gasResidual;

                if (swapData.amountsIndex == amounts.length - 1) {
                    return (result);
                }

                swapData.amountsIndex += 1;
                swapData.specifiedAmount = amounts[swapData.amountsIndex].sub(amounts[swapData.amountsIndex - 1]);
            }
        }

        for (uint256 i = swapData.amountsIndex; i < amounts.length; ++i) {
            (result.amounts0[i], result.amounts1[i]) = zeroForOne == swapData.isExactInput
                ? (amounts[i], swapData.returnedAmount)
                : (swapData.returnedAmount, amounts[i]);
            result.gasEstimates[i] = swapData.gasAggregate + swapData.gasResidual;
        }
    }

    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a >= b ? a : b;
    }

    /// @dev Update liquidity net data and do cross tick
    function _updateLiquidityAndCrossTick(
        IKyberElasticPool pool,
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

    /// @inheritdoc MultiQuoter
    function pathHasMultiplePools(bytes memory path) internal pure override returns (bool) {
        return path.hasMultiplePools();
    }

    /// @inheritdoc MultiQuoter
    function pathSkipToken(bytes memory path) internal pure override returns (bytes memory) {
        return path.skipToken();
    }
}
