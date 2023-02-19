// SPDX-License-Identifier: Apache-2.0
/*
  Copyright 2023 ZeroEx Intl.
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

import "@0x/contracts-erc20/src/v06/LibERC20TokenV06.sol";
import "@0x/contracts-erc20/src/IERC20Token.sol";

interface ISolidlyRouter {
    function swapExactTokensForTokensSimple(
        uint256 amountIn,
        uint256 amountOutMin,
        address tokenFrom,
        address tokenTo,
        bool stable,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

contract MixinSolidly {
    using LibERC20TokenV06 for IERC20Token;

    function _tradeSolidly(
        IERC20Token sellToken,
        IERC20Token buyToken,
        uint256 sellAmount,
        bytes memory bridgeData
    ) internal returns (uint256 boughtAmount) {
        (ISolidlyRouter router, bool stable) = abi.decode(bridgeData, (ISolidlyRouter, bool));
        sellToken.approveIfBelow(address(router), sellAmount);

        boughtAmount = router.swapExactTokensForTokensSimple(
            sellAmount,
            0,
            address(sellToken),
            address(buyToken),
            stable,
            address(this),
            block.timestamp + 1
        )[1];
    }
}
