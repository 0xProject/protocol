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

import "./interfaces/IUniswapV2Router01.sol";
import "@0x/contracts-zero-ex/contracts/src/transformers/bridges/mixins/MixinUniswapV2.sol";
import "./SwapRevertSampler.sol";


contract UniswapV2Sampler is
    MixinUniswapV2,
    SwapRevertSampler
{

    function sampleSwapFromUniswapV2(
        address sellToken,
        address buyToken,
        bytes memory bridgeData,
        uint256 takerTokenAmount
    )
        external
        returns (uint256)
    {
        return _tradeUniswapV2(
            IERC20TokenV06(buyToken),
            takerTokenAmount,
            bridgeData
        );
    }

    /// @dev Sample sell quotes from UniswapV2.
    /// @param router Router to look up tokens and amounts
    /// @param path Token route. Should be takerToken -> makerToken
    /// @param takerTokenAmounts Taker token sell amount for each sample.
    /// @return gasUsed gas consumed for each sample amount
    /// @return makerTokenAmounts Maker amounts bought at each taker token
    ///         amount.
    function sampleSellsFromUniswapV2(
        address router,
        address[] memory path,
        uint256[] memory takerTokenAmounts
    )
        public
        returns (uint256[] memory gasUsed, uint256[] memory makerTokenAmounts)
    {
        (gasUsed, makerTokenAmounts) = _sampleSwapQuotesRevert(
            SwapRevertSamplerQuoteOpts({
                sellToken: path[0],
                buyToken: path[path.length - 1],
                bridgeData: abi.encode(router, path),
                getSwapQuoteCallback: this.sampleSwapFromUniswapV2
            }),
            takerTokenAmounts
        );
    }

    /// @dev Sample buy quotes from UniswapV2.
    /// @param router Router to look up tokens and amounts
    /// @param path Token route. Should be takerToken -> makerToken.
    /// @param makerTokenAmounts Maker token buy amount for each sample.
    /// @return gasUsed gas consumed for each sample amount
    /// @return takerTokenAmounts Taker amounts sold at each maker token
    ///         amount.
    function sampleBuysFromUniswapV2(
        address router,
        address[] memory path,
        uint256[] memory makerTokenAmounts
    )
        public
        returns (uint256[] memory gasUsed, uint256[] memory takerTokenAmounts)
    {
        address[] memory reversedPath = new address[](path.length);
        for (uint256 i = 0; i < path.length; ++i) {
            reversedPath[i] = path[path.length - i - 1];
        }

        (gasUsed, takerTokenAmounts) = _sampleSwapApproximateBuys(
            SwapRevertSamplerBuyQuoteOpts({
                sellToken: path[0],
                buyToken: path[path.length - 1],
                sellTokenData: abi.encode(router, path),
                buyTokenData: abi.encode(router, reversedPath),
                getSwapQuoteCallback: this.sampleSwapFromUniswapV2
            }),
            makerTokenAmounts
        );
    }
}
