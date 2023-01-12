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

import "./ApproximateBuys.sol";
import "./interfaces/IShell.sol";
import "./SamplerUtils.sol";


contract ShellSampler is
    SamplerUtils,
    ApproximateBuys
{

    struct ShellInfo {
        address poolAddress;
    }

    /// @dev Default gas limit for Shell calls.
    uint256 constant private DEFAULT_CALL_GAS = 300e3; // 300k

    /// @dev Sample sell quotes from the Shell pool contract
    /// @param pool Address of the Shell pool contract
    /// @param takerToken Address of the taker token (what to sell).
    /// @param makerToken Address of the maker token (what to buy).
    /// @param takerTokenAmounts Taker token sell amount for each sample.
    /// @return makerTokenAmounts Maker amounts bought at each taker token
    ///         amount.
    function sampleSellsFromShell(
        address pool,
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
                IShell(pool).viewOriginSwap
                    {gas: DEFAULT_CALL_GAS}
                    (takerToken, makerToken, takerTokenAmounts[i])
                returns (uint256 amount)
            {
                makerTokenAmounts[i] = amount;
            } catch (bytes memory) {
                // Swallow failures, leaving all results as zero.
                break;
            }
        }
    }

    /// @dev Sample buy quotes from Shell pool contract
    /// @param pool Address of the Shell pool contract
    /// @param takerToken Address of the taker token (what to sell).
    /// @param makerToken Address of the maker token (what to buy).
    /// @param makerTokenAmounts Maker token buy amount for each sample.
    /// @return takerTokenAmounts Taker amounts sold at each maker token
    ///         amount.
    function sampleBuysFromShell(
        address pool,
        address takerToken,
        address makerToken,
        uint256[] memory makerTokenAmounts
    )
        public
        view
        returns (uint256[] memory takerTokenAmounts)
    {
        return _sampleApproximateBuys(
            ApproximateBuyQuoteOpts({
                makerTokenData: abi.encode(makerToken, pool),
                takerTokenData: abi.encode(takerToken, pool),
                getSellQuoteCallback: _sampleSellForApproximateBuyFromShell
            }),
            makerTokenAmounts
        );
    }

    function _sampleSellForApproximateBuyFromShell(
        bytes memory takerTokenData,
        bytes memory makerTokenData,
        uint256 sellAmount
    )
        private
        view
        returns (uint256 buyAmount)
    {
        (address takerToken, address pool) = abi.decode(takerTokenData, (address, address));
        (address makerToken) = abi.decode(makerTokenData, (address));

        try
            this.sampleSellsFromShell
                (pool, takerToken, makerToken, _toSingleValueArray(sellAmount))
            returns (uint256[] memory amounts)
        {
            return amounts[0];
        } catch (bytes memory) {
            // Swallow failures, leaving all results as zero.
            return 0;
        }
    }
}
