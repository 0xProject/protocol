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


contract BalancerV2Sampler is SamplerUtils {
    /// @dev Base gas limit for Balancer calls.
    uint256 constant private BALANCER_CALL_GAS = 300e3; // 300k

    struct BalancerV2PoolInfo {
        bytes32 poolId;
        address vaultAddress;
    }

    /// @dev Sample sell quotes from Balancer V2.
    /// @param poolInfo Struct with pool related data
    /// @param takerToken Address of the taker token (what to sell).
    /// @param makerToken Address of the maker token (what to buy).
    /// @param takerTokenAmounts Taker token sell amount for each sample.
    /// @return makerTokenAmounts Maker amounts bought at each taker token
    ///         amount.
    function sampleSellsFromBalancer(
        BalancerV2PoolInfo memory poolInfo,
        address takerToken,
        address makerToken,
        uint256[] memory takerTokenAmounts
    )
        public
        view
        returns (uint256[] memory makerTokenAmounts)
    {
        _assertValidPair(makerToken, takerToken);
        IBalancerV2Vault vault = IBalancerV2Vault(poolInfo.vaultAddress);
        // For sells we specify the takerToken which is what the vault will receive from the trade
        IBalancerV2Vault.SwapKind swapKind = IBalancerV2Vault.SwapKind.GIVEN_IN;
        IAsset[2] memory swapAssets = [IAsset(takerToken), IAsset(makerToken)];


        uint256 numSamples = takerTokenAmounts.length;
        makerTokenAmounts = new uint256[](numSamples);

        for (uint256 i = 0; i < numSamples; i++) {
            IBalancerV2Vault.BatchSwapStep[] memory swapSteps = _createSwapStep(poolInfo, takerTokenAmounts[i], true);
            IBalancerV2Vault.FundManagement memory swapFunds = _createSwapFunds();

            try
                vault.queryBatchSwap
                {gas: BALANCER_CALL_GAS}
                (
                    swapKind,
                    swapSteps,
                    swapAssets,
                    swapFunds
                ) returns (int256[] memory amounts)
            {
                // Break early if there are 0 or negative amounts
                if (amounts[0] <= 0) {
                    break;
                }
                makerTokenAmounts[i] = uint256(amounts[0]);
            } catch (bytes memory) {
                // Swallow failures, leaving all results as zero.
                break;
            }
        }
    }

    /// @dev Sample buy quotes from Balancer V2.
    /// @param poolAddress Address of the Balancer pool to query.
    /// @param takerToken Address of the taker token (what to sell).
    /// @param makerToken Address of the maker token (what to buy).
    /// @param makerTokenAmounts Maker token buy amount for each sample.
    /// @return takerTokenAmounts Taker amounts sold at each maker token
    ///         amount.
    //function sampleBuysFromBalancerV2(
        //address poolAddress,
        //address takerToken,
        //address makerToken,
        //uint256[] memory makerTokenAmounts
    //)
        //public
        //view
        //returns (uint256[] memory takerTokenAmounts)
    //{
        //uint256 numSamples = makerTokenAmounts.length;
        //takerTokenAmounts = new uint256[](numSamples);

        //for (uint256 i = 0; i < numSamples; i++) {
            //try
                //pool.calcInGivenOut
                    //{gas: BALANCER_CALL_GAS}
                    //(
                        //poolState.takerTokenBalance,
                        //poolState.takerTokenWeight,
                        //poolState.makerTokenBalance,
                        //poolState.makerTokenWeight,
                        //makerTokenAmounts[i],
                        //poolState.swapFee
                    //)
                //returns (uint256 amount)
            //{
                //takerTokenAmounts[i] = amount;
                //// Break early if there are 0 amounts
                //if (takerTokenAmounts[i] == 0) {
                    //break;
                //}
            //} catch (bytes memory) {
                //// Swallow failures, leaving all results as zero.
                //break;
            //}
        //}
    //}

    function _createSwapStep(
        BalancerV2PoolInfo memory poolInfo,
        uint256 amount,
        bool isSelling
    )
        private
        returns (IBalancerV2Vault.BatchSwapStep memory)
    {
        return IBalancerV2Vault.BatchSwapStep({
            poolId: poolInfo.poolId,
            // TODO(kimpers): Is this correct?
            assetInIndex: isSelling ? uint256(1) : uint256(0),
            assetOutIndex: isSelling ? uint256(0) : uint256(1),
            amount: amount,
            userData: '0x'
        });
    }

    function _createSwapFunds()
        private
        returns (IBalancerV2Vault.FundManagement memory)
        {
            return IBalancerV2Vault.FundManagement({
                // TODO(kimpers): Is this correct? Should we be using the simulated account here?
                sender: address(this),
                fromInternalBalance: false,
                recipient: payable(address(this)),
                toInternalBalance: false
            });
        }
}