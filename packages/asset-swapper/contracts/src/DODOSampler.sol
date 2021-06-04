// SPDX-License-Identifier: Apache-2.0
/*

  Copyright 2020 ZeroEx Intl.

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

import "@0x/contracts-zero-ex/contracts/src/transformers/bridges/mixins/MixinDodo.sol";
import "./SwapRevertSampler.sol";


interface IDODOZoo {
    function getDODO(address baseToken, address quoteToken) external view returns (address);
}

contract DODOSampler is
    MixinDodo,
    SwapRevertSampler
{

    struct DODOSamplerOpts {
        address registry;
        address helper;
    }

    function sampleSwapFromDodo(
        address sellToken,
        address buyToken,
        bytes memory bridgeData,
        uint256 takerTokenAmount
    )
        external
        returns (uint256)
    {
        return _tradeDodo(
            IERC20TokenV06(sellToken),
            takerTokenAmount,
            bridgeData
        );
    }

    /// @dev Sample sell quotes from DODO.
    /// @param opts DODOSamplerOpts DODO Registry and helper addresses
    /// @param takerToken Address of the taker token (what to sell).
    /// @param makerToken Address of the maker token (what to buy).
    /// @param takerTokenAmounts Taker token sell amount for each sample.
    /// @return sellBase whether the bridge needs to sell the base token
    /// @return pool the DODO pool address
    /// @return gasUsed gas consumed in each sample sell
    /// @return makerTokenAmounts Maker amounts bought at each taker token
    ///         amount.
    function sampleSellsFromDODO(
        DODOSamplerOpts memory opts,
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
        pool = IDODOZoo(opts.registry).getDODO(takerToken, makerToken);
        address baseToken;
        // If pool exists we have the correct order of Base/Quote
        if (pool != address(0)) {
            baseToken = takerToken;
            sellBase = true;
        } else {
            pool = IDODOZoo(opts.registry).getDODO(makerToken, takerToken);
            // No pool either direction
            if (address(pool) == address(0)) {
                return (sellBase, pool, gasUsed, makerTokenAmounts);
            }
            baseToken = makerToken;
            sellBase = false;
        }

        (gasUsed, makerTokenAmounts) = _sampleSwapQuotesRevert(
            SwapRevertSamplerQuoteOpts({
                sellToken: takerToken,
                buyToken: makerToken,
                bridgeData: abi.encode(opts.helper, pool, sellBase),
                getSwapQuoteCallback: this.sampleSwapFromDodo
            }),
            takerTokenAmounts
        );
    }

    /// @dev Sample buy quotes from DODO.
    /// @param opts DODOSamplerOpts DODO Registry and helper addresses
    /// @param takerToken Address of the taker token (what to sell).
    /// @param makerToken Address of the maker token (what to buy).
    /// @param makerTokenAmounts Maker token sell amount for each sample.
    /// @return sellBase whether the bridge needs to sell the base token
    /// @return pool the DODO pool address
    /// @return gasUsed gas consumed in each sample sell
    /// @return takerTokenAmounts Taker amounts sold at each maker token
    ///         amount.
    function sampleBuysFromDODO(
        DODOSamplerOpts memory opts,
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
        // Pool is BASE/QUOTE
        // Look up the pool from the taker/maker combination
        pool = IDODOZoo(opts.registry).getDODO(takerToken, makerToken);
        address baseToken;
        // If pool exists we have the correct order of Base/Quote
        if (pool != address(0)) {
            baseToken = takerToken;
            sellBase = true;
        } else {
            // Look up the pool from the maker/taker combination
            pool = IDODOZoo(opts.registry).getDODO(makerToken, takerToken);
            // No pool either direction
            if (address(pool) == address(0)) {
                return (sellBase, pool, gasUsed, takerTokenAmounts);
            }
            baseToken = makerToken;
            sellBase = false;
        }

        (gasUsed, takerTokenAmounts) = _sampleSwapApproximateBuys(
            SwapRevertSamplerBuyQuoteOpts({
                sellToken: takerToken,
                buyToken: makerToken,
                sellTokenData: abi.encode(opts.helper, pool, sellBase),
                buyTokenData: abi.encode(opts.helper, pool, !sellBase),
                getSwapQuoteCallback: this.sampleSwapFromDodo
            }),
            makerTokenAmounts
        );
    }
}
