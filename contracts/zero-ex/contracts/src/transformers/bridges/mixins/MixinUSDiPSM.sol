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

pragma solidity ^0.6.5;
pragma experimental ABIEncoderV2;

import "@0x/contracts-erc20/contracts/src/v06/LibERC20TokenV06.sol";
import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";
import "@0x/contracts-utils/contracts/src/v06/LibSafeMathV06.sol";

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

contract MixinUSDiPSM {

    using LibERC20TokenV06 for IERC20TokenV06;
    using LibSafeMathV06 for uint256;


    uint256 constant private USDI_PSM_CALL_GAS = 300e3; // 300k
    uint256 constant private ONE_E_TWELVE = 10 ** 12;

    function _tradeUSDiPsm(
        IERC20TokenV06 sellToken,
        IERC20TokenV06 buyToken,
        uint256 sellAmount,
        bytes memory bridgeData
    )
        internal
        returns (uint256 boughtAmount)
    {
        address usdiAddress = bytesToAddress(bridgeData);
        IUSDi psm = IUSDi(usdiAddress);

        uint256 beforeBalance = buyToken.balanceOf(address(this));
        IERC20TokenV06 reserve = IERC20TokenV06(psm.reserveAddress());

        if (address(sellToken) == address(reserve)) {
            sellToken.approveIfBelow(
                usdiAddress,
                sellAmount
            );

            psm.deposit(sellAmount);
        } else if (address(buyToken) == address(reserve)) {
            sellToken.approveIfBelow(
                usdiAddress,
                sellAmount
            );
            psm.withdraw(sellAmount.safeDiv(ONE_E_TWELVE));
        }

        return buyToken.balanceOf(address(this)).safeSub(beforeBalance);
    }

    function bytesToAddress(bytes memory xs) public pure returns (address addr) {
        assembly {
             addr := mload(add(add(xs, 32), 0))
       }
    }
}



