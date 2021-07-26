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


// Minimal CToken interface
interface ICToken {
    function mint(uint mintAmountInUnderlying) external returns (uint);
    function redeem(uint redeemTokens) external returns (uint);
}

contract MixinCompound {
    using LibERC20TokenV06 for IERC20TokenV06;
    using LibSafeMathV06 for uint256;

    uint256 constant private COMPOUND_SUCCESS_CODE = 0;

    function _tradeCompound(
        IERC20TokenV06 sellToken,
        IERC20TokenV06 buyToken,
        uint256 sellAmount,
        bytes memory bridgeData
    )
        internal
        returns (uint256)
    {
        (ICToken cToken) = abi.decode(bridgeData, (ICToken));
        uint256 beforeBalance = buyToken.balanceOf(address(this));


        if (address(buyToken) == address(cToken)) {
          sellToken.approveIfBelow(
              address(cToken),
              sellAmount
          );
          // TODO: handle (W)ETH -> cETH
          require(cToken.mint(sellAmount) == COMPOUND_SUCCESS_CODE, "MixinCompound/FAILED_TO_MINT_CTOKEN");
          return buyToken.balanceOf(address(this)).safeSub(beforeBalance);
        } else if (address(sellToken) == address(cToken)) {
          require(cToken.redeem(sellAmount) == COMPOUND_SUCCESS_CODE, "MixinCompound/FAILED_TO_REDEEM_CTOKEN");
          return buyToken.balanceOf(address(this)).safeSub(beforeBalance);
        }

        revert("MixinCompound/UNSUPPORTED_TOKEN_PAIR");
    }
}
