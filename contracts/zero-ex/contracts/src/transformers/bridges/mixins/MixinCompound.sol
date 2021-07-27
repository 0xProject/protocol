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
import "@0x/contracts-erc20/contracts/src/v06/IEtherTokenV06.sol";
import "@0x/contracts-utils/contracts/src/v06/LibSafeMathV06.sol";


// Minimal CToken/CEther interfaces
interface ICToken {
    function mint(uint mintAmountInUnderlying) external returns (uint);
    function redeem(uint redeemTokensInCtokens) external returns (uint);
}
interface ICEther {
  function mint() payable external;
  function redeem(uint redeemTokens) external returns (uint);
}

contract MixinCompound {
    using LibERC20TokenV06 for IERC20TokenV06;
    using LibSafeMathV06 for uint256;

    IEtherTokenV06 private immutable WETH;

    constructor(IEtherTokenV06 weth)
        public
    {
        WETH = weth;
    }

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
        (address cTokenAddress) = abi.decode(bridgeData, (address));
        uint256 beforeBalance = buyToken.balanceOf(address(this));


        if (address(buyToken) == cTokenAddress) {
          sellToken.approveIfBelow(
              cTokenAddress,
              sellAmount
          );
          if (address(sellToken) == address(WETH)) {
            // ETH/WETH -> cETH
            ICEther cETH = ICEther(cTokenAddress);
            // Compound expects ETH to be sent with mint call
            WETH.withdraw(sellAmount);
            // NOTE: cETH mint will revert on failure instead of returning a status code
            cETH.mint{value: sellAmount}();
          } else {
            // Token -> cToken
            ICToken cToken = ICToken(cTokenAddress);
            require(cToken.mint(sellAmount) == COMPOUND_SUCCESS_CODE, "MixinCompound/FAILED_TO_MINT_CTOKEN");
          }
          return buyToken.balanceOf(address(this)).safeSub(beforeBalance);
        } else if (address(sellToken) == address(cTokenAddress)) {
          if (address(buyToken) == address(WETH)) {
            // cETH -> ETH/WETH
            ICEther cETH = ICEther(cTokenAddress);
            require(cETH.redeem(sellAmount) == COMPOUND_SUCCESS_CODE, "MixinCompound/FAILED_TO_REDEEM_CETHER");
            uint256 receivedEtherBalance = address(this).balance;
            WETH.deposit{value: receivedEtherBalance}();
          } else {
            ICToken cToken = ICToken(cTokenAddress);
            require(cToken.redeem(sellAmount) == COMPOUND_SUCCESS_CODE, "MixinCompound/FAILED_TO_REDEEM_CTOKEN");
          }
          return buyToken.balanceOf(address(this)).safeSub(beforeBalance);
        }

        revert("MixinCompound/UNSUPPORTED_TOKEN_PAIR");
    }
}
