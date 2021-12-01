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

import "./SamplerUtils.sol";
import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";

// Minimal CToken interface
interface ICToken {
    function mint(uint mintAmount) external returns (uint);
    function redeem(uint redeemTokens) external returns (uint);
    function redeemUnderlying(uint redeemAmount) external returns (uint);
    function exchangeRateStored() external view returns (uint);
    function decimals() external view returns (uint8);
}

contract CompoundSampler is SamplerUtils {
    uint256 constant private EXCHANGE_RATE_SCALE = 1e10;

    function sampleSellsFromCompound(
        ICToken cToken,
        IERC20TokenV06 takerToken,
        IERC20TokenV06 makerToken,
        uint256[] memory takerTokenAmounts
    )
        public
        view
        returns (uint256[] memory makerTokenAmounts)
    {
        uint256 numSamples = takerTokenAmounts.length;
        makerTokenAmounts = new uint256[](numSamples);
        // Exchange rate is scaled by 1 * 10^(18 - 8 + Underlying Token Decimals
        uint256 exchangeRate = cToken.exchangeRateStored();
        uint256 cTokenDecimals = uint256(cToken.decimals());

        if (address(makerToken) == address(cToken)) {
            // mint
            for (uint256 i = 0; i < numSamples; i++) {
                makerTokenAmounts[i] = (takerTokenAmounts[i] * EXCHANGE_RATE_SCALE * 10 ** cTokenDecimals) / exchangeRate;
            }

        } else if (address(takerToken) == address(cToken)) {
            // redeem
            for (uint256 i = 0; i < numSamples; i++) {
                makerTokenAmounts[i] = (takerTokenAmounts[i] * exchangeRate) / (EXCHANGE_RATE_SCALE * 10 ** cTokenDecimals);
            }
        }
    }

    function sampleBuysFromCompound(
        ICToken cToken,
        IERC20TokenV06 takerToken,
        IERC20TokenV06 makerToken,
        uint256[] memory makerTokenAmounts
    )
        public
        view
        returns (uint256[] memory takerTokenAmounts)
    {
        uint256 numSamples = makerTokenAmounts.length;
        takerTokenAmounts = new uint256[](numSamples);
        // Exchange rate is scaled by 1 * 10^(18 - 8 + Underlying Token Decimals
        uint256 exchangeRate = cToken.exchangeRateStored();
        uint256 cTokenDecimals = uint256(cToken.decimals());

        if (address(makerToken) == address(cToken)) {
            // mint
            for (uint256 i = 0; i < numSamples; i++) {
                takerTokenAmounts[i] = makerTokenAmounts[i] * exchangeRate / (EXCHANGE_RATE_SCALE * 10 ** cTokenDecimals);
            }
        } else if (address(takerToken) == address(cToken)) {
            // redeem
            for (uint256 i = 0; i < numSamples; i++) {
                takerTokenAmounts[i] = (makerTokenAmounts[i] * EXCHANGE_RATE_SCALE * 10 ** cTokenDecimals)/exchangeRate;
            }
        }
    }
}
