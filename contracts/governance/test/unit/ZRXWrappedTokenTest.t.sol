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
pragma solidity ^0.8.19;

import "../BaseTest.t.sol";
import "../../src/ZRXWrappedToken.sol";
import "@openzeppelin/token/ERC20/ERC20.sol";

contract ZRXWrappedTokenTest is BaseTest {
    IERC20 private token;
    ZRXWrappedToken private wToken;
    ZeroExVotes private votes;

    function setUp() public {
        token = mockZRXToken();
        (wToken, votes, , , , ) = setupGovernance(token);
        vm.startPrank(account1);
        token.transfer(account2, 100e18);
        token.transfer(account3, 200e18);
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

    function testShouldReturnCorrectNumberOfDecimals() public {
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

    function testWrappedZRXTotalsAreCorrect() public {
        // Wrap 1e18 and check total supply is correct
        vm.startPrank(account2);
        token.approve(address(wToken), 1e18);
        wToken.depositFor(account2, 1e18);
        vm.stopPrank();
        uint256 wTokenBalance = wToken.totalSupply();
        assertEq(wTokenBalance, 1e18);

        // Wrap 2e18 more and check total supply is correct
        vm.startPrank(account3);
        token.approve(address(wToken), 2e18);
        wToken.depositFor(account3, 2e18);
        vm.stopPrank();
        wTokenBalance = wToken.totalSupply();
        assertEq(wTokenBalance, 1e18 + 2e18);

        // Unwrap 1e7 and check total supply is correct
        vm.startPrank(account2);
        wToken.withdrawTo(account2, 1e7);
        vm.stopPrank();
        wTokenBalance = wToken.totalSupply();
        assertEq(wTokenBalance, 3e18 - 1e7);

        // Unwrap 8e17 and check total supply is correct
        vm.startPrank(account2);
        wToken.withdrawTo(account2, 8e17);
        vm.stopPrank();
        wTokenBalance = wToken.totalSupply();
        assertEq(wTokenBalance, 3e18 - 1e7 - 8e17);

        // We are not keeping record of total balances so check they are zero
        assertEq(votes.getPastTotalSupply(0), 0);
        assertEq(votes.getPastQuadraticTotalSupply(0), 0);
    }

    function testWhenMintingFirstTimeForAccountTotalSupplyCheckpointsAreCorrect() public {
        vm.startPrank(account2);

        // Approve the wrapped token and deposit 1e18 ZRX
        token.approve(address(wToken), 1e18);
        vm.roll(2);
        wToken.depositFor(account2, 1e18);
        vm.roll(3);

        // Check the totals are correct
        uint256 totalSupplyVotes = votes.getPastTotalSupply(2);
        uint256 totalSupplyQuadraticVotes = votes.getPastQuadraticTotalSupply(2);
        assertEq(totalSupplyVotes, 1e18);
        assertEq(totalSupplyQuadraticVotes, 1e18);
    }

    function testWhenMintingForAccountWithExistingBalanceTotalSupplyCheckpointsAreCorrect() public {
        vm.startPrank(account2);

        // Approve the wrapped token and deposit 1e18 ZRX
        token.approve(address(wToken), 5e18);
        wToken.depositFor(account2, 1e18);

        vm.roll(2);
        // Depost 3e18 more for the same account
        wToken.depositFor(account2, 3e18);
        vm.roll(3);

        // Check the totals are correct
        uint256 totalSupplyVotes = votes.getPastTotalSupply(2);
        uint256 totalSupplyQuadraticVotes = votes.getPastQuadraticTotalSupply(2);
        assertEq(totalSupplyVotes, 4e18);
        assertEq(totalSupplyQuadraticVotes, 4e18);
    }

    function testWhenMintingForMultipleAccountsTotalSupplyCheckpointsAreCorrect() public {
        // Deposit 1e18 ZRX by account2
        vm.startPrank(account2);
        token.approve(address(wToken), 5e18);
        wToken.depositFor(account2, 1e18);
        vm.stopPrank();

        // Deposit 2e18 ZRX by account3
        vm.startPrank(account3);
        token.approve(address(wToken), 2e18);
        wToken.depositFor(account3, 2e18);
        vm.stopPrank();

        // Deposit 4e18 ZRX by account2
        vm.startPrank(account2);
        vm.roll(2);
        wToken.depositFor(account2, 4e18);
        vm.stopPrank();
        vm.roll(3);

        // Check the totals are correct
        uint256 totalSupplyVotes = votes.getPastTotalSupply(2);
        uint256 totalSupplyQuadraticVotes = votes.getPastQuadraticTotalSupply(2);
        assertEq(totalSupplyVotes, 7e18);
        assertEq(totalSupplyQuadraticVotes, 5e18 + 2e18);
    }

    function testWhenBurningForMultipleAccountsTotalSupplyCheckpointsAreCorrect() public {
        // Deposit 5e18 ZRX by account2
        vm.startPrank(account2);
        token.approve(address(wToken), 5e18);
        wToken.depositFor(account2, 5e18);
        vm.stopPrank();

        // Deposit 2e18 ZRX by account3
        vm.startPrank(account3);
        token.approve(address(wToken), 2e18);
        wToken.depositFor(account3, 2e18);
        vm.stopPrank();

        // Burn 4e18 ZRX by account2
        vm.startPrank(account2);
        vm.roll(2);
        wToken.withdrawTo(account2, 4e18);
        vm.stopPrank();
        vm.roll(3);

        // Check the totals are correct
        uint256 totalSupplyVotes = votes.getPastTotalSupply(2);
        uint256 totalSupplyQuadraticVotes = votes.getPastQuadraticTotalSupply(2);
        assertEq(totalSupplyVotes, 3e18);
        assertEq(totalSupplyQuadraticVotes, 1e18 + 2e18);
    }

    function testShouldBeAbleToTransferCorrectly() public {
        assertEq(wToken.balanceOf(account4), 0);

        vm.startPrank(account2);
        token.approve(address(wToken), 1e18);
        wToken.depositFor(account2, 1e18);
        wToken.transfer(account4, 1e17);
        vm.stopPrank();

        assertEq(wToken.balanceOf(account4), 1e17);
    }

    function testShouldTransferVotingPowerWhenTransferringTokens() public {
        // Account 2 wraps ZRX and delegates voting power to itself
        vm.startPrank(account2);
        token.approve(address(wToken), 10e18);
        wToken.depositFor(account2, 10e18);
        wToken.delegate(account2);

        wToken.transfer(account3, 3e18);

        assertEq(wToken.balanceOf(account2), 7e18);
        assertEq(wToken.balanceOf(account3), 3e18);

        assertEq(votes.getVotes(account2), 7e18);
        assertEq(votes.getQuadraticVotes(account2), 7e18);

        // Since account3 is not delegating to anyone, they should have no voting power
        assertEq(votes.getVotes(account3), 0);
        assertEq(votes.getQuadraticVotes(account3), 0);
    }

    function testShouldUpdateVotingPowerWhenDepositing() public {
        // Account 2 wraps ZRX and delegates voting power to itself
        vm.startPrank(account2);
        token.approve(address(wToken), 10e18);
        wToken.depositFor(account2, 7e18);
        wToken.delegate(account2);

        assertEq(votes.getVotes(account2), 7e18);
        assertEq(votes.getQuadraticVotes(account2), 7e18);

        wToken.depositFor(account2, 2e18);
        assertEq(votes.getVotes(account2), 9e18);
        assertEq(votes.getQuadraticVotes(account2), 9e18);
    }

    function testShouldUpdateVotingPowerWhenWithdrawing() public {
        // Account 2 wraps ZRX and delegates voting power to itself
        vm.startPrank(account2);
        token.approve(address(wToken), 10e18);
        wToken.depositFor(account2, 10e18);
        wToken.delegate(account2);

        assertEq(votes.getVotes(account2), 10e18);
        assertEq(votes.getQuadraticVotes(account2), 10e18);

        wToken.withdrawTo(account2, 2e18);
        assertEq(votes.getVotes(account2), 8e18);
        assertEq(votes.getQuadraticVotes(account2), 8e18);
    }

    function testShouldSetDelegateBalanceLastUpdatedOnTransfer() public {
        ZRXWrappedToken.DelegateInfo memory account2DelegateInfo = wToken.delegateInfo(account2);
        assertEq(account2DelegateInfo.delegate, address(0));
        assertEq(account2DelegateInfo.balanceLastUpdated, 0);

        // Account 2 wraps ZRX and delegates voting power to account3
        vm.startPrank(account2);
        token.approve(address(wToken), 10e18);
        wToken.depositFor(account2, 10e18);
        wToken.delegate(account3);

        account2DelegateInfo = wToken.delegateInfo(account2);
        assertEq(account2DelegateInfo.delegate, account3);
        assertEq(account2DelegateInfo.balanceLastUpdated, 1); // Set to the block.number

        vm.roll(3);
        wToken.transfer(account3, 3e18);

        account2DelegateInfo = wToken.delegateInfo(account2);
        assertEq(account2DelegateInfo.delegate, account3);
        assertEq(account2DelegateInfo.balanceLastUpdated, 3);
    }
}
