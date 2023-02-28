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

interface IWstETH {
    function getWstETHByStETH(uint256 _stETHAmount) external view returns (uint256);

    function getStETHByWstETH(uint256 _wstETHAmount) external view returns (uint256);
}

contract LidoSampler is SamplerUtils {
    struct LidoInfo {
        address stEthToken;
        address wethToken;
        address wstEthToken;
    }

    /// @dev Sample sell quotes from Lido
    /// @param lidoInfo Info regarding a specific Lido deployment
    /// @param takerToken Address of the taker token (what to sell).
    /// @param makerToken Address of the maker token (what to buy).
    /// @param takerTokenAmounts Taker token sell amount for each sample.
    /// @return makerTokenAmounts Maker amounts bought at each taker token
    ///         amount.
    function sampleSellsFromLido(
        LidoInfo memory lidoInfo,
        address takerToken,
        address makerToken,
        uint256[] memory takerTokenAmounts
    ) public view returns (uint256[] memory) {
        _assertValidPair(makerToken, takerToken);

        if (takerToken == lidoInfo.wethToken && makerToken == address(lidoInfo.stEthToken)) {
            // Minting stETH is always 1:1 therefore we can just return the same amounts back.
            return takerTokenAmounts;
        }

        return _sampleSellsForWrapped(lidoInfo, takerToken, makerToken, takerTokenAmounts);
    }

    /// @dev Sample buy quotes from Lido.
    /// @param lidoInfo Info regarding a specific Lido deployment
    /// @param takerToken Address of the taker token (what to sell).
    /// @param makerToken Address of the maker token (what to buy).
    /// @param makerTokenAmounts Maker token buy amount for each sample.
    /// @return takerTokenAmounts Taker amounts sold at each maker token
    ///         amount.
    function sampleBuysFromLido(
        LidoInfo memory lidoInfo,
        address takerToken,
        address makerToken,
        uint256[] memory makerTokenAmounts
    ) public view returns (uint256[] memory) {
        if (takerToken == lidoInfo.wethToken && makerToken == address(lidoInfo.stEthToken)) {
            // Minting stETH is always 1:1 therefore we can just return the same amounts back.
            return makerTokenAmounts;
        }

        // Swap out `makerToken` and `takerToken` and re-use `_sampleSellsForWrapped`.
        return _sampleSellsForWrapped(lidoInfo, makerToken, takerToken, makerTokenAmounts);
    }

    function _sampleSellsForWrapped(
        LidoInfo memory lidoInfo,
        address takerToken,
        address makerToken,
        uint256[] memory takerTokenAmounts
    ) private view returns (uint256[] memory) {
        IWstETH wstETH = IWstETH(lidoInfo.wstEthToken);
        uint256 numSamples = takerTokenAmounts.length;
        uint256[] memory makerTokenAmounts = new uint256[](numSamples);

        if (takerToken == lidoInfo.stEthToken && makerToken == lidoInfo.wstEthToken) {
            for (uint256 i = 0; i < numSamples; i++) {
                makerTokenAmounts[i] = wstETH.getWstETHByStETH(takerTokenAmounts[i]);
            }
            return makerTokenAmounts;
        }

        if (takerToken == lidoInfo.wstEthToken && makerToken == lidoInfo.stEthToken) {
            for (uint256 i = 0; i < numSamples; i++) {
                makerTokenAmounts[i] = wstETH.getStETHByWstETH(takerTokenAmounts[i]);
            }
            return makerTokenAmounts;
        }

        // Returns 0 values.
        return makerTokenAmounts;
    }
}
