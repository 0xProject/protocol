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

import "./UniswapV3SamplerCommon.sol";

contract UniswapV3SellSampler is UniswapV3SamplerCommon
{
    /// @dev Sample sell quotes from UniswapV3.
    /// @param quoter UniswapV3 Quoter contract.
    /// @param path Token route. Should be takerToken -> makerToken
    /// @param takerTokenAmounts Taker token sell amount for each sample.
    /// @return uniswapPaths The encoded uniswap path for each sample.
    /// @return makerTokenAmounts Maker amounts bought at each taker token
    ///         amount.
    function sampleSells(
        IUniswapV3Quoter quoter,
        IERC20TokenV06[] memory path,
        uint256[] memory takerTokenAmounts
    )
        public
        returns (
            bytes[] memory uniswapPaths,
            uint256[] memory makerTokenAmounts
        )
    {
        IUniswapV3Pool[][] memory poolPaths =
            _getValidPoolPaths(quoter.factory(), path, 0);

        makerTokenAmounts = new uint256[](takerTokenAmounts.length);
        uniswapPaths = new bytes[](takerTokenAmounts.length);

        for (uint256 i = 0; i < takerTokenAmounts.length; ++i) {
            // Pick the best result from all the paths.
            bytes memory topUniswapPath;
            uint256 topBuyAmount = 0;
            for (uint256 j = 0; j < poolPaths.length; ++j) {
                bytes memory uniswapPath = _toUniswapPath(path, poolPaths[j]);
                try
                    quoter.quoteExactInput
                        { gas: QUOTE_GAS }
                        (uniswapPath, takerTokenAmounts[i])
                        returns (uint256 buyAmount)
                {
                    if (topBuyAmount <= buyAmount) {
                        topBuyAmount = buyAmount;
                        topUniswapPath = uniswapPath;
                    }
                } catch { }
            }
            // Break early if we can't complete the buys.
            if (topBuyAmount == 0) {
                break;
            }
            makerTokenAmounts[i] = topBuyAmount;
            uniswapPaths[i] = topUniswapPath;
        }
    }
}
