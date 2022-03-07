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

import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";
import "./TestMintableERC20Token.sol";

contract TestPlatypus {
     event PlatypusCalled(
        uint256 value,
        IERC20TokenV06 fromToken,
        IERC20TokenV06 toToken,
        uint256 sellAmount,
        uint256 minAmountOut
    );

    uint256 public buyAmount;
    IERC20TokenV06 public sellToken;
    TestMintableERC20Token public buyToken;


    constructor(
        IERC20TokenV06 sellToken_,
        TestMintableERC20Token buyToken_,
        uint256 buyAmount_
    )
        public
        payable
    {
        sellToken = sellToken_;
        buyToken = buyToken_;
        buyAmount = buyAmount_;
    }

    receive() external payable {}
}