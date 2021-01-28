
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

import "@0x/contracts-erc20/contracts/src/v06/LibERC20TokenV06.sol";

contract UtilitySampler {

    using LibERC20TokenV06 for IERC20TokenV06;

    IERC20TokenV06 private immutable UTILITY_ETH_ADDRESS = IERC20TokenV06(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);

    function getTokenDecimals(IERC20TokenV06[] memory tokens)
        public
        view
        returns (uint256[] memory decimals)
    {
        decimals = new uint256[](tokens.length);
        for (uint256 i = 0; i != tokens.length; i++) {
            decimals[i] = tokens[i] == UTILITY_ETH_ADDRESS
                ? 18
                : tokens[i].compatDecimals();
        }
    }

    function getBalanceOf(IERC20TokenV06[] memory tokens, address account)
        public
        view
        returns (uint256[] memory balances)
    {
        balances = new uint256[](tokens.length);
        for (uint256 i = 0; i != tokens.length; i++) {
            balances[i] = tokens[i] == UTILITY_ETH_ADDRESS
                ? account.balance
                : tokens[i].compatBalanceOf(account);
        }
    }

    function getAllowanceOf(IERC20TokenV06[] memory tokens, address account, address spender)
        public
        view
        returns (uint256[] memory allowances)
    {
        allowances = new uint256[](tokens.length);
        for (uint256 i = 0; i != tokens.length; i++) {
            allowances[i] = tokens[i] == UTILITY_ETH_ADDRESS
                ? 0
                : tokens[i].compatAllowance(account, spender);
        }
    }

    function isContract(address account)
        public
        view
        returns (bool)
    {
        uint256 size;
        assembly { size := extcodesize(account) }
        return size > 0;
    }
}