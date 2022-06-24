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
import "@0x/contracts-utils/contracts/src/v06/LibMathV06.sol";
import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";

interface IUSDi {
    /// @dev Exchange USDC for USDi
    /// @param usdc_amount The amount of USDC to exchange in USDC base units
    function deposit(uint256 usdc_amount) external;

    /// @dev Exchange USDi for USDC
    /// @param usdc_amount The amount of USDC to exchange for in USDC base units
    function withdraw(uint256 usdc_amount) external;

    /// @dev Get address of the reserve for the i-token
    /// @return address of the reserve token
    function reserveAddress() external view returns (address);
}

contract USDiPSMSampler is
    SamplerUtils
{
    using LibSafeMathV06 for uint256;

    /// @dev Gas limit for USDI calls.
    uint256 constant private USDI_PSM_CALL_GAS = 300e3; // 300k
    uint256 constant private ONE_E_TWELVE = 10 ** 12;

    /// @dev Sample sell quotes from USDi PSM
    function sampleSellsFromUSDiPsm(
        address usdiAddress,
        address takerToken,
        address makerToken,
        uint256[] memory takerTokenAmounts
    )
        public
        view
        returns (uint256[] memory makerTokenAmounts)
    {
        _assertValidPair(makerToken, takerToken);

        uint256 numSamples = takerTokenAmounts.length;
        makerTokenAmounts = new uint256[](numSamples);

        if (makerToken != usdiAddress && takerToken != usdiAddress) {
            return makerTokenAmounts;
        }

        for (uint256 i = 0; i < numSamples; i++) {
            uint256 buyAmount = _samplePSMSell(usdiAddress, makerToken, takerToken, takerTokenAmounts[i]);

            if (buyAmount == 0) {
                break;
            }
            makerTokenAmounts[i] = buyAmount;
        }
    }

    function sampleBuysFromUSDiPsm(
        address usdiAddress,
        address takerToken,
        address makerToken,
        uint256[] memory makerTokenAmounts
    )
        public
        view
        returns (uint256[] memory takerTokenAmounts)
    {
        _assertValidPair(makerToken, takerToken);

        uint256 numSamples = makerTokenAmounts.length;
        takerTokenAmounts = new uint256[](numSamples);
        if (makerToken != usdiAddress && takerToken != usdiAddress) {
            return takerTokenAmounts;
        }

        for (uint256 i = 0; i < numSamples; i++) {
            uint256 sellAmount = _samplePSMBuy(usdiAddress, makerToken, takerToken, makerTokenAmounts[i]);

            if (sellAmount == 0) {
                break;
            }

            takerTokenAmounts[i] = sellAmount;
        }

    }

    function _samplePSMSell(address usdiAddress, address makerToken, address takerToken, uint256 takerTokenAmount)
        private
        view
        returns (uint256)
    {

        IUSDi psm = IUSDi(usdiAddress);
        IERC20TokenV06 reserve = IERC20TokenV06(psm.reserveAddress());

        if (takerToken == address(reserve)) {
            // withdrawing usdc
            if(reserve.balanceOf(address(psm)) < takerTokenAmount) {
                return 0;
            }
            return takerTokenAmount.safeMul(ONE_E_TWELVE);
        } else if (makerToken == address(reserve)) {
            // depositing usdc
            return takerTokenAmount.safeDiv(ONE_E_TWELVE);
        }

        return 0;
    }

    function _samplePSMBuy(address usdiAddress, address makerToken, address takerToken, uint256 makerTokenAmount)
        private
        view
        returns (uint256)
    {
        IUSDi psm = IUSDi(usdiAddress);
        IERC20TokenV06 reserve = IERC20TokenV06(psm.reserveAddress());

        if (takerToken == address(reserve)) {
            // depositing USDC to Interest Protocol
            return makerTokenAmount.safeDiv(ONE_E_TWELVE);
        } else if (makerToken == address(reserve)) {
            // withdrawing USDC from Interest Protocol
            if(reserve.balanceOf(address(psm)) < makerTokenAmount) {
                return 0;
            }
            return makerTokenAmount.safeMul(ONE_E_TWELVE);
        }

        return 0;
    }

}
