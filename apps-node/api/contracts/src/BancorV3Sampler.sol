// SPDX-License-Identifier: Apache-2.0
/*

  Copyright 2022 ZeroEx Intl.

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

import "./interfaces/IBancorV3.sol";

contract BancorV3Sampler {
    /// @dev Gas limit for BancorV3 calls.
    uint256 private constant BancorV3_CALL_GAS = 150e3; // 150k

    address public constant ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    /// @dev Sample sell quotes from BancorV3.
    /// @param weth The WETH contract address
    /// @param router Router to look up tokens and amounts
    /// @param path Token route. Should be takerToken -> makerToken
    /// @param takerTokenAmounts Taker token sell amount for each sample.
    /// @return makerTokenAmounts Maker amounts bought at each taker token
    ///         amount.
    function sampleSellsFromBancorV3(
        address weth,
        address router,
        address[] memory path,
        uint256[] memory takerTokenAmounts
    ) public view returns (uint256[] memory makerTokenAmounts) {
        uint256 numSamples = takerTokenAmounts.length;
        makerTokenAmounts = new uint256[](numSamples);

        if (path[0] == weth) {
            path[0] = ETH;
        }
        if (path[1] == weth) {
            path[1] = ETH;
        }

        for (uint256 i = 0; i < numSamples; i++) {
            try IBancorV3(router).tradeOutputBySourceAmount(path[0], path[1], takerTokenAmounts[i]) returns (
                uint256 amount
            ) {
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

    /// @dev Sample buy quotes from BancorV3.
    /// @param weth The WETH contract address
    /// @param router Router to look up tokens and amounts
    /// @param path Token route. Should be takerToken -> makerToken.
    /// @param makerTokenAmounts Maker token buy amount for each sample.
    /// @return takerTokenAmounts Taker amounts sold at each maker token
    ///         amount.
    function sampleBuysFromBancorV3(
        address weth,
        address router,
        address[] memory path,
        uint256[] memory makerTokenAmounts
    ) public view returns (uint256[] memory takerTokenAmounts) {
        uint256 numSamples = makerTokenAmounts.length;
        takerTokenAmounts = new uint256[](numSamples);

        if (path[0] == weth) {
            path[0] = ETH;
        }
        if (path[1] == weth) {
            path[1] = ETH;
        }

        for (uint256 i = 0; i < numSamples; i++) {
            try IBancorV3(router).tradeInputByTargetAmount(path[0], path[1], makerTokenAmounts[i]) returns (
                uint256 amount
            ) {
                takerTokenAmounts[i] = amount;
                // Break early if there are 0 amounts
                if (takerTokenAmounts[i] == 0) {
                    break;
                }
            } catch (bytes memory) {
                // Swallow failures, leaving all results as zero.
                break;
            }
        }
    }
}
