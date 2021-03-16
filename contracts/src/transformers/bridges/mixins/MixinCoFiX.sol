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

pragma solidity ^0.6.5;
pragma experimental ABIEncoderV2;

import "@0x/contracts-erc20/contracts/src/v06/LibERC20TokenV06.sol";
import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";
import "@0x/contracts-erc20/contracts/src/v06/IEtherTokenV06.sol";


interface ICoFiXRouter {
    // msg.value = fee
    function swapExactTokensForETH(
        address token,
        uint amountIn,
        uint amountOutMin,
        address to,
        address rewardTo,
        uint deadline
    ) external payable returns (uint _amountIn, uint _amountOut);

    // msg.value = amountIn + fee
    function swapExactETHForTokens(
        address token,
        uint amountIn,
        uint amountOutMin,
        address to,
        address rewardTo,
        uint deadline
    ) external payable returns (uint _amountIn, uint _amountOut);
}

interface ICoFiXPair {

    function swapWithExact(address outToken, address to)
        external
        payable
        returns (
            uint amountIn,
            uint amountOut,
            uint oracleFeeChange,
            uint256[4] memory tradeInfo
        );
}

contract MixinCoFiX {

    using LibERC20TokenV06 for IERC20TokenV06;

    function _tradeCoFiX(
        IERC20TokenV06 sellToken,
        IERC20TokenV06 buyToken,
        uint256 sellAmount,
        bytes memory bridgeData
    )
        internal
        returns (uint256 boughtAmount)
    {
        (uint256 fee, ICoFiXPair pool) = abi.decode(bridgeData, (uint256, ICoFiXPair));
        // Transfer tokens into the pool
        LibERC20TokenV06.compatTransfer(
            sellToken,
            address(pool),
            sellAmount
        );
        // Call the swap exact with the tokens now in the pool
        // pay the NEST Oracle fee with ETH
        (/* In */, boughtAmount, , ) = pool.swapWithExact{value: fee}(
            address(buyToken),
            address(this)
        );

        return boughtAmount;
    }
}
