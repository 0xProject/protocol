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

// import "./interfaces/ISmoothy.sol";
import "./ApproximateBuys.sol";
import "./SamplerUtils.sol";
import "./interfaces/ISmoothy.sol";

contract SmoothySampler is
    SamplerUtils,
    ApproximateBuys
{
    /// @dev Information for sampling from smoothy sources.
    struct SmoothyInfo {
        address poolAddress;
        bytes4 sellQuoteFunctionSelector;
        bytes4 buyQuoteFunctionSelector;
    }

    /// @dev Base gas limit for Smoothy calls.
    uint256 constant private SMOOTHY_CALL_GAS = 600e3;

    /// @dev Sample sell quotes from Smoothy.
    /// @param smoothyInfo Smoothy information specific to this token pair.
    /// @param fromTokenIdx Index of the taker token (what to sell).
    /// @param toTokenIdx Index of the maker token (what to buy).
    /// @param takerTokenAmounts Taker token sell amount for each sample.
    /// @return makerTokenAmounts Maker amounts bought at each taker token
    ///         amount.
    function sampleSellsFromSmoothy(
        SmoothyInfo memory smoothyInfo,
        int128 fromTokenIdx,
        int128 toTokenIdx,
        uint256[] memory takerTokenAmounts
    )
        public
        view
        returns (uint256[] memory makerTokenAmounts)
    {
        // Basically a Curve fork

        // Smoothy only keep a percentage of its tokens available in reserve
        uint256 poolReserveMakerAmount = ISmoothy(smoothyInfo.poolAddress).getBalance(uint256(toTokenIdx)) -
                                         ISmoothy(smoothyInfo.poolAddress)._yBalances(uint256(toTokenIdx));
        (, , , uint256 decimals) = ISmoothy(smoothyInfo.poolAddress).getTokenStats(uint256(toTokenIdx));
        poolReserveMakerAmount = poolReserveMakerAmount/(10**(18-decimals));

        uint256 numSamples = takerTokenAmounts.length;
        makerTokenAmounts = new uint256[](numSamples);
        for (uint256 i = 0; i < numSamples; i++) {
            (bool didSucceed, bytes memory resultData) =
                smoothyInfo.poolAddress.staticcall.gas(SMOOTHY_CALL_GAS)(
                    abi.encodeWithSelector(
                        smoothyInfo.sellQuoteFunctionSelector,
                        fromTokenIdx,
                        toTokenIdx,
                        takerTokenAmounts[i]
                    ));
            uint256 buyAmount = 0;
            if (didSucceed) {
                buyAmount = abi.decode(resultData, (uint256));
            }

            // Make sure the quoted buyAmount is available in the pool reserve
            if (buyAmount >= poolReserveMakerAmount) {
                // Assign pool reserve amount for all higher samples to break early
                for (uint256 j = i; j < numSamples; j++) {
                    makerTokenAmounts[j] = poolReserveMakerAmount;
                }
                break;
            } else {
                makerTokenAmounts[i] = buyAmount;
            }

            // Break early if there are 0 amounts
            if (makerTokenAmounts[i] == 0) {
                break;
            }
        }
    }

    /// @dev Sample buy quotes from Smoothy.
    /// @param smoothyInfo Smoothy information specific to this token pair.
    /// @param fromTokenIdx Index of the taker token (what to sell).
    /// @param toTokenIdx Index of the maker token (what to buy).
    /// @param makerTokenAmounts Maker token buy amount for each sample.
    /// @return takerTokenAmounts Taker amounts sold at each maker token
    ///         amount.
    function sampleBuysFromSmoothy(
        SmoothyInfo memory smoothyInfo,
        int128 fromTokenIdx,
        int128 toTokenIdx,
        uint256[] memory makerTokenAmounts
    )
        public
        view
        returns (uint256[] memory takerTokenAmounts)
    {
        // Buys not supported so approximate it.
        return _sampleApproximateBuys(
            ApproximateBuyQuoteOpts({
                makerTokenData: abi.encode(toTokenIdx, smoothyInfo),
                takerTokenData: abi.encode(fromTokenIdx, smoothyInfo),
                getSellQuoteCallback: _sampleSellForApproximateBuyFromSmoothy
            }),
            makerTokenAmounts
        );
    }

    function _sampleSellForApproximateBuyFromSmoothy(
        bytes memory takerTokenData,
        bytes memory makerTokenData,
        uint256 sellAmount
    )
        private
        view
        returns (uint256 buyAmount)
    {
        (int128 takerTokenIdx, SmoothyInfo memory smoothyInfo) =
            abi.decode(takerTokenData, (int128, SmoothyInfo));
        (int128 makerTokenIdx) =
            abi.decode(makerTokenData, (int128));
        (bool success, bytes memory resultData) =
            address(this).staticcall(abi.encodeWithSelector(
                this.sampleSellsFromSmoothy.selector,
                smoothyInfo,
                takerTokenIdx,
                makerTokenIdx,
                _toSingleValueArray(sellAmount)
            ));
        if (!success) {
            return 0;
        }
        // solhint-disable-next-line indent
        return abi.decode(resultData, (uint256[]))[0];
    }
}
