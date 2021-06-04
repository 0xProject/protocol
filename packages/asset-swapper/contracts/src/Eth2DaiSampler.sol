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

import "@0x/contracts-zero-ex/contracts/src/transformers/bridges/mixins/MixinOasis.sol";
import "./SwapRevertSampler.sol";


contract Eth2DaiSampler is
    MixinOasis,
    SwapRevertSampler
{

    function sampleSwapFromOasis(
        address sellToken,
        address buyToken,
        bytes memory bridgeData,
        uint256 takerTokenAmount
    )
        external
        returns (uint256)
    {
        return _tradeOasis(
            IERC20TokenV06(sellToken),
            IERC20TokenV06(buyToken),
            takerTokenAmount,
            bridgeData
        );
    }

    /// @dev Sample sell quotes from Eth2Dai/Oasis.
    /// @param router Address of the Eth2Dai/Oasis contract
    /// @param takerToken Address of the taker token (what to sell).
    /// @param makerToken Address of the maker token (what to buy).
    /// @param takerTokenAmounts Taker token sell amount for each sample.
    /// @return gasUsed gas consumed in each sample sell
    /// @return makerTokenAmounts Maker amounts bought at each taker token
    ///         amount.
    function sampleSellsFromEth2Dai(
        address router,
        address takerToken,
        address makerToken,
        uint256[] memory takerTokenAmounts
    )
        public
        returns (uint256[] memory gasUsed, uint256[] memory makerTokenAmounts)
    {
        (gasUsed, makerTokenAmounts) = _sampleSwapQuotesRevert(
            SwapRevertSamplerQuoteOpts({
                sellToken: takerToken,
                buyToken: makerToken,
                bridgeData: abi.encode(router),
                getSwapQuoteCallback: this.sampleSwapFromOasis
            }),
            takerTokenAmounts
        );
    }

    /// @dev Sample buy quotes from Eth2Dai/Oasis.
    /// @param router Address of the Eth2Dai/Oasis contract
    /// @param takerToken Address of the taker token (what to sell).
    /// @param makerToken Address of the maker token (what to buy).
    /// @param takerTokenAmounts Maker token sell amount for each sample.
    /// @return gasUsed gas consumed in each sample sell
    /// @return takerTokenAmounts Taker amounts sold at each maker token
    ///         amount.
    function sampleBuysFromEth2Dai(
        address router,
        address takerToken,
        address makerToken,
        uint256[] memory makerTokenAmounts
    )
        public
        returns (uint256[] memory gasUsed, uint256[] memory takerTokenAmounts)
    {
        (gasUsed, takerTokenAmounts) = _sampleSwapApproximateBuys(
            SwapRevertSamplerBuyQuoteOpts({
                sellToken: takerToken,
                buyToken: makerToken,
                sellTokenData: abi.encode(router),
                buyTokenData: abi.encode(router),
                getSwapQuoteCallback: this.sampleSwapFromOasis
            }),
            makerTokenAmounts
        );
    }
}
