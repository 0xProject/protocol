// SPDX-License-Identifier: Apache-2.0
/*

  Copyright 2020 ZeroEx Intl.

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

import "@0x/contracts-utils/contracts/src/v06/LibBytesV06.sol";
import "@0x/contracts-zero-ex/contracts/src/vendor/ILiquidityProvider.sol";
import "./ApproximateBuys.sol";
import "./SamplerUtils.sol";


contract LiquidityProviderSampler is
    SamplerUtils,
    ApproximateBuys
{
    /// @dev Default gas limit for liquidity provider calls.
    uint256 constant private DEFAULT_CALL_GAS = 400e3; // 400k

    /// @dev Sample sell quotes from an arbitrary on-chain liquidity provider.
    /// @param providerAddress Address of the liquidity provider.
    /// @param takerToken Address of the taker token (what to sell).
    /// @param makerToken Address of the maker token (what to buy).
    /// @param takerTokenAmounts Taker token sell amount for each sample.
    /// @return makerTokenAmounts Maker amounts bought at each taker token
    ///         amount.
    function sampleSellsFromLiquidityProvider(
        address providerAddress,
        address takerToken,
        address makerToken,
        uint256[] memory takerTokenAmounts
    )
        public
        view
        returns (uint256[] memory makerTokenAmounts)
    {
        // Initialize array of maker token amounts.
        uint256 numSamples = takerTokenAmounts.length;
        makerTokenAmounts = new uint256[](numSamples);

        for (uint256 i = 0; i < numSamples; i++) {
            try
                ILiquidityProvider(providerAddress).getSellQuote
                    {gas: DEFAULT_CALL_GAS}
                    (
                        IERC20TokenV06(takerToken),
                        IERC20TokenV06(makerToken),
                        takerTokenAmounts[i]
                    )
                returns (uint256 amount)
            {
                makerTokenAmounts[i] = amount;
                // Break early if there are 0 amounts
                if (makerTokenAmounts[i] == 0) {
                    break;
                }
            } catch (bytes memory) {
                // Swallow failures, leaving all results as zero.
                break;
            }
        }
    }

    /// @dev Sample buy quotes from an arbitrary on-chain liquidity provider.
    /// @param providerAddress Address of the liquidity provider.
    /// @param takerToken Address of the taker token (what to sell).
    /// @param makerToken Address of the maker token (what to buy).
    /// @param makerTokenAmounts Maker token buy amount for each sample.
    /// @return takerTokenAmounts Taker amounts sold at each maker token
    ///         amount.
    function sampleBuysFromLiquidityProvider(
        address providerAddress,
        address takerToken,
        address makerToken,
        uint256[] memory makerTokenAmounts
    )
        public
        view
        returns (uint256[] memory takerTokenAmounts)
    {
        takerTokenAmounts = _sampleApproximateBuys(
            ApproximateBuyQuoteOpts({
                makerTokenData: abi.encode(makerToken, providerAddress),
                takerTokenData: abi.encode(takerToken, providerAddress),
                getSellQuoteCallback: _sampleSellForApproximateBuyFromLiquidityProvider
            }),
            makerTokenAmounts
        );
    }

    function _sampleSellForApproximateBuyFromLiquidityProvider(
        bytes memory takerTokenData,
        bytes memory makerTokenData,
        uint256 sellAmount
    )
        private
        view
        returns (uint256 buyAmount)
    {
        (address takerToken, address providerAddress) =
            abi.decode(takerTokenData, (address, address));
        (address makerToken) =
            abi.decode(makerTokenData, (address));
        try
            this.sampleSellsFromLiquidityProvider
                {gas: DEFAULT_CALL_GAS}
                (providerAddress, takerToken, makerToken, _toSingleValueArray(sellAmount))
            returns (uint256[] memory amounts)
        {
            return amounts[0];
        } catch (bytes memory) {
            // Swallow failures, leaving all results as zero.
            return 0;
        }
    }
}
