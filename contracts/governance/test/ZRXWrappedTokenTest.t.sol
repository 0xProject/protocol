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
pragma solidity ^0.8.17;

import "./BaseTest.sol";
import "../src/ZRXWrappedToken.sol";
import "@openzeppelin/token/ERC20/ERC20.sol";

contract ZRXWrappedTokenTest is BaseTest {
    IERC20 public token;
    ZRXWrappedToken public wToken;

    function setUp() public {
        vm.startPrank(account1);
        token = IERC20(createZRXToken());
        token.transfer(account2, 100e18);
        token.transfer(account3, 100e18);

        wToken = new ZRXWrappedToken(token);
        vm.stopPrank();
    }

    function testShouldReturnCorrectSymbol() public {
        string memory wZRXSymbol = wToken.symbol();
        assertEq(wZRXSymbol, "wZRX");
    }

    function testShouldReturnCorrectName() public {
        string memory wZRXName = wToken.name();
        assertEq(wZRXName, "Wrapped ZRX");
    }

    function shouldReturnCorrectNumberOfDecimals() public {
        // TODO: decimals is set to 0
        uint8 wZRXDecimals = wToken.decimals();
        assertEq(wZRXDecimals, 18);
    }

    function testShouldBeAbleToWrapZRX() public {
        vm.startPrank(account2);

        // Approve the wrapped token and deposit 1e18 ZRX
        token.approve(address(wToken), 1e18);
        wToken.depositFor(account2, 1e18);

        // Check the token balances even out
        uint256 wTokenBalance = wToken.balanceOf(account2);
        assertEq(wTokenBalance, 1e18);
        uint256 tokenBalance = token.balanceOf(account2);
        assertEq(tokenBalance, 100e18 - wTokenBalance);
    }

    function testShouldBeAbleToUnwrapToZRX() public {
        vm.startPrank(account2);

        // Approve the wrapped token and deposit 1e18 ZRX
        token.approve(address(wToken), 1e18);
        wToken.depositFor(account2, 1e18);

        // Withdraw 1e6 wZRX back to ZRX to own account
        wToken.withdrawTo(account2, 1e6);

        // Check token balances even out
        uint256 wTokenBalance = wToken.balanceOf(account2);
        assertEq(wTokenBalance, 1e18 - 1e6);
        uint256 tokenBalance = token.balanceOf(account2);
        assertEq(tokenBalance, 100e18 - wTokenBalance);
    }

    function testShouldBeAbleToUnwrapToZRXToAnotherAccount() public {
        vm.startPrank(account2);

        // Approve the wrapped token and deposit 1e18 ZRX
        token.approve(address(wToken), 1e18);
        wToken.depositFor(account2, 1e18);

        // Withdraw 1e7 wZRX back to ZRX to account4 (which owns no tokens to start with)
        wToken.withdrawTo(account4, 1e7);

        // Check token balances even out
        uint256 wTokenBalance2 = wToken.balanceOf(account2);
        assertEq(wTokenBalance2, 1e18 - 1e7);

        uint256 tokenBalance4 = token.balanceOf(account4);
        assertEq(tokenBalance4, 1e7);

        uint256 tokenBalance2 = token.balanceOf(account2);
        assertEq(tokenBalance2, 100e18 - wTokenBalance2 - tokenBalance4);
    }

    function testShouldBeAbleToSelfDelegateVotingPower() public {
        // Check voting power initially is 0
        uint256 votingPowerAccount2 = wToken.getVotes(account2);
        assertEq(votingPowerAccount2, 0);

        // Wrap ZRX and delegate voting power to themselves
        vm.startPrank(account2);
        token.approve(address(wToken), 100e18);
        wToken.depositFor(account2, 100e18);
        wToken.delegate(account2);

        // Check voting power is now = token balance
        votingPowerAccount2 = wToken.getVotes(account2);
        assertEq(votingPowerAccount2, 100e18);
    }

    function testShouldBeAbleToDelegateVotingPowerToAnotherAccount() public {
        // Check voting power initially is 0
        uint256 votingPowerAccount3 = wToken.getVotes(account3);
        assertEq(votingPowerAccount3, 0);

        // Account 2 wraps ZRX and delegates voting power to account3
        vm.startPrank(account2);
        token.approve(address(wToken), 10e18);
        wToken.depositFor(account2, 10e18);
        wToken.delegate(account3);

        // Check voting power is now = token balance
        votingPowerAccount3 = wToken.getVotes(account3);
        assertEq(votingPowerAccount3, 10e18);
    }
}
