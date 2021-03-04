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

import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";
import "../src/fixins/FixinTokenSpender.sol";

contract TestFixinTokenSpender is
    FixinTokenSpender
{
    constructor() public {}

    function transferERC20Tokens(
        IERC20TokenV06 token,
        address owner,
        address to,
        uint256 amount
    )
        external
    {
        _transferERC20Tokens(
            token,
            owner,
            to,
            amount
        );
    }

    event FallbackCalled(
        address token,
        address owner,
        address to,
        uint256 amount
    );

    function getSpendableERC20BalanceOf(
        IERC20TokenV06 token,
        address owner
    )
        external
        view
        returns (uint256)
    {
        return _getSpendableERC20BalanceOf(token, owner);
    }
}
