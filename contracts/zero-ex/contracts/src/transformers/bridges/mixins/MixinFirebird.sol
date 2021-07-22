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
import "../IBridgeAdapter.sol";

/*
    Firebird
*/
interface FirebirdRouter {

    /// @dev Swaps an exact amount of input tokens for as many output tokens as possible, along the route determined by the path.
    ///      The first element of path is the input token, the last is the output token, and any intermediate elements represent
    ///      intermediate pairs to trade through (if, for example, a direct pair does not exist).
    /// @param sellToken The address of the token to sell.
    /// @param buyToken The address of the token to buy.
    /// @param amountIn The amount of input tokens to send.
    /// @param amountOutMin The minimum amount of output tokens that must be received for the transaction not to revert.
    /// @param path Array with the liquidity pool addresses for trading sellToken to buyToken. 
    /// @param to Recipient of the output tokens.
    /// @param deadline Unix timestamp after which the transaction will revert.
    /// @return amounts The input token amount and all subsequent output token amounts.
    function swapExactTokensForTokens(
        IERC20TokenV06 sellToken,
        IERC20TokenV06 buyToken,
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
}

contract MixinFirebird {

    using LibERC20TokenV06 for IERC20TokenV06;

    function _tradeFirebird(
        IERC20TokenV06 sellToken,
        IERC20TokenV06 buyToken,
        uint256 sellAmount,
        bytes memory bridgeData
    )
        internal
        returns (uint256 boughtAmount)
    {
        (FirebirdRouter router, address[] memory pools) = abi.decode(bridgeData, (FirebirdRouter, address[]));
        // Grant the router an allowance to sell the first token.
        sellToken.approveIfBelow(address(router), sellAmount);

        uint[] memory amounts = router.swapExactTokensForTokens(
            // Address of token to sell.
            sellToken,
            // Address of token to buy.
            buyToken,
             // Sell the specified amount of tokens we hold.
            sellAmount,
             // Minimum buy amount.
            1,
            // Array with the liquidity pool addresses for trading sellToken to buyToken.
            pools,
            // Recipient is `this`.
            address(this),
            // Expires after this block.
            block.timestamp
        );
        return amounts[amounts.length-1];
    }
}
