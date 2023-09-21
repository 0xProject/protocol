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

interface IMaverickV1Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        address pool;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint256 sqrtPriceLimitD18;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

contract MixinMaverickV1 {
    using LibERC20TokenV06 for IERC20Token;

    function _tradeMaverickV1(
        IERC20Token sellToken,
        IERC20Token buyToken,
        uint256 sellAmount,
        bytes memory bridgeData
    ) internal returns (uint256 boughtAmount) {
        (IMaverickV1Router router, address pool) = abi.decode(bridgeData, (IMaverickV1Router, address));

        // Grant the MaverickV1 router an allowance to sell the sellToken
        sellToken.approveIfBelow(address(router), sellAmount);

        boughtAmount = router.exactInputSingle(
            IMaverickV1Router.ExactInputSingleParams({
                tokenIn: address(sellToken),
                tokenOut: address(buyToken),
                pool: pool,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: sellAmount,
                amountOutMinimum: 1,
                sqrtPriceLimitD18: 0
            })
        );
    }
}
