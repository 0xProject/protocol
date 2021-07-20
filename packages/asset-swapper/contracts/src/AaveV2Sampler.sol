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

import "@0x/contracts-zero-ex/contracts/src/transformers/bridges/mixins/MixinAaveV2.sol";
import "./SwapRevertSampler.sol";

contract AaveV2Sampler is
    MixinAaveV2,
    SwapRevertSampler
{

    function sampleSwapFromAaveV2(
        address sellToken,
        address buyToken,
        bytes memory bridgeData,
        uint256 takerTokenAmount
    )
        external
        returns (uint256)
    {
        return _tradeAaveV2(
            sellToken,
            buyToken,
            takerTokenAmount,
            bridgeData
        );
    }

    /// @dev Sample sell quotes from Aave
    function sampleSellsFromAaveV2(
        address lendingPool,
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
                bridgeData: abi.encode(lendingPool),
                getSwapQuoteCallback: this.sampleSwapFromAaveV2
            }),
            takerTokenAmounts
        );
    }

    function sampleBuysFromAaveV2(
        address lendingPool,
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
                sellTokenData: abi.encode(lendingPool),
                buyTokenData: abi.encode(lendingPool),
                getSwapQuoteCallback: this.sampleSwapFromAaveV2
            }),
            makerTokenAmounts
        );
    }
}
