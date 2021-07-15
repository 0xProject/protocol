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

contract UniswapV3BuySampler is UniswapV3SamplerCommon {
    /// @dev Sample buy quotes from UniswapV3.
    /// @param quoter UniswapV3 Quoter contract.
    /// @param path Token route. Should be takerToken -> makerToken.
    /// @param makerTokenAmounts Maker token buy amount for each sample.
    /// @return uniswapPaths The encoded uniswap path for each sample.
    /// @return takerTokenAmounts Taker amounts sold at each maker token
    ///         amount.
    function sampleBuys(
        IUniswapV3Quoter quoter,
        IERC20TokenV06[] memory path,
        uint256[] memory makerTokenAmounts
    )
        public
        returns (
            bytes[] memory uniswapPaths,
            uint256[] memory takerTokenAmounts
        )
    {
        IUniswapV3Pool[][] memory poolPaths =
            _getValidPoolPaths(quoter.factory(), path, 0);
        IERC20TokenV06[] memory reversedPath = _reverseTokenPath(path);

        takerTokenAmounts = new uint256[](makerTokenAmounts.length);
        uniswapPaths = new bytes[](makerTokenAmounts.length);

        for (uint256 i = 0; i < makerTokenAmounts.length; ++i) {
            // Pick the best result from all the paths.
            bytes memory topUniswapPath;
            uint256 topSellAmount = 0;
            for (uint256 j = 0; j < poolPaths.length; ++j) {
                // quoter requires path to be reversed for buys.
                bytes memory uniswapPath = _toUniswapPath(
                    reversedPath,
                    _reversePoolPath(poolPaths[j])
                );
                try
                    quoter.quoteExactOutput
                        { gas: QUOTE_GAS }
                        (uniswapPath, makerTokenAmounts[i])
                        returns (uint256 sellAmount)
                {
                    if (topSellAmount == 0 || topSellAmount >= sellAmount) {
                        topSellAmount = sellAmount;
                        // But the output path should still be encoded for sells.
                        topUniswapPath = _toUniswapPath(path, poolPaths[j]);
                    }
                } catch {}
            }
            // Break early if we can't complete the buys.
            if (topSellAmount == 0) {
                break;
            }
            takerTokenAmounts[i] = topSellAmount;
            uniswapPaths[i] = topUniswapPath;
        }
    }
}
