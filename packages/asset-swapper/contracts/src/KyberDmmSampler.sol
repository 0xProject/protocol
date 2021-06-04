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

import "@0x/contracts-zero-ex/contracts/src/transformers/bridges/mixins/MixinKyberDmm.sol";
import "./SwapRevertSampler.sol";
interface IKyberDmmFactory {

    function getPoolAtIndex(address token0, address token1, uint256 index)
        external
        view
        returns (address);
}


contract KyberDmmSampler is
    MixinKyberDmm,
    SwapRevertSampler
{
    /// @dev Gas limit for KyberDmm calls.
    uint256 constant private KYBER_DMM_CALL_GAS = 150e3; // 150k

    function sampleSwapFromKyberDmm(
        address sellToken,
        address buyToken,
        bytes memory bridgeData,
        uint256 takerTokenAmount
    )
        external
        returns (uint256)
    {
        return _tradeKyberDmm(
            IERC20TokenV06(buyToken),
            takerTokenAmount,
            bridgeData
        );
    }

    /// @dev Sample sell quotes from KyberDmm.
    /// @param router Router to look up tokens and amounts
    /// @param path Token route. Should be takerToken -> makerToken
    /// @param takerTokenAmounts Taker token sell amount for each sample.
    /// @return pools The pool addresses involved in the multi path trade
    /// @return gasUsed gas consumed in each sample sell
    /// @return makerTokenAmounts Maker amounts bought at each taker token
    ///         amount.
    function sampleSellsFromKyberDmm(
        address router,
        address[] memory path,
        uint256[] memory takerTokenAmounts
    )
        public
        returns (
            address[] memory pools,
            uint256[] memory gasUsed,
            uint256[] memory makerTokenAmounts
        )
    {
        pools = _getKyberDmmPools(router, path);
        if (pools.length == 0) {
            return (pools, gasUsed, makerTokenAmounts);
        }

        (gasUsed, makerTokenAmounts) = _sampleSwapQuotesRevert(
            SwapRevertSamplerQuoteOpts({
                sellToken: path[0],
                buyToken: path[path.length - 1],
                bridgeData: abi.encode(router, pools, path),
                getSwapQuoteCallback: this.sampleSwapFromKyberDmm
            }),
            takerTokenAmounts
        );
    }

    /// @dev Sample buy quotes from KyberDmm.
    /// @param router Router to look up tokens and amounts
    /// @param path Token route. Should be takerToken -> makerToken.
    /// @param makerTokenAmounts Maker token buy amount for each sample.
    /// @return pools The pool addresses involved in the multi path trade
    /// @return gasUsed gas consumed in each sample sell
    /// @return takerTokenAmounts Taker amounts sold at each maker token
    ///         amount.
    function sampleBuysFromKyberDmm(
        address router,
        address[] memory path,
        uint256[] memory makerTokenAmounts
    )
        public
        returns (
            address[] memory pools,
            uint256[] memory gasUsed,
            uint256[] memory takerTokenAmounts
        )
    {
        pools = _getKyberDmmPools(router, path);
        if (pools.length == 0) {
            return (pools, gasUsed, takerTokenAmounts);
        }

        address[] memory reversedPath = new address[](path.length);
        for (uint256 i = 0; i < path.length; ++i) {
            reversedPath[i] = path[path.length - i - 1];
        }
        address[] memory reversedPools = _getKyberDmmPools(router, reversedPath);
        (gasUsed, takerTokenAmounts) = _sampleSwapApproximateBuys(
            SwapRevertSamplerBuyQuoteOpts({
                sellToken: path[0],
                buyToken: path[path.length - 1],
                sellTokenData: abi.encode(router, pools, path),
                buyTokenData: abi.encode(router, reversedPools, reversedPath),
                getSwapQuoteCallback: this.sampleSwapFromKyberDmm
            }),
            makerTokenAmounts
        );
    }

    function _getKyberDmmPools(
        address router,
        address[] memory path
    )
        private
        view
        returns (address[] memory pools)
    {
        pools = new address[](path.length - 1);
        IKyberDmmFactory factory = IKyberDmmFactory(IKyberDmmRouter(router).factory());
        for (uint256 i = 0; i < pools.length; i++) {
            // Currently only supporting the first pool found at the index
            try
                factory.getPoolAtIndex
                    {gas: KYBER_DMM_CALL_GAS}
                    (path[i], path[i + 1], 0)
                returns (address pool)
            {
                pools[i] = pool;
            } catch (bytes memory) {
                return new address[](0);
            }
        }
    }
}
