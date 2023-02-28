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

contract AaveV2Sampler {
    /// @dev Sample sell quotes from AaveV2.
    /// @param aToken address of the aToken.
    /// @param underlyingToken address of the underlying collateral token.
    /// @param takerToken address of the taker token (what to sell).
    /// @param makerToken address of the maker token (what to buy).
    /// @param takerTokenAmounts taker token buy amounts for each sample
    /// @return makerTokenAmounts maker amounts bought at each taker token
    ///         amount.
    function sampleSellsFromAaveV2(
        address aToken,
        address underlyingToken,
        address takerToken,
        address makerToken,
        uint256[] memory takerTokenAmounts
    ) public pure returns (uint256[] memory makerTokenAmounts) {
        uint256 numSamples = takerTokenAmounts.length;
        makerTokenAmounts = new uint256[](numSamples);

        if (takerToken == underlyingToken && makerToken == aToken) {
            return takerTokenAmounts;
        }

        // Aave V2 balances sometimes have a rounding error causing
        // 1 fewer wei from being outputted during unwraps
        if (takerToken == aToken && makerToken == underlyingToken) {
            for (uint256 i = 0; i < numSamples; i++) {
                takerTokenAmounts[i] -= 1;
            }
            return takerTokenAmounts;
        }
    }

    /// @dev Sample buy quotes from AaveV2.
    /// @param aToken address of the aToken.
    /// @param underlyingToken address of the underlying collateral token.
    /// @param takerToken address of the taker token (what to sell).
    /// @param makerToken address of the maker token (what to buy).
    /// @param makerTokenAmounts maker token sell amounts for each sample
    /// @return takerTokenAmounts taker amounts bought at each maker token
    ///         amount.
    function sampleBuysFromAaveV2(
        address aToken,
        address underlyingToken,
        address takerToken,
        address makerToken,
        uint256[] memory makerTokenAmounts
    ) public pure returns (uint256[] memory takerTokenAmounts) {
        uint256 numSamples = makerTokenAmounts.length;
        takerTokenAmounts = new uint256[](numSamples);

        if (takerToken == underlyingToken && makerToken == aToken) {
            return makerTokenAmounts;
        }

        // Aave V2 balances sometimes have a rounding error causing
        // 1 fewer wei from being outputted during unwraps
        if (takerToken == aToken && makerToken == underlyingToken) {
            for (uint256 i = 0; i < numSamples; i++) {
                makerTokenAmounts[i] -= 1;
            }
            return makerTokenAmounts;
        }
    }
}
