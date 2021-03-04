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

import "./DeploymentConstants.sol";
import "./interfaces/IKyberNetwork.sol";
import "./ApproximateBuys.sol";
import "./SamplerUtils.sol";


contract KyberSampler is
    DeploymentConstants,
    SamplerUtils,
    ApproximateBuys
{
    /// @dev Gas limit for Kyber calls.
    uint256 constant private KYBER_CALL_GAS = 500e3; // 500k

    struct KyberSamplerOpts {
        uint256 reserveOffset;
        address hintHandler;
        address networkProxy;
        address weth;
        bytes hint;
    }

    /// @dev Sample sell quotes from Kyber.
    /// @param opts KyberSamplerOpts The nth reserve
    /// @param takerToken Address of the taker token (what to sell).
    /// @param makerToken Address of the maker token (what to buy).
    /// @param takerTokenAmounts Taker token sell amount for each sample.
    /// @return reserveId The id of the reserve found at reserveOffset
    /// @return hint The hint for the selected reserve
    /// @return makerTokenAmounts Maker amounts bought at each taker token amount.
    function sampleSellsFromKyberNetwork(
        KyberSamplerOpts memory opts,
        address takerToken,
        address makerToken,
        uint256[] memory takerTokenAmounts
    )
        public
        view
        returns (bytes32 reserveId, bytes memory hint, uint256[] memory makerTokenAmounts)
    {
        _assertValidPair(makerToken, takerToken);
        reserveId = _getNextReserveId(opts, takerToken, makerToken);
        if (reserveId == 0x0) {
            return (reserveId, hint, makerTokenAmounts);
        }
        opts.hint = this.encodeKyberHint(opts, reserveId, takerToken, makerToken);
        hint = opts.hint;

        uint256 numSamples = takerTokenAmounts.length;
        makerTokenAmounts = new uint256[](numSamples);
        for (uint256 i = 0; i < numSamples; i++) {
            uint256 value = this.sampleSellFromKyberNetwork(
                opts,
                takerToken,
                makerToken,
                takerTokenAmounts[i]
            );
            makerTokenAmounts[i] = value;
            // Break early if there are 0 amounts
            if (makerTokenAmounts[i] == 0) {
                break;
            }
        }
    }

    /// @dev Sample buy quotes from Kyber.
    /// @param opts KyberSamplerOpts The nth reserve
    /// @param takerToken Address of the taker token (what to sell).
    /// @param makerToken Address of the maker token (what to buy).
    /// @param makerTokenAmounts Maker token buy amount for each sample.
    /// @return reserveId The id of the reserve found at reserveOffset
    /// @return hint The hint for the selected reserve
    /// @return takerTokenAmounts Taker amounts sold at each maker token amount.
    function sampleBuysFromKyberNetwork(
        KyberSamplerOpts memory opts,
        address takerToken,
        address makerToken,
        uint256[] memory makerTokenAmounts
    )
        public
        view
        returns (bytes32 reserveId, bytes memory hint, uint256[] memory takerTokenAmounts)
    {
        _assertValidPair(makerToken, takerToken);

        reserveId = _getNextReserveId(opts, takerToken, makerToken);
        if (reserveId == 0x0) {
            return (reserveId, hint, takerTokenAmounts);
        }
        opts.hint = this.encodeKyberHint(opts, reserveId, takerToken, makerToken);
        hint = opts.hint;

        takerTokenAmounts = _sampleApproximateBuys(
            ApproximateBuyQuoteOpts({
                makerTokenData: abi.encode(makerToken, opts),
                takerTokenData: abi.encode(takerToken, opts),
                getSellQuoteCallback: _sampleSellForApproximateBuyFromKyber
            }),
            makerTokenAmounts
        );
        return (reserveId, hint, takerTokenAmounts);
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

    function _sampleSellForApproximateBuyFromKyber(
        bytes memory takerTokenData,
        bytes memory makerTokenData,
        uint256 sellAmount
    )
        private
        view
        returns (uint256)
    {
        (address makerToken, KyberSamplerOpts memory opts) =
            abi.decode(makerTokenData, (address, KyberSamplerOpts));
        (address takerToken, ) =
            abi.decode(takerTokenData, (address, KyberSamplerOpts));
        try
            this.sampleSellFromKyberNetwork
                (opts, takerToken, makerToken, sellAmount)
            returns (uint256 amount)
        {
            return amount;
        } catch (bytes memory) {
            // Swallow failures, leaving all results as zero.
            return 0;
        }
    }

    function sampleSellFromKyberNetwork(
        KyberSamplerOpts memory opts,
        address takerToken,
        address makerToken,
        uint256 takerTokenAmount
    )
        public
        view
        returns (uint256 makerTokenAmount)
    {
        // If there is no hint do not continue
        if (opts.hint.length == 0) {
            return 0;
        }

        try
            IKyberNetworkProxy(opts.networkProxy).getExpectedRateAfterFee
                {gas: KYBER_CALL_GAS}
                (
                    takerToken == opts.weth ? KYBER_ETH_ADDRESS : takerToken,
                    makerToken == opts.weth ? KYBER_ETH_ADDRESS : makerToken,
                    takerTokenAmount,
                    0, // fee
                    opts.hint
                )
            returns (uint256 rate)
        {
            uint256 makerTokenDecimals = _getTokenDecimals(makerToken);
            uint256 takerTokenDecimals = _getTokenDecimals(takerToken);
            makerTokenAmount =
                rate *
                takerTokenAmount *
                10 ** makerTokenDecimals /
                10 ** takerTokenDecimals /
                10 ** 18;
            return makerTokenAmount;
        } catch (bytes memory) {
            // Swallow failures, leaving all results as zero.
            return 0;
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
