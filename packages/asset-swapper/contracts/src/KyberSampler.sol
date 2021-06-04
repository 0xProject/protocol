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

import "./interfaces/IKyberNetwork.sol";
import "@0x/contracts-zero-ex/contracts/src/transformers/bridges/mixins/MixinKyber.sol";
import "./SwapRevertSampler.sol";

contract KyberSampler is
    MixinKyber,
    SwapRevertSampler
{

    /// @dev Gas limit for Kyber calls.
    uint256 constant private KYBER_CALL_GAS = 500e3; // 500k
    /// @dev Kyber ETH pseudo-address.
    address constant internal KYBER_ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    constructor(IEtherTokenV06 weth)
        public
        MixinKyber(weth)
    { }

    struct KyberSamplerOpts {
        uint256 reserveOffset;
        address hintHandler;
        address networkProxy;
        address weth;
        bytes hint;
    }

    function sampleSwapFromKyber(
        address sellToken,
        address buyToken,
        bytes memory bridgeData,
        uint256 takerTokenAmount
    )
        external
        returns (uint256)
    {
        KyberSamplerOpts memory opts = abi.decode(bridgeData, (KyberSamplerOpts));
        return _tradeKyberInternal(
            // these are Immutable in MixinKyber, since they are only set in constructor they must be passed in
            IERC20TokenV06(KYBER_ETH_ADDRESS),
            IEtherTokenV06(opts.weth),
            IERC20TokenV06(sellToken),
            IERC20TokenV06(buyToken),
            takerTokenAmount,
            abi.encode(opts.networkProxy, opts.hint)
        );
    }

    /// @dev Sample sell quotes from Kyber.
    /// @param opts KyberSamplerOpts The nth reserve
    /// @param takerToken Address of the taker token (what to sell).
    /// @param makerToken Address of the maker token (what to buy).
    /// @param takerTokenAmounts Taker token sell amount for each sample.
    /// @return reserveId The id of the reserve found at reserveOffset
    /// @return hint The hint for the selected reserve
    /// @return gasUsed Gas consumed per sample.
    /// @return makerTokenAmounts Maker amounts bought at each taker token amount.
    function sampleSellsFromKyberNetwork(
        KyberSamplerOpts memory opts,
        address takerToken,
        address makerToken,
        uint256[] memory takerTokenAmounts
    )
        public
        returns (
            bytes32 reserveId,
            bytes memory hint,
            uint256[] memory gasUsed,
            uint256[] memory makerTokenAmounts
        )
    {
        reserveId = _getNextReserveId(opts, takerToken, makerToken);
        if (reserveId == 0x0) {
            return (reserveId, hint, gasUsed, makerTokenAmounts);
        }
        opts.hint = this.encodeKyberHint(opts, reserveId, takerToken, makerToken);
        hint = opts.hint;

        (gasUsed, makerTokenAmounts) = _sampleSwapQuotesRevert(
            SwapRevertSamplerQuoteOpts({
                sellToken: takerToken,
                buyToken: makerToken,
                bridgeData: abi.encode(opts),
                getSwapQuoteCallback: this.sampleSwapFromKyber
            }),
            takerTokenAmounts
        );
    }

    /// @dev Sample buy quotes from Kyber.
    /// @param opts KyberSamplerOpts The nth reserve
    /// @param takerToken Address of the taker token (what to sell).
    /// @param makerToken Address of the maker token (what to buy).
    /// @param makerTokenAmounts Maker token buy amount for each sample.
    /// @return reserveId The id of the reserve found at reserveOffset
    /// @return hint The hint for the selected reserve
    /// @return gasUsed Gas consumed for each sample.
    /// @return takerTokenAmounts Taker amounts sold at each maker token amount.
    function sampleBuysFromKyberNetwork(
        KyberSamplerOpts memory opts,
        address takerToken,
        address makerToken,
        uint256[] memory makerTokenAmounts
    )
        public
        returns (
            bytes32 reserveId,
            bytes memory hint,
            uint256[] memory gasUsed,
            uint256[] memory takerTokenAmounts
        )
    {
        reserveId = _getNextReserveId(opts, takerToken, makerToken);
        if (reserveId == 0x0) {
            return (reserveId, hint, gasUsed, takerTokenAmounts);
        }
        opts.hint = this.encodeKyberHint(opts, reserveId, takerToken, makerToken);
        hint = opts.hint;

        (gasUsed, takerTokenAmounts) = _sampleSwapApproximateBuys(
            SwapRevertSamplerBuyQuoteOpts({
                sellToken: takerToken,
                buyToken: makerToken,
                sellTokenData: abi.encode(opts),
                buyTokenData: abi.encode(opts),
                getSwapQuoteCallback: this.sampleSwapFromKyber
            }),
            makerTokenAmounts
        );
    }

    function encodeKyberHint(
        KyberSamplerOpts memory opts,
        bytes32 reserveId,
        address takerToken,
        address makerToken
    )
        public
        view
        returns (bytes memory hint)
    {
        // Build a hint selecting the single reserve
        IKyberHintHandler kyberHint = IKyberHintHandler(opts.hintHandler);

        // All other reserves should be ignored with this hint
        bytes32[] memory selectedReserves = new bytes32[](1);
        selectedReserves[0] = reserveId;
        uint256[] memory emptySplits = new uint256[](0);

        if (takerToken == opts.weth) {
            // ETH to Token
            try
                kyberHint.buildEthToTokenHint
                    {gas: KYBER_CALL_GAS}
                    (
                        makerToken,
                        IKyberHintHandler.TradeType.MaskIn,
                        selectedReserves,
                        emptySplits
                    )
                returns (bytes memory result)
            {
                return result;
            } catch (bytes memory) {
                // Swallow failures, leaving all results as zero.
            }
        } else if (makerToken == opts.weth) {
            // Token to ETH
            try
                kyberHint.buildTokenToEthHint
                    {gas: KYBER_CALL_GAS}
                    (
                        takerToken,
                        IKyberHintHandler.TradeType.MaskIn,
                        selectedReserves,
                        emptySplits
                    )
                returns (bytes memory result)
            {
                return result;
            } catch (bytes memory) {
                // Swallow failures, leaving all results as zero.
            }

        } else {
            // Token to Token
            // We use the same reserve both ways
            try
                kyberHint.buildTokenToTokenHint
                    {gas: KYBER_CALL_GAS}
                    (
                        takerToken,
                        IKyberHintHandler.TradeType.MaskIn,
                        selectedReserves,
                        emptySplits,
                        makerToken,
                        IKyberHintHandler.TradeType.MaskIn,
                        selectedReserves,
                        emptySplits
                    )
                returns (bytes memory result)
            {
                return result;
            } catch (bytes memory) {
                // Swallow failures, leaving all results as zero.
            }
        }
    }

    function _getNextReserveId(
        KyberSamplerOpts memory opts,
        address takerToken,
        address makerToken
    )
        internal
        view
        returns (bytes32 reserveId)
    {
        // Fetch the registered reserves for this pair
        IKyberHintHandler kyberHint = IKyberHintHandler(opts.hintHandler);
        (bytes32[] memory reserveIds, ,) = kyberHint.getTradingReserves(
            takerToken == opts.weth ? KYBER_ETH_ADDRESS : takerToken,
            makerToken == opts.weth ? KYBER_ETH_ADDRESS : makerToken,
            true,
            new bytes(0) // empty hint
        );

        if (opts.reserveOffset >= reserveIds.length) {
            return 0x0;
        }

        reserveId = reserveIds[opts.reserveOffset];
        // Ignore Kyber Bridged Reserves (0xbb)
        if (uint256(reserveId >> 248) == 0xbb) {
            return 0x0;
        }

        return reserveId;
    }
}
