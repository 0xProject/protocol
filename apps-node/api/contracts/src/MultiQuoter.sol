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

pragma solidity >=0.7 <=0.8;
pragma experimental ABIEncoderV2;

import "./interfaces/IMultiQuoter.sol";

/// @title Provides quotes for multiple swap amounts
/// @notice Allows getting the expected amount out or amount in for multiple given swap amounts without executing the swap
abstract contract MultiQuoter is IMultiQuoter {
    // TODO: both quoteExactMultiInput and quoteExactMultiOutput revert at the end of the quoting logic
    // and return results encodied into a revert reason. The revert should be removed and replaced with
    // a normal return statement whenever the Tick Based AMM samplers stop having the two pool filtering
    // logic. The two pool filtering logic causes pool's storage slots to be warmed up, causing gas estimates
    // to be significantly below the gas used during settlement. Additionally, per the following EIP
    // this revert logic might not clear warm storage slots in the future: https://eips.ethereum.org/EIPS/eip-3978

    // the result of multiswap
    struct MultiSwapResult {
        // the gas estimate for each of swap amounts
        uint256[] gasEstimates;
        // the token0 delta for each swap amount, positive indicates sent and negative indicates receipt
        int256[] amounts0;
        // the token1 delta for each swap amount, positive indicates sent and negative indicates receipt
        int256[] amounts1;
    }

    // @inheritdoc IMultiQuoter
    function quoteExactMultiInput(
        address factory,
        bytes memory path,
        uint256[] memory amountsIn
    ) external view override {
        for (uint256 i = 0; i < amountsIn.length - 1; ++i) {
            require(amountsIn[i] <= amountsIn[i + 1], "MultiQuoter/amountsIn must be monotonically increasing");
        }
        uint256[] memory gasEstimates = new uint256[](amountsIn.length);

        while (true) {
            (address pool, bool zeroForOne) = getFirstSwapDetails(factory, path, true);

            // multiswap only accepts int256[] for input amounts
            int256[] memory amounts = new int256[](amountsIn.length);
            for (uint256 i = 0; i < amountsIn.length; ++i) {
                amounts[i] = int256(amountsIn[i]);
            }

            MultiSwapResult memory result = multiswap(pool, zeroForOne, amounts);

            for (uint256 i = 0; i < amountsIn.length; ++i) {
                amountsIn[i] = zeroForOne ? uint256(-result.amounts1[i]) : uint256(-result.amounts0[i]);
                gasEstimates[i] += result.gasEstimates[i];
            }

            // decide whether to continue or terminate
            if (pathHasMultiplePools(path)) {
                path = pathSkipToken(path);
            } else {
                // quote results must be encoded into a revert because otherwise subsequent calls
                // to MultiQuoter result in multiswap hitting pool storage slots that are
                // already warm. This results in very inaccurate gas estimates when estimating gas
                // usage for settlement.
                revertWithAmountsAndGas(amountsIn, gasEstimates);
            }
        }
    }

    // @inheritdoc IMultiQuoter
    function quoteExactMultiOutput(
        address factory,
        bytes memory path,
        uint256[] memory amountsOut
    ) external view override {
        uint256[] memory amountsIn = new uint256[](amountsOut.length);
        uint256[] memory gasEstimates = new uint256[](amountsOut.length);

        for (uint256 i = 0; i < amountsOut.length - 1; ++i) {
            require(amountsOut[i] <= amountsOut[i + 1], "MultiQuoter/amountsOut must be monotonically increasing");
        }

        uint256 nextAmountsLength = amountsOut.length;
        while (true) {
            (address pool, bool zeroForOne) = getFirstSwapDetails(factory, path, false);

            // multiswap only accepts int256[] for output amounts
            int256[] memory amounts = new int256[](nextAmountsLength);
            for (uint256 i = 0; i < nextAmountsLength; ++i) {
                amounts[i] = -int256(amountsOut[i]);
            }

            MultiSwapResult memory result = multiswap(pool, zeroForOne, amounts);

            for (uint256 i = 0; i < nextAmountsLength; ++i) {
                uint256 amountReceived = zeroForOne ? uint256(-result.amounts1[i]) : uint256(-result.amounts0[i]);
                if (amountReceived != amountsOut[i]) {
                    // for exact output swaps we need to check whether we would receive the full amount due to
                    // multiswap behavior when hitting the limit
                    nextAmountsLength = i;
                    break;
                } else {
                    // populate amountsOut for the next pool
                    amountsOut[i] = zeroForOne ? uint256(result.amounts0[i]) : uint256(result.amounts1[i]);
                    gasEstimates[i] += result.gasEstimates[i];
                }
            }

            if (nextAmountsLength == 0 || !pathHasMultiplePools(path)) {
                for (uint256 i = 0; i < nextAmountsLength; ++i) {
                    amountsIn[i] = amountsOut[i];
                }

                // quote results must be encoded into a revert because otherwise subsequent calls
                // to MultiQuoter result in multiswap hitting pool storage slots that are
                // already warm. This results in very inaccurate gas estimates when estimating gas
                // usage for settlement.
                revertWithAmountsAndGas(amountsIn, gasEstimates);
            }

            path = pathSkipToken(path);
        }
    }

    /// @notice reverts the transaction while encoding amounts and gas estimates into the revert reason
    /// @param amounts the amounts to encode as the first encoding in the revert reason
    /// @param gasEstimates the gas estimates to encode as the second encoding in the revert reason
    function revertWithAmountsAndGas(uint256[] memory amounts, uint256[] memory gasEstimates) private pure {
        bytes memory revertResult = abi.encodeWithSignature("result(uint256[],uint256[])", amounts, gasEstimates);
        assembly {
            revert(add(revertResult, 0x20), mload(revertResult))
        }
    }

    /// @notice get the details of the first swap including the pool to swap within and direction of the swap
    /// @param factory The factory contract managing the tick based AMM pools
    /// @param path The path of the swap as a combination of token pairs and/or pool fee
    /// @param isExactInput whether or not this wap is an exact input or exact output swap (this determines whether tokenIn is first or second in the path)
    /// @return pool The first pool derived from the path.
    /// @return zeroForOne The direction of the swap, true for token0 to token1, false for token1 to token0
    function getFirstSwapDetails(
        address factory,
        bytes memory path,
        bool isExactInput
    ) internal view virtual returns (address pool, bool zeroForOne);

    /// @notice swap multiple amounts of token0 for token1 or token1 for token1
    /// @dev The results of multiswap includes slight rounding issues resulting from rounding up/rounding down in SqrtPriceMath library. Additionally,
    /// it should be noted that multiswap requires a monotonically increasing list of amounts for exact inputs and monotonically decreasing list of
    /// amounts for exact outputs.
    /// @param pool The tick based AMM pool to simulate each of the swap amounts for
    /// @param zeroForOne The direction of the swap, true for token0 to token1, false for token1 to token0
    /// @param amounts The amounts of the swaps, positive values indicate exactInput and negative values indicate exact output
    /// @return result The results of the swap as a MultiSwapResult struct with gas used, token0 and token1 deltas
    function multiswap(
        address pool,
        bool zeroForOne,
        int256[] memory amounts
    ) internal view virtual returns (MultiSwapResult memory result);

    /// @notice Returns true iff the path contains two or more pools
    /// @param path The encoded swap path
    /// @return True if path contains two or more pools, otherwise false
    function pathHasMultiplePools(bytes memory path) internal pure virtual returns (bool);

    /// @notice Skips a token and/or fee element from the path and returns the remainder
    /// @param path The swap path
    /// @return The remaining token + fee elements in the path
    function pathSkipToken(bytes memory path) internal pure virtual returns (bytes memory);
}
