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

import "./SamplerUtils.sol";
import "./interfaces/IFirebird.sol";

contract FirebirdSampler is
    SamplerUtils
{
    /// @dev Gas limit for Firebird calls.
    uint256 constant private FIREBIRD_CALL_GAS = 120e3; // 120k

    /// @dev Sample sell quotes from Firebird.
    /// @param pool Address of the pool contract
    /// @param takerToken Address of the taker token (what to sell).
    /// @param makerToken Address of the maker token (what to buy).
    /// @param takerTokenAmounts Taker token sell amount for each sample.
    /// @return makerTokenAmounts Maker amounts bought at each taker token
    ///         amount.
    function sampleSellsFromFirebird(
        address pool,
        address takerToken,
        address makerToken,
        uint256[] memory takerTokenAmounts
    )
        public
        view
        returns (uint256[] memory makerTokenAmounts)
    {
        _assertValidPair(makerToken, takerToken);
        IFirebirdFormula formula = IFirebirdFormula(IFirebirdPool(pool).formula());
        uint256 numSamples = takerTokenAmounts.length;
        makerTokenAmounts = new uint256[](numSamples);
        for (uint256 i = 0; i < numSamples; i++) {
            try
                formula.getAmountsOut
                    {gas: FIREBIRD_CALL_GAS}
                    (takerToken, makerToken, takerTokenAmounts[i], _toSingleAddressArray(pool))
                returns (uint256[] memory amounts)
            {
                makerTokenAmounts[i] = amounts[1]; // element 0 is input, element 1 is output
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

    /// @dev Sample buy quotes from Firebird.
    /// @param pool Address of the pool contract
    /// @param takerToken Address of the taker token (what to sell).
    /// @param makerToken Address of the maker token (what to buy).
    /// @param takerTokenAmounts Taker token sell amount for each sample.
    /// @return makerTokenAmounts Maker amounts bought at each taker token
    ///         amount.
    function sampleBuysFromFirebird(
        address pool,
        address takerToken,
        address makerToken,
        uint256[] memory takerTokenAmounts
    )
        public
        view
        returns (uint256[] memory makerTokenAmounts)
    {
        _assertValidPair(makerToken, takerToken);
        IFirebirdFormula formula = IFirebirdFormula(IFirebirdPool(pool).formula());
        uint256 numSamples = takerTokenAmounts.length;
        makerTokenAmounts = new uint256[](numSamples);
        for (uint256 i = 0; i < numSamples; i++) {
            try
                formula.getAmountsIn
                    {gas: FIREBIRD_CALL_GAS}
                    (makerToken, takerToken, takerTokenAmounts[i], _toSingleAddressArray(pool))
                returns (uint256[] memory amounts)
            {
                makerTokenAmounts[i] = amounts[0];
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
}
