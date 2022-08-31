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

pragma solidity ^0.6;

// ERC20 contract interface
abstract contract IToken {
    /// @dev Query the balance of owner
    /// @param _owner The address from which the balance will be retrieved
    /// @return Balance of owner
    function balanceOf(address _owner) public view virtual returns (uint256);

    /// @param _owner The address of the account owning tokens
    /// @param _spender The address of the account able to transfer the tokens
    /// @return Amount of remaining tokens allowed to spent
    function allowance(address _owner, address _spender) public view virtual returns (uint256);
}

contract BalanceChecker {
    /*
      Check the token balances of wallet-token pairs.
      Pass 0xeee... as a "token" address to get ETH balance.
      Possible error throws:
        - extremely large arrays for user and or tokens (gas cost too high)

      Returns a one-dimensional that's user.length long.
    */
    function balances(address[] calldata users, address[] calldata tokens) external view returns (uint256[] memory) {
        // make sure the users array and tokens array are of equal length
        require(users.length == tokens.length, "users array is a different length than the tokens array");

        uint256[] memory addrBalances = new uint256[](users.length);

        for (uint256 i = 0; i < users.length; i++) {
            if (tokens[i] != address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE)) {
                addrBalances[i] = IToken(tokens[i]).balanceOf(users[i]);
            } else {
                addrBalances[i] = users[i].balance; // ETH balance
            }
        }

        return addrBalances;
    }

    /*
      Check the token balances of wallet-token pairs with a spender contract for an allowance check.
      Pass 0xeee... as a "token" address to get ETH balance.
      Possible error throws:
        - extremely large arrays for user and or tokens (gas cost too high)

      Returns a one-dimensional that's user.length long. It is the lesser of balance and allowance
    */
    function getMinOfBalancesOrAllowances(
        address[] calldata users,
        address[] calldata tokens,
        address spender
    ) external view returns (uint256[] memory) {
        // make sure the users array and tokens array are of equal length
        require(users.length == tokens.length, "users array is a different length than the tokens array");

        uint256[] memory addrBalances = new uint256[](users.length);

        for (uint256 i = 0; i < users.length; i++) {
            if (tokens[i] != address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE)) {
                uint256 balance;
                uint256 allowance;
                balance = IToken(tokens[i]).balanceOf(users[i]);
                allowance = IToken(tokens[i]).allowance(users[i], spender);
                if (allowance < balance) {
                    addrBalances[i] = allowance;
                } else {
                    addrBalances[i] = balance;
                }
            } else {
                addrBalances[i] = users[i].balance; // ETH balance
            }
        }

        return addrBalances;
    }

    /*
      Check the allowances of an array of owner-spender-tokens
      
      Returns 0 for 0xeee... (ETH)
      Possible error throws:
        - extremely large arrays for user and or tokens (gas cost too high)

      Returns a one-dimensional array that's owners.length long.
    */
    function allowances(
        address[] calldata owners,
        address[] calldata spenders,
        address[] calldata tokens
    ) external view returns (uint256[] memory) {
        // make sure the arrays are all of equal length
        require(owners.length == spenders.length, "all arrays must be of equal length");
        require(owners.length == tokens.length, "all arrays must be of equal length");

        uint256[] memory addrAllowances = new uint256[](owners.length);

        for (uint256 i = 0; i < owners.length; i++) {
            if (tokens[i] != address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE)) {
                addrAllowances[i] = IToken(tokens[i]).allowance(owners[i], spenders[i]);
            } else {
                // ETH
                addrAllowances[i] = 0;
            }
        }

        return addrAllowances;
    }
}
