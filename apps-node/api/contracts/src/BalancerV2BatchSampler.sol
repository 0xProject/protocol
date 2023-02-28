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

pragma solidity ^0.6;
pragma experimental ABIEncoderV2;

import "./interfaces/IBalancerV2Vault.sol";
import "./BalancerV2Common.sol";

contract BalancerV2BatchSampler is BalancerV2Common {
    // Replaces amount for first step with each takerTokenAmount and calls queryBatchSwap using supplied steps
    /// @dev Sample sell quotes from Balancer V2 supporting multihops.
    /// @param swapSteps Array of swap steps (can be >= 1).
    /// @param swapAssets Array of token address for swaps.
    /// @param takerTokenAmounts Taker token sell amount for each sample.
    function sampleMultihopSellsFromBalancerV2(
        IBalancerV2Vault vault,
        IBalancerV2Vault.BatchSwapStep[] memory swapSteps,
        address[] memory swapAssets,
        uint256[] memory takerTokenAmounts
    ) public returns (uint256[] memory makerTokenAmounts) {
        uint256 numSamples = takerTokenAmounts.length;
        makerTokenAmounts = new uint256[](numSamples);
        IBalancerV2Vault.FundManagement memory swapFunds = _createSwapFunds();

        for (uint256 i = 0; i < numSamples; i++) {
            swapSteps[0].amount = takerTokenAmounts[i];
            try
                // For sells we specify the takerToken which is what the vault will receive from the trade
                vault.queryBatchSwap(IBalancerV2Vault.SwapKind.GIVEN_IN, swapSteps, swapAssets, swapFunds)
            returns (
                // amounts represent pool balance deltas from the swap (incoming balance, outgoing balance)
                int256[] memory amounts
            ) {
                // Outgoing balance is negative so we need to flip the sign
                // Note - queryBatchSwap will return a delta for each token in the assets array and last asset should be tokenOut
                int256 amountOutFromPool = amounts[amounts.length - 1] * -1;
                if (amountOutFromPool <= 0) {
                    break;
                }
                makerTokenAmounts[i] = uint256(amountOutFromPool);
            } catch {
                // Swallow failures, leaving all results as zero.
                break;
            }
        }
    }

    // Replaces amount for first step with each makerTokenAmount and calls queryBatchSwap using supplied steps
    /// @dev Sample buy quotes from Balancer V2 supporting multihops.
    /// @param swapSteps Array of swap steps (can be >= 1).
    /// @param swapAssets Array of token address for swaps.
    /// @param makerTokenAmounts Maker token buy amount for each sample.
    function sampleMultihopBuysFromBalancerV2(
        IBalancerV2Vault vault,
        IBalancerV2Vault.BatchSwapStep[] memory swapSteps,
        address[] memory swapAssets,
        uint256[] memory makerTokenAmounts
    ) public returns (uint256[] memory takerTokenAmounts) {
        uint256 numSamples = makerTokenAmounts.length;
        takerTokenAmounts = new uint256[](numSamples);
        IBalancerV2Vault.FundManagement memory swapFunds = _createSwapFunds();

        for (uint256 i = 0; i < numSamples; i++) {
            swapSteps[0].amount = makerTokenAmounts[i];
            try
                // Uses GIVEN_OUT type for Buy
                vault.queryBatchSwap(IBalancerV2Vault.SwapKind.GIVEN_OUT, swapSteps, swapAssets, swapFunds)
            returns (
                // amounts represent pool balance deltas from the swap (incoming balance, outgoing balance)
                int256[] memory amounts
            ) {
                int256 amountIntoPool = amounts[0];
                if (amountIntoPool <= 0) {
                    break;
                }
                takerTokenAmounts[i] = uint256(amountIntoPool);
            } catch {
                // Swallow failures, leaving all results as zero.
                break;
            }
        }
    }
}
