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
import "../src/ZeroExTimelock.sol";
import "../src/ZeroExGovernor.sol";
import "../src/ZRXWrappedToken.sol";
import "@openzeppelin/token/ERC20/ERC20.sol";
import "@openzeppelin/mocks/CallReceiverMock.sol";

contract ZeroExGovernorTest is BaseTest {
    IERC20 public token;
    ZRXWrappedToken internal wToken;
    ZeroExTimelock internal timelock;
    ZeroExGovernor internal governor;
    CallReceiverMock internal callReceiverMock;

    function setUp() public {
        vm.startPrank(account1);
        token = IERC20(createZRXToken());
        token.transfer(account2, 100e18);
        token.transfer(account3, 200e18);
        token.transfer(account4, 50e18);

        wToken = new ZRXWrappedToken(token);
        vm.stopPrank();

        // Setup accounts 2,3 and 4 to vote
        vm.startPrank(account2);
        token.approve(address(wToken), 100e18);
        wToken.depositFor(account2, 100e18);
        wToken.delegate(account2);
        vm.stopPrank();

        vm.startPrank(account3);
        token.approve(address(wToken), 200e18);
        wToken.depositFor(account3, 200e18);
        wToken.delegate(account3);
        vm.stopPrank();

        vm.startPrank(account4);
        token.approve(address(wToken), 50e18);
        wToken.depositFor(account4, 50e18);
        wToken.delegate(account4);
        vm.stopPrank();

        address[] memory proposers = new address[](0);
        address[] memory executors = new address[](0);

        timelock = new ZeroExTimelock(7 days, proposers, executors, account1);
        governor = new ZeroExGovernor(wToken, timelock);

        vm.startPrank(account1);
        timelock.grantRole(timelock.PROPOSER_ROLE(), address(governor));
        timelock.grantRole(timelock.EXECUTOR_ROLE(), address(governor));
        vm.stopPrank();

        callReceiverMock = new CallReceiverMock();
    }

    function testShouldReturnCorrectName() public {
        assertEq(governor.name(), "ZeroExGovernor");
    }

    function testShouldReturnCorrectVotingDelay() public {
        assertEq(governor.votingDelay(), 21600);
    }

    function testShouldReturnCorrectVotingPeriod() public {
        assertEq(governor.votingPeriod(), 50400);
    }

    function testShouldReturnCorrectProposalThreshold() public {
        assertEq(governor.proposalThreshold(), 0);
    }

    function testShouldReturnCorrectQuorum() public {
        assertEq(governor.quorumNumerator(), 10);
    }

    function testShouldReturnCorrectToken() public {
        assertEq(address(governor.token()), address(wToken));
    }

    function testShouldReturnCorrectTimelock() public {
        assertEq(address(governor.timelock()), address(timelock));
    }

    function testShouldBeAbleToExecuteASuccessfulProposal() public {
        // Create a proposal
        address[] memory targets = new address[](1);
        targets[0] = address(callReceiverMock);

        uint256[] memory values = new uint256[](1);
        values[0] = 0;

        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("mockFunction()");

        uint256 proposalId = governor.propose(targets, values, calldatas, "Proposal description");

        // Fast forward to after vote start
        vm.roll(governor.proposalSnapshot(proposalId) + 1);

        // Vote
        vm.prank(account2);
        governor.castVote(proposalId, 0); // Vote "against"
        vm.stopPrank();
        vm.prank(account3);
        governor.castVote(proposalId, 1); // Vote "for"
        vm.stopPrank();
        vm.prank(account4);
        governor.castVote(proposalId, 2); // Vote "abstain"
        vm.stopPrank();

        // Fast forward to vote end
        vm.roll(governor.proposalDeadline(proposalId) + 1);

        // Get vote results
        (uint256 votesAgainst, uint256 votesFor, uint256 votesAbstain) = governor.proposalVotes(proposalId);
        assertEq(votesAgainst, 100e18);
        assertEq(votesFor, 200e18);
        assertEq(votesAbstain, 50e18);

        IGovernor.ProposalState state = governor.state(proposalId);
        assertEq(uint256(state), uint256(IGovernor.ProposalState.Succeeded));

        // Queue proposal
        governor.queue(targets, values, calldatas, keccak256(bytes("Proposal description")));
        vm.warp(governor.proposalEta(proposalId) + 1);

        governor.execute(targets, values, calldatas, keccak256("Proposal description"));
        state = governor.state(proposalId);
        assertEq(uint256(state), uint256(IGovernor.ProposalState.Executed));
    }
}
