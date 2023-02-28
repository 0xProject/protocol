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

import "./SamplerUtils.sol";
import "./interfaces/IBalancerV2Vault.sol";
import "./BalancerV2Common.sol";

contract BalancerV2Sampler is SamplerUtils, BalancerV2Common {
    /// @dev Sample sell quotes from Balancer V2.
    /// @param poolInfo Struct with pool related data
    /// @param takerToken Address of the taker token (what to sell).
    /// @param makerToken Address of the maker token (what to buy).
    /// @param takerTokenAmounts Taker token sell amount for each sample.
    /// @return makerTokenAmounts Maker amounts bought at each taker token
    ///         amount.
    function sampleSellsFromBalancerV2(
        IBalancerV2Vault.BalancerV2PoolInfo memory poolInfo,
        address takerToken,
        address makerToken,
        uint256[] memory takerTokenAmounts
    ) public returns (uint256[] memory makerTokenAmounts) {
        _assertValidPair(makerToken, takerToken);
        IBalancerV2Vault vault = IBalancerV2Vault(poolInfo.vault);
        address[] memory swapAssets = new address[](2);
        swapAssets[0] = takerToken;
        swapAssets[1] = makerToken;

        uint256 numSamples = takerTokenAmounts.length;
        makerTokenAmounts = new uint256[](numSamples);
        IBalancerV2Vault.FundManagement memory swapFunds = _createSwapFunds();

        for (uint256 i = 0; i < numSamples; i++) {
            IBalancerV2Vault.BatchSwapStep[] memory swapSteps = _createSwapSteps(poolInfo, takerTokenAmounts[i]);

            try
                // For sells we specify the takerToken which is what the vault will receive from the trade
                vault.queryBatchSwap(IBalancerV2Vault.SwapKind.GIVEN_IN, swapSteps, swapAssets, swapFunds)
            returns (
                // amounts represent pool balance deltas from the swap (incoming balance, outgoing balance)
                int256[] memory amounts
            ) {
                // Outgoing balance is negative so we need to flip the sign
                int256 amountOutFromPool = amounts[amounts.length - 1] * -1;
                if (amountOutFromPool <= 0) {
                    break;
                }
                makerTokenAmounts[i] = uint256(amountOutFromPool);
            } catch (bytes memory) {
                // Swallow failures, leaving all results as zero.
                break;
            }
        }
    }

    /// @dev Sample buy quotes from Balancer V2.
    /// @param poolInfo Struct with pool related data
    /// @param takerToken Address of the taker token (what to sell).
    /// @param makerToken Address of the maker token (what to buy).
    /// @param makerTokenAmounts Maker token buy amount for each sample.
    /// @return takerTokenAmounts Taker amounts sold at each maker token
    ///         amount.
    function sampleBuysFromBalancerV2(
        IBalancerV2Vault.BalancerV2PoolInfo memory poolInfo,
        address takerToken,
        address makerToken,
        uint256[] memory makerTokenAmounts
    ) public returns (uint256[] memory takerTokenAmounts) {
        _assertValidPair(makerToken, takerToken);
        IBalancerV2Vault vault = IBalancerV2Vault(poolInfo.vault);
        address[] memory swapAssets = new address[](2);
        swapAssets[0] = takerToken;
        swapAssets[1] = makerToken;

        uint256 numSamples = makerTokenAmounts.length;
        takerTokenAmounts = new uint256[](numSamples);
        IBalancerV2Vault.FundManagement memory swapFunds = _createSwapFunds();

        for (uint256 i = 0; i < numSamples; i++) {
            IBalancerV2Vault.BatchSwapStep[] memory swapSteps = _createSwapSteps(poolInfo, makerTokenAmounts[i]);

            try
                // For buys we specify the makerToken which is what taker will receive from the trade
                vault.queryBatchSwap(IBalancerV2Vault.SwapKind.GIVEN_OUT, swapSteps, swapAssets, swapFunds)
            returns (int256[] memory amounts) {
                int256 amountIntoPool = amounts[0];
                if (amountIntoPool <= 0) {
                    break;
                }
                takerTokenAmounts[i] = uint256(amountIntoPool);
            } catch (bytes memory) {
                // Swallow failures, leaving all results as zero.
                break;
            }
        }
    }

    function _createSwapSteps(
        IBalancerV2Vault.BalancerV2PoolInfo memory poolInfo,
        uint256 amount
    ) private pure returns (IBalancerV2Vault.BatchSwapStep[] memory) {
        IBalancerV2Vault.BatchSwapStep[] memory swapSteps = new IBalancerV2Vault.BatchSwapStep[](1);
        swapSteps[0] = IBalancerV2Vault.BatchSwapStep({
            poolId: poolInfo.poolId,
            assetInIndex: 0,
            assetOutIndex: 1,
            amount: amount,
            userData: ""
        });

        return swapSteps;
    }
}
