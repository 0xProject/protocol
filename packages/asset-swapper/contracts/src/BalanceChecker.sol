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

pragma solidity ^0.5.9;

// ERC20 contract interface
contract IToken {
    /// @dev Query the balance of owner
    /// @param _owner The address from which the balance will be retrieved
    /// @return Balance of owner
    function balanceOf(address _owner) public view returns (uint);

    /// @param _owner The address of the account owning tokens
    /// @param _spender The address of the account able to transfer the tokens
    /// @return Amount of remaining tokens allowed to spent
    function allowance(address _owner, address _spender) public view returns (uint);
}

contract BalanceChecker {
    /* Fallback function, don't accept any ETH */
    function() external payable {
      revert("BalanceChecker does not accept payments");
    }

    /*
      Check the token balance of a wallet in a token contract

      Returns the balance of the token for user. Avoids possible errors:
        - return 0 on non-contract address 
        - returns 0 if the contract doesn't implement balanceOf
    */
    function tokenBalance(address user, address token) public view returns (uint) {
        // check if token is actually a contract
        uint256 tokenCode;
        assembly { tokenCode := extcodesize(token) } // contract code size

        // checks that it's a contract
        // TODO: check function exists on contract
        if (tokenCode > 0) {  
            return IToken(token).balanceOf(user);
        } else {
            return 0;
        }
    }

    /*
      Check the token balances of wallet-token pairs.
      Pass 0x0 as a "token" address to get ETH balance.
      Possible error throws:
        - extremely large arrays for user and or tokens (gas cost too high)

      Returns a one-dimensional that's user.length long.
    */
    function balances(address[] calldata users, address[] calldata tokens) external view returns (uint[] memory) {
        // make sure the users array and tokens array are of equal length
        require(users.length == tokens.length, "users array is a different length than the tokens array");

        uint[] memory addrBalances = new uint[](users.length);

        for(uint i = 0; i < users.length; i++) {
            if (tokens[i] != address(0x0)) {
                addrBalances[i] = tokenBalance(users[i], tokens[i]);
            } else {
                addrBalances[i] = users[i].balance; // ETH balance
            }
        }

        return addrBalances;
    }

    /*
      Check the allowance for a given owner, spender, and token

      Returns the balance of the token for user. Avoids possible errors:
        - return 0 on non-contract address 
        - returns 0 if the contract doesn't implement allowance function
    */
    function allowance(address owner, address spender, address token) public view returns (uint) {
        // check if token is actually a contract
        uint256 tokenCode;
        assembly { tokenCode := extcodesize(token) } // contract code size

        // checks that it's a contract
        // TODO: check function exists on contract
        if (tokenCode > 0) {  
            return IToken(token).allowance(owner, spender);
        } else {
            return 0;
        }
    }

    /*
      Check the allowances of an array of owner-spender-tokens
      
      Returns 0 for 0x0
      Possible error throws:
        - extremely large arrays for user and or tokens (gas cost too high)

      Returns a one-dimensional array that's owners.length long.
    */
    function allowances(address[] calldata owners, address[] calldata spenders, address[] calldata tokens) external view returns (uint[] memory) {
        // make sure the arrays are all of equal length
        require(owners.length == spenders.length, "all arrays must be of equal length");
        require(owners.length == tokens.length, "all arrays must be of equal length");

        uint[] memory addrAllowances = new uint[](owners.length);

        for(uint i = 0; i < owners.length; i++) {
            if (tokens[i] != address(0x0)) {
                addrAllowances[i] = allowance(owners[i], spenders[i], tokens[i]);
            } else {
                // ETH
                addrAllowances[i] = 0;
            }
        }

        return addrAllowances;
    }


}
