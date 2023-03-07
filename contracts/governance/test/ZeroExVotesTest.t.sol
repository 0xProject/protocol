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

import "./BaseTest.t.sol";
import "../src/ZRXWrappedToken.sol";
import "@openzeppelin/token/ERC20/ERC20.sol";

contract ZeroExVotesTest is BaseTest {
    IERC20 private token;
    ZRXWrappedToken private wToken;
    ZeroExVotes private votes;

    function setUp() public {
        (token, wToken, votes) = setupZRXWrappedToken();
        vm.startPrank(account1);
        token.transfer(account2, 100e18);
        token.transfer(account3, 200e18);
        vm.stopPrank();
    }

    function testShouldCorrectlyInitialiseToken() public {
        assertEq(votes.token(), address(wToken));
    }

    function testShouldNotBeAbleToInitialiseWithZeroAddressToken() public {
        ZeroExVotes _votes = new ZeroExVotes();
        _votes.initialize(address(0));
    }

    function testShouldNotBeAbleToReinitialise() public {
        vm.expectRevert("ZeroExVotes: already initialized");
        votes.initialize(account2);
    }

    function testShouldBeAbleToReadCheckpoints() public {
        // Account 2 wraps ZRX and delegates voting power to account3
        vm.startPrank(account2);
        token.approve(address(wToken), 10e18);
        wToken.depositFor(account2, 10e18);
        vm.roll(2);
        wToken.delegate(account3);

        assertEq(votes.numCheckpoints(account3), 1);

        IZeroExVotes.Checkpoint memory checkpoint = votes.checkpoints(account3, 0);
        assertEq(checkpoint.fromBlock, 2);
        assertEq(checkpoint.votes, 10e18);
        assertEq(checkpoint.quadraticVotes, Math.sqrt(10e18));
    }

    function testShouldBeAbleToSelfDelegateVotingPower() public {
        // Check voting power initially is 0
        uint256 votingPowerAccount2 = votes.getVotes(account2);
        uint256 votingQuadraticPowerAccount2 = votes.getQuadraticVotes(account2);
        assertEq(votingPowerAccount2, 0);
        assertEq(votingQuadraticPowerAccount2, 0);

        // Wrap ZRX and delegate voting power to themselves
        vm.startPrank(account2);
        token.approve(address(wToken), 100e18);
        wToken.depositFor(account2, 100e18);
        wToken.delegate(account2);

        // Check voting power is now = token balance
        votingPowerAccount2 = votes.getVotes(account2);
        assertEq(votingPowerAccount2, 100e18);
        // Check quadratic voting power is now = sqrt(token balance)
        votingQuadraticPowerAccount2 = votes.getQuadraticVotes(account2);
        assertEq(votingQuadraticPowerAccount2, Math.sqrt(100e18));
    }

    function testShouldBeAbleToDelegateVotingPowerToAnotherAccount() public {
        // Check voting power initially is 0
        uint256 votingPowerAccount3 = votes.getVotes(account3);
        uint256 votingQuadraticPowerAccount3 = votes.getQuadraticVotes(account3);
        assertEq(votingPowerAccount3, 0);
        assertEq(votingQuadraticPowerAccount3, 0);

        // Account 2 wraps ZRX and delegates voting power to account3
        vm.startPrank(account2);
        token.approve(address(wToken), 10e18);
        wToken.depositFor(account2, 10e18);
        wToken.delegate(account3);

        // Check voting power is now = token balance
        votingPowerAccount3 = votes.getVotes(account3);
        assertEq(votingPowerAccount3, 10e18);
        // Check quadratic voting power is now = sqrt(token balance)
        votingQuadraticPowerAccount3 = votes.getQuadraticVotes(account3);
        assertEq(votingQuadraticPowerAccount3, Math.sqrt(10e18));
    }

    function testShouldBeAbleToDelegateVotingPowerToAnotherAccountWithSignature() public {
        uint256 nonce = 0;
        uint256 expiry = type(uint256).max;
        uint256 privateKey = 2;

        // Account 2 wraps ZRX and delegates voting power to account3
        vm.startPrank(account2);
        token.approve(address(wToken), 10e18);
        wToken.depositFor(account2, 10e18);
        vm.stopPrank();

        assertEq(wToken.delegates(account2), address(0));
        assertEq(votes.getVotes(account3), 0);
        assertEq(votes.getQuadraticVotes(account3), 0);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            privateKey,
            keccak256(
                abi.encodePacked(
                    "\x19\x01",
                    wToken.DOMAIN_SEPARATOR(),
                    keccak256(abi.encode(DELEGATION_TYPEHASH, account3, nonce, expiry))
                )
            )
        );
        wToken.delegateBySig(account3, nonce, expiry, v, r, s);

        assertEq(wToken.delegates(account2), account3);
        assertEq(votes.getVotes(account3), 10e18);
        assertEq(votes.getQuadraticVotes(account3), Math.sqrt(10e18));
    }

    function testShouldNotBeAbleToDelegateWithSignatureAfterExpiry() public {
        uint256 nonce = 0;
        uint256 expiry = block.timestamp;
        uint256 privateKey = 2;

        // Account 2 wraps ZRX and delegates voting power to account3
        vm.startPrank(account2);
        token.approve(address(wToken), 10e18);
        wToken.depositFor(account2, 10e18);
        vm.stopPrank();

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            privateKey,
            keccak256(
                abi.encodePacked(
                    "\x19\x01",
                    wToken.DOMAIN_SEPARATOR(),
                    keccak256(abi.encode(DELEGATION_TYPEHASH, account3, nonce, expiry))
                )
            )
        );

        vm.warp(block.timestamp + 1);
        vm.expectRevert("ERC20Votes: signature expired");
        wToken.delegateBySig(account3, nonce, expiry, v, r, s);
    }

    function testMultipleAccountsShouldBeAbleToDelegateVotingPowerToAccountWithNoTokensOnSameBlock() public {
        // Check account4 voting power initially is 0
        uint256 votingPowerAccount4 = votes.getVotes(account4);
        uint256 votingQuadraticPowerAccount4 = votes.getVotes(account4);
        assertEq(votingPowerAccount4, 0);
        assertEq(votingQuadraticPowerAccount4, 0);

        // Account 2 wraps ZRX and delegates voting power to account4
        vm.startPrank(account2);
        token.approve(address(wToken), 100e18);
        wToken.depositFor(account2, 100e18);
        wToken.delegate(account4);
        vm.stopPrank();

        // Account 3 also wraps ZRX and delegates voting power to account4
        vm.startPrank(account3);
        token.approve(address(wToken), 200e18);
        wToken.depositFor(account3, 200e18);
        wToken.delegate(account4);
        vm.stopPrank();

        // Check voting power is now = token balance
        votingPowerAccount4 = votes.getVotes(account4);
        assertEq(votingPowerAccount4, 300e18);
        // Check quadratic voting power is now = sqrt(token balance)
        votingQuadraticPowerAccount4 = votes.getQuadraticVotes(account4);
        assertEq(votingQuadraticPowerAccount4, Math.sqrt(100e18) + Math.sqrt(200e18));
    }

    function testMultipleAccountsShouldBeAbleToDelegateVotingPowerToAccountWithNoTokensOnDifferentBlock() public {
        // Check account4 voting power initially is 0
        uint256 votingPowerAccount4 = votes.getVotes(account4);
        uint256 votingQuadraticPowerAccount4 = votes.getVotes(account4);
        assertEq(votingPowerAccount4, 0);
        assertEq(votingQuadraticPowerAccount4, 0);

        // Account 2 wraps ZRX and delegates voting power to account4
        vm.startPrank(account2);
        token.approve(address(wToken), 100e18);
        wToken.depositFor(account2, 100e18);
        wToken.delegate(account4);
        vm.stopPrank();

        // Different block height
        vm.roll(2);
        // Account 3 also wraps ZRX and delegates voting power to account4
        vm.startPrank(account3);
        token.approve(address(wToken), 200e18);
        wToken.depositFor(account3, 200e18);
        wToken.delegate(account4);
        vm.stopPrank();

        // Check voting power is now = token balance
        votingPowerAccount4 = votes.getVotes(account4);
        assertEq(votingPowerAccount4, 300e18);
        // Check quadratic voting power is now = sqrt(token balance)
        votingQuadraticPowerAccount4 = votes.getQuadraticVotes(account4);
        assertEq(votingQuadraticPowerAccount4, Math.sqrt(100e18) + Math.sqrt(200e18));
    }

    function testComplexDelegationScenario() public {
        // Account 2 wraps ZRX and delegates to itself
        vm.startPrank(account2);
        token.approve(address(wToken), 100e18);
        wToken.depositFor(account2, 90e18);
        wToken.delegate(account2);
        vm.stopPrank();

        uint256 votingPowerAccount2 = votes.getVotes(account2);
        uint256 votingQuadraticPowerAccount2 = votes.getQuadraticVotes(account2);
        assertEq(votingPowerAccount2, 90e18);
        assertEq(votingQuadraticPowerAccount2, Math.sqrt(90e18)); // 9486832980

        // Account 3 wraps ZRX and delegates to account4
        vm.startPrank(account3);
        token.approve(address(wToken), 200e18);
        wToken.depositFor(account3, 100e18);
        wToken.delegate(account4);
        vm.stopPrank();

        uint256 votingPowerAccount4 = votes.getVotes(account4);
        uint256 votingQuadraticPowerAccount4 = votes.getQuadraticVotes(account4);
        assertEq(votingPowerAccount4, 100e18);
        assertEq(votingQuadraticPowerAccount4, Math.sqrt(100e18));

        // Voting power distribution now is as follows
        // account2 -> account2 90e18 | 9486832980
        // account3 -> account4 100e18 | 10e9

        // Account 2 deposits the remaining 10e18 and delegates to account3
        vm.startPrank(account2);
        wToken.depositFor(account2, 10e18);
        wToken.delegate(account3);
        vm.stopPrank();

        uint256 votingPowerAccount3 = votes.getVotes(account3);
        uint256 votingQuadraticPowerAccount3 = votes.getQuadraticVotes(account3);
        assertEq(votingPowerAccount3, 100e18);
        assertEq(votingQuadraticPowerAccount3, Math.sqrt(100e18));

        // Voting power distribution now is as follows
        // account2 -> account3 100e18 | 10e18
        // account3 -> account4 100e18 | 10e9

        // Account 3 delegates to itself
        vm.startPrank(account3);
        wToken.delegate(account3);
        vm.stopPrank();

        votingPowerAccount3 = votes.getVotes(account3);
        votingQuadraticPowerAccount3 = votes.getQuadraticVotes(account3);
        assertEq(votingPowerAccount3, 200e18);
        assertEq(votingQuadraticPowerAccount3, Math.sqrt(100e18) + Math.sqrt(100e18));

        // Voting power distribution now is as follows
        // account2, account3 -> account3 100e18 | 20e18

        // Check account2 and account4 no longer have voting power
        votingPowerAccount2 = votes.getVotes(account2);
        votingQuadraticPowerAccount2 = votes.getQuadraticVotes(account2);
        assertEq(votingPowerAccount2, 0);
        assertEq(votingQuadraticPowerAccount2, 0);

        votingPowerAccount4 = votes.getVotes(account4);
        votingQuadraticPowerAccount4 = votes.getQuadraticVotes(account4);
        assertEq(votingPowerAccount4, 0);
        assertEq(votingQuadraticPowerAccount4, 0);
    }
}
