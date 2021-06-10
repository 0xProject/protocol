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

interface IStEth {
    function getSharesByPooledEth(uint256 _ethAmount) external view returns (uint256);
}

contract LidoSampler is SamplerUtils {
    address constant private ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    /// @dev Sample sell quotes from Lido
    /// @param stETHToken Address of the Lido stETH token
    /// @param wethToken Address of Wrapped Ethereum
    /// @param takerToken Address of the taker token (what to sell).
    /// @param makerToken Address of the maker token (what to buy).
    /// @param takerTokenAmounts Taker token sell amount for each sample.
    /// @return makerTokenAmounts Maker amounts bought at each taker token
    ///         amount.
    function sampleSellsFromLido(
        IStEth stETHToken,
        address wethToken,
        address takerToken,
        address makerToken,
        uint256[] memory takerTokenAmounts
    )
        public
        pure
        returns (uint256[] memory makerTokenAmounts)
    {
        _assertValidPair(makerToken, takerToken);

        uint256 numSamples = takerTokenAmounts.length;
        makerTokenAmounts = new uint256[](numSamples);
        if ((takerToken != ETH_ADDRESS && takerToken != wethToken) || makerToken != address(stETHToken)) {
            // Return 0 values if not selling ETH for stETH
            return makerTokenAmounts;
        }

        for (uint256 i = 0; i < numSamples; i++) {
            // Minting stETH is always 1:1
            makerTokenAmounts[i] = takerTokenAmounts[i];
        }
    }

    /// @dev Sample buy quotes from Lido.
    /// @param stETHToken Address of the Lido stETH token
    /// @param wethToken Address of Wrapped Ethereum
    /// @param takerToken Address of the taker token (what to sell).
    /// @param makerToken Address of the maker token (what to buy).
    /// @param makerTokenAmounts Maker token buy amount for each sample.
    /// @return takerTokenAmounts Taker amounts sold at each maker token
    ///         amount.
    function sampleBuysFromLido(
        address stETHToken,
        address wethToken,
        address takerToken,
        address makerToken,
        uint256[] memory makerTokenAmounts
    )
        public
        pure
        returns (uint256[] memory takerTokenAmounts)
    {
        _assertValidPair(makerToken, takerToken);

        uint256 numSamples = makerTokenAmounts.length;
        takerTokenAmounts = new uint256[](numSamples);
        if ((takerToken != ETH_ADDRESS && takerToken != wethToken)|| makerToken != stETHToken) {
            // Return 0 values if not buying stETH for ETH
            return makerTokenAmounts;
        }

        for (uint256 i = 0; i < numSamples; i++) {
            // Minting stETH is always 1:1
            takerTokenAmounts[i] = makerTokenAmounts[i];
        }
    }

}
