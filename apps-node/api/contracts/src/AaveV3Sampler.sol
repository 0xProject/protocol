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

// Minimal Aave V3 L2Encoder interface
interface IL2Encoder {
    /**
     * @notice Encodes supply parameters from standard input to compact representation of 1 bytes32
     * @dev Without an onBehalfOf parameter as the compact calls to L2Pool will use msg.sender as onBehalfOf
     * @param asset The address of the underlying asset to supply
     * @param amount The amount to be supplied
     * @param referralCode referralCode Code used to register the integrator originating the operation, for potential rewards.
     *   0 if the action is executed directly by the user, without any middle-man
     * @return compact representation of supply parameters
     */
    function encodeSupplyParams(address asset, uint256 amount, uint16 referralCode) external view returns (bytes32);

    /**
     * @notice Encodes withdraw parameters from standard input to compact representation of 1 bytes32
     * @dev Without a to parameter as the compact calls to L2Pool will use msg.sender as to
     * @param asset The address of the underlying asset to withdraw
     * @param amount The underlying amount to be withdrawn
     * @return compact representation of withdraw parameters
     */
    function encodeWithdrawParams(address asset, uint256 amount) external view returns (bytes32);
}

contract AaveV3Sampler {
    /// @dev Sample sell quotes from AaveV3.
    /// @param l2Encoder address of the l2 encoder.
    /// @param aToken address of the aToken.
    /// @param underlyingToken address of the underlying collateral token.
    /// @param takerToken address of the taker token (what to sell).
    /// @param makerToken address of the maker token (what to buy).
    /// @param takerTokenAmounts taker token buy amounts for each sample
    /// @return l2Params l2 encoded parameters for each sample
    /// @return makerTokenAmounts maker amounts bought at each taker token
    ///         amount.
    function sampleSellsFromAaveV3(
        address l2Encoder,
        address aToken,
        address underlyingToken,
        address takerToken,
        address makerToken,
        uint256[] memory takerTokenAmounts
    ) public view returns (bytes32[] memory l2Params, uint256[] memory makerTokenAmounts) {
        uint256 numSamples = takerTokenAmounts.length;
        makerTokenAmounts = new uint256[](numSamples);
        l2Params = new bytes32[](numSamples);

        if (
            (takerToken == aToken && makerToken == underlyingToken) ||
            (takerToken == underlyingToken && makerToken == aToken)
        ) {
            makerTokenAmounts = takerTokenAmounts;
            if (l2Encoder == address(0)) {
                return (l2Params, makerTokenAmounts);
            }

            IL2Encoder l2 = IL2Encoder(l2Encoder);
            for (uint256 i = 0; i < numSamples; i++) {
                if (makerToken == aToken) {
                    l2Params[i] = l2.encodeSupplyParams(takerToken, makerTokenAmounts[i], 0);
                } else if (takerToken == aToken) {
                    l2Params[i] = l2.encodeWithdrawParams(makerToken, makerTokenAmounts[i]);
                }
            }
        }
    }

    /// @dev Sample buy quotes from AaveV3.
    /// @param l2Encoder address of the l2 encoder.
    /// @param aToken address of the aToken.
    /// @param underlyingToken address of the underlying collateral token.
    /// @param takerToken address of the taker token (what to sell).
    /// @param makerToken address of the maker token (what to buy).
    /// @param makerTokenAmounts maker token sell amounts for each sample
    /// @return l2Params l2 encoded parameters for each sample
    /// @return takerTokenAmounts taker amounts bought at each maker token
    ///         amount.
    function sampleBuysFromAaveV3(
        address l2Encoder,
        address aToken,
        address underlyingToken,
        address takerToken,
        address makerToken,
        uint256[] memory makerTokenAmounts
    ) public view returns (bytes32[] memory l2Params, uint256[] memory takerTokenAmounts) {
        uint256 numSamples = makerTokenAmounts.length;
        takerTokenAmounts = new uint256[](numSamples);
        l2Params = new bytes32[](numSamples);

        if (
            (takerToken == aToken && makerToken == underlyingToken) ||
            (takerToken == underlyingToken && makerToken == aToken)
        ) {
            takerTokenAmounts = makerTokenAmounts;
            if (l2Encoder == address(0)) {
                return (l2Params, takerTokenAmounts);
            }

            IL2Encoder l2 = IL2Encoder(l2Encoder);
            for (uint256 i = 0; i < numSamples; i++) {
                if (makerToken == aToken) {
                    l2Params[i] = l2.encodeSupplyParams(takerToken, makerTokenAmounts[i], 0);
                } else if (takerToken == aToken) {
                    l2Params[i] = l2.encodeWithdrawParams(makerToken, makerTokenAmounts[i]);
                }
            }
        }
    }
}
