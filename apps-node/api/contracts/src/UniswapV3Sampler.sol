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

import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";

import "./UniswapV3Common.sol";
import "./interfaces/IMultiQuoter.sol";

contract UniswapV3Sampler is UniswapV3Common {
    IMultiQuoter private constant multiQuoter = IMultiQuoter(0x5555555555555555555555555555555555555556);

    /// @dev Sample sell quotes from UniswapV3.
    /// @param factory UniswapV3 Factory contract.
    /// @param path Token route. Should be takerToken -> makerToken (at most two hops).
    /// @param takerTokenAmounts Taker token sell amount for each sample.
    /// @return uniswapPaths The encoded uniswap path for each sample.
    /// @return uniswapGasUsed Estimated amount of gas used
    /// @return makerTokenAmounts Maker amounts bought at each taker token amount.
    function sampleSellsFromUniswapV3(
        address factory,
        address[] memory path,
        uint256[] memory takerTokenAmounts
    )
        public
        returns (bytes[] memory uniswapPaths, uint256[] memory uniswapGasUsed, uint256[] memory makerTokenAmounts)
    {
        address[][] memory poolPaths = getPoolPaths(factory, path);

        makerTokenAmounts = new uint256[](takerTokenAmounts.length);
        uniswapPaths = new bytes[](takerTokenAmounts.length);
        uniswapGasUsed = new uint256[](takerTokenAmounts.length);

        for (uint256 i = 0; i < poolPaths.length; ++i) {
            if (!isValidPoolPath(poolPaths[i])) {
                continue;
            }

            bytes memory uniswapPath = toUniswapPath(path, poolPaths[i]);

            uint256[] memory amountsOut;
            uint256[] memory gasEstimates;

            try multiQuoter.quoteExactMultiInput(factory, uniswapPath, takerTokenAmounts) {} catch (
                bytes memory reason
            ) {
                bool success;
                (success, amountsOut, gasEstimates) = decodeMultiSwapRevert(reason);

                if (!success) {
                    continue;
                }

                for (uint256 j = 0; j < amountsOut.length; ++j) {
                    if (amountsOut[j] == 0) {
                        break;
                    }

                    if (makerTokenAmounts[j] < amountsOut[j]) {
                        makerTokenAmounts[j] = amountsOut[j];
                        uniswapPaths[j] = uniswapPath;
                        uniswapGasUsed[j] = gasEstimates[j];
                    } else if (makerTokenAmounts[j] == amountsOut[j] && uniswapGasUsed[j] > gasEstimates[j]) {
                        uniswapPaths[j] = uniswapPath;
                        uniswapGasUsed[j] = gasEstimates[j];
                    }
                }
            }
        }
    }

    /// @dev Sample buy quotes from UniswapV3.
    /// @param factory UniswapV3 Factory contract.
    /// @param path Token route. Should be takerToken -> makerToken (at most two hops).
    /// @param makerTokenAmounts Maker token buy amount for each sample.
    /// @return uniswapPaths The encoded uniswap path for each sample.
    /// @return uniswapGasUsed Estimated amount of gas used
    /// @return takerTokenAmounts Taker amounts sold at each maker token amount.
    function sampleBuysFromUniswapV3(
        address factory,
        address[] memory path,
        uint256[] memory makerTokenAmounts
    )
        public
        returns (bytes[] memory uniswapPaths, uint256[] memory uniswapGasUsed, uint256[] memory takerTokenAmounts)
    {
        address[] memory reversedPath = reverseAddressPath(path);
        address[][] memory poolPaths = getPoolPaths(factory, reversedPath);

        takerTokenAmounts = new uint256[](makerTokenAmounts.length);
        uniswapPaths = new bytes[](makerTokenAmounts.length);
        uniswapGasUsed = new uint256[](makerTokenAmounts.length);

        for (uint256 i = 0; i < poolPaths.length; ++i) {
            if (!isValidPoolPath(poolPaths[i])) {
                continue;
            }

            bytes memory uniswapPath = toUniswapPath(reversedPath, poolPaths[i]);

            uint256[] memory amountsIn;
            uint256[] memory gasEstimates;

            try multiQuoter.quoteExactMultiOutput(factory, uniswapPath, makerTokenAmounts) {} catch (
                bytes memory reason
            ) {
                bool success;
                (success, amountsIn, gasEstimates) = decodeMultiSwapRevert(reason);

                if (!success) {
                    continue;
                }

                for (uint256 j = 0; j < amountsIn.length; ++j) {
                    if (amountsIn[j] == 0) {
                        break;
                    }

                    if (takerTokenAmounts[j] == 0 || takerTokenAmounts[j] > amountsIn[j]) {
                        takerTokenAmounts[j] = amountsIn[j];
                        uniswapPaths[j] = toUniswapPath(path, reverseAddressPath(poolPaths[i]));
                        uniswapGasUsed[j] = gasEstimates[j];
                    } else if (takerTokenAmounts[j] == amountsIn[j] && uniswapGasUsed[j] > gasEstimates[j]) {
                        uniswapPaths[j] = toUniswapPath(path, reverseAddressPath(poolPaths[i]));
                        uniswapGasUsed[j] = gasEstimates[j];
                    }
                }
            }
        }
    }
}
