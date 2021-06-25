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

import "@0x/contracts-zero-ex/contracts/src/transformers/bridges/mixins/MixinDodoV2.sol";
import "./SwapRevertSampler.sol";

interface IDODOV2Registry {
    function getDODOPool(address baseToken, address quoteToken)
        external
        view
        returns (address[] memory machines);
}

contract DODOV2Sampler is
    MixinDodoV2,
    SwapRevertSampler
{

    /// @dev Gas limit for DODO V2 calls.
    uint256 constant private DODO_V2_CALL_GAS = 300e3; // 300k

    function sampleSwapFromDodoV2(
        address sellToken,
        address buyToken,
        bytes memory bridgeData,
        uint256 takerTokenAmount
    )
        external
        returns (uint256)
    {
        return _tradeDodoV2(
            IERC20TokenV06(sellToken),
            takerTokenAmount,
            bridgeData
        );
    }

    /// @dev Sample sell quotes from DODO V2.
    /// @param registry Address of the registry to look up.
    /// @param offset offset index for the pool in the registry.
    /// @param takerToken Address of the taker token (what to sell).
    /// @param makerToken Address of the maker token (what to buy).
    /// @param takerTokenAmounts Taker token sell amount for each sample.
    /// @return sellBase whether the bridge needs to sell the base token
    /// @return pool the DODO pool address
    /// @return gasUsed gas consumed in each sample sell
    /// @return makerTokenAmounts Maker amounts bought at each taker token
    ///         amount.
    function sampleSellsFromDODOV2(
        address registry,
        uint256 offset,
        address takerToken,
        address makerToken,
        uint256[] memory takerTokenAmounts
    )
        public
        returns (
            bool sellBase,
            address pool,
            uint256[] memory gasUsed,
            uint256[] memory makerTokenAmounts
        )
    {
        (pool, sellBase) = _getNextDODOV2Pool(registry, offset, takerToken, makerToken);
        if (pool == address(0)) {
            return (sellBase, pool, gasUsed, makerTokenAmounts);
        }

        (gasUsed, makerTokenAmounts) = _sampleSwapQuotesRevert(
            SwapRevertSamplerQuoteOpts({
                sellToken: takerToken,
                buyToken: makerToken,
                bridgeData: abi.encode(pool, sellBase),
                getSwapQuoteCallback: this.sampleSwapFromDodoV2
            }),
            takerTokenAmounts
        );
    }

    /// @dev Sample buy quotes from DODO.
    /// @param registry Address of the registry to look up.
    /// @param offset offset index for the pool in the registry.
    /// @param takerToken Address of the taker token (what to sell).
    /// @param makerToken Address of the maker token (what to buy).
    /// @param makerTokenAmounts Maker token sell amount for each sample.
    /// @return sellBase whether the bridge needs to sell the base token
    /// @return pool the DODO pool address
    /// @return gasUsed gas consumed in each sample sell
    /// @return takerTokenAmounts Taker amounts sold at each maker token
    ///         amount.
    function sampleBuysFromDODOV2(
        address registry,
        uint256 offset,
        address takerToken,
        address makerToken,
        uint256[] memory makerTokenAmounts
    )
        public
        returns (
            bool sellBase,
            address pool,
            uint256[] memory gasUsed,
            uint256[] memory takerTokenAmounts
        )
    {
        (pool, sellBase) = _getNextDODOV2Pool(registry, offset, takerToken, makerToken);
        if (pool == address(0)) {
            return (sellBase, pool, gasUsed, takerTokenAmounts);
        }

        (gasUsed, takerTokenAmounts) = _sampleSwapApproximateBuys(
            SwapRevertSamplerBuyQuoteOpts({
                sellToken: takerToken,
                buyToken: makerToken,
                sellTokenData: abi.encode(pool, sellBase),
                buyTokenData: abi.encode(pool, !sellBase),
                getSwapQuoteCallback: this.sampleSwapFromDodoV2
            }),
            makerTokenAmounts
        );
    }

    function _getNextDODOV2Pool(
        address registry,
        uint256 offset,
        address takerToken,
        address makerToken
    )
        internal
        view
        returns (address machine, bool sellBase)
    {
        // Query in base -> quote direction, if a pool is found then we are selling the base
        address[] memory machines = IDODOV2Registry(registry).getDODOPool(takerToken, makerToken);
        sellBase = true;
        if (machines.length == 0) {
            // Query in quote -> base direction, if a pool is found then we are selling the quote
            machines = IDODOV2Registry(registry).getDODOPool(makerToken, takerToken);
            sellBase = false;
        }

        if (offset >= machines.length) {
            return (address(0), false);
        }

        machine = machines[offset];
    }

}
