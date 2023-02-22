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

import "./BaseTest.t.sol";
import "../src/ZeroExTimelock.sol";
import "../src/ZeroExTreasuryGovernor.sol";
import "../src/ZRXWrappedToken.sol";
import "@openzeppelin/token/ERC20/ERC20.sol";
import "@openzeppelin/mocks/CallReceiverMock.sol";

contract ZeroExTreasuryGovernorTest is BaseTest {
    IERC20 public token;
    ZRXWrappedToken internal wToken;
    ZeroExVotes internal votes;
    ZeroExTimelock internal timelock;
    ZeroExTreasuryGovernor internal treasuryGovernor;
    CallReceiverMock internal callReceiverMock;

    function setUp() public {
        vm.startPrank(account1);
        (token, wToken, votes, , timelock, , treasuryGovernor) = setupGovernance();
        // quorum 5000000e18
        // proposal threshold 250000e18 = sqrt(6.25e46) 5e11
        token.transfer(account2, 10000000e18);
        token.transfer(account3, 2000000e18);
        token.transfer(account4, 3000000e18);
        vm.stopPrank();

        // Setup accounts 2,3 and 4 to vote
        vm.startPrank(account2);
        token.approve(address(wToken), 10000000e18);
        wToken.depositFor(account2, 10000000e18);
        wToken.delegate(account2);
        vm.stopPrank();

        vm.startPrank(account3);
        token.approve(address(wToken), 2000000e18);
        wToken.depositFor(account3, 2000000e18);
        wToken.delegate(account3);
        vm.stopPrank();

        vm.startPrank(account4);
        token.approve(address(wToken), 3000000e18);
        wToken.depositFor(account4, 3000000e18);
        wToken.delegate(account4);
        vm.stopPrank();

        callReceiverMock = new CallReceiverMock();
    }

    function testShouldReturnCorrectName() public {
        assertEq(treasuryGovernor.name(), "ZeroExTreasuryGovernor");
    }

    function testShouldReturnCorrectVotingDelay() public {
        assertEq(treasuryGovernor.votingDelay(), 14400);
    }

    function testShouldReturnCorrectVotingPeriod() public {
        assertEq(treasuryGovernor.votingPeriod(), 50400);
    }

    function testShouldReturnCorrectProposalThreshold() public {
        assertEq(treasuryGovernor.proposalThreshold(), 5e11);
    }

    function testShouldReturnCorrectQuorum() public {
        assertEq(treasuryGovernor.quorum(block.number), 23e11);
    }

    function testShouldReturnCorrectToken() public {
        assertEq(address(treasuryGovernor.token()), address(votes));
    }

    function testShouldReturnCorrectSecurityCouncil() public {
        assertEq(treasuryGovernor.securityCouncil(), securityCouncil);
    }

    function testShouldBeAbleToExecuteASuccessfulProposal() public {
        // Create a proposal
        address[] memory targets = new address[](1);
        targets[0] = address(callReceiverMock);

        uint256[] memory values = new uint256[](1);
        values[0] = 0;

        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("mockFunction()");

        vm.roll(2);
        vm.startPrank(account2);
        uint256 proposalId = treasuryGovernor.propose(targets, values, calldatas, "Proposal description");
        vm.stopPrank();

        // Fast forward to after vote start
        vm.roll(treasuryGovernor.proposalSnapshot(proposalId) + 1);

        // Vote
        vm.prank(account2);
        treasuryGovernor.castVote(proposalId, 1); // Vote "for"
        vm.stopPrank();
        vm.prank(account3);
        treasuryGovernor.castVote(proposalId, 0); // Vote "against"
        vm.stopPrank();
        vm.prank(account4);
        treasuryGovernor.castVote(proposalId, 2); // Vote "abstain"
        vm.stopPrank();

        // Fast forward to vote end
        vm.roll(treasuryGovernor.proposalDeadline(proposalId) + 1);

        // Get vote results
        (uint256 votesAgainst, uint256 votesFor, uint256 votesAbstain) = treasuryGovernor.proposalVotes(proposalId);
        assertEq(votesFor, Math.sqrt(10000000e18));
        assertEq(votesAgainst, Math.sqrt(2000000e18));
        assertEq(votesAbstain, Math.sqrt(3000000e18));

        IGovernor.ProposalState state = treasuryGovernor.state(proposalId);
        assertEq(uint256(state), uint256(IGovernor.ProposalState.Succeeded));

        // Queue proposal
        treasuryGovernor.queue(targets, values, calldatas, keccak256(bytes("Proposal description")));
        vm.warp(treasuryGovernor.proposalEta(proposalId) + 1);

        treasuryGovernor.execute(targets, values, calldatas, keccak256("Proposal description"));
        state = treasuryGovernor.state(proposalId);
        assertEq(uint256(state), uint256(IGovernor.ProposalState.Executed));
    }

    function testCanUpdateVotingDelaySetting() public {
        // Create a proposal
        address[] memory targets = new address[](1);
        targets[0] = address(treasuryGovernor);

        uint256[] memory values = new uint256[](1);
        values[0] = 0;

        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSelector(treasuryGovernor.setVotingDelay.selector, 3 days);

        vm.roll(2);
        vm.startPrank(account2);
        uint256 proposalId = treasuryGovernor.propose(targets, values, calldatas, "Increase voting delay to 3 days");
        vm.stopPrank();

        // Fast forward to after vote start
        vm.roll(treasuryGovernor.proposalSnapshot(proposalId) + 1);

        // Vote
        vm.prank(account2);
        treasuryGovernor.castVote(proposalId, 1); // Vote "for"
        vm.stopPrank();

        // Fast forward to vote end
        vm.roll(treasuryGovernor.proposalDeadline(proposalId) + 1);

        // Queue proposal
        treasuryGovernor.queue(targets, values, calldatas, keccak256(bytes("Increase voting delay to 3 days")));
        vm.warp(treasuryGovernor.proposalEta(proposalId) + 1);

        // Execute proposal
        treasuryGovernor.execute(targets, values, calldatas, keccak256("Increase voting delay to 3 days"));

        uint256 votingDelay = treasuryGovernor.votingDelay();
        assertEq(votingDelay, 3 days);
    }

    function testCanUpdateVotingPeriodSetting() public {
        // Create a proposal
        address[] memory targets = new address[](1);
        targets[0] = address(treasuryGovernor);

        uint256[] memory values = new uint256[](1);
        values[0] = 0;

        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSelector(treasuryGovernor.setVotingPeriod.selector, 14 days);

        vm.roll(2);
        vm.startPrank(account2);
        uint256 proposalId = treasuryGovernor.propose(targets, values, calldatas, "Increase voting period to 14 days");
        vm.stopPrank();

        // Fast forward to after vote start
        vm.roll(treasuryGovernor.proposalSnapshot(proposalId) + 1);

        // Vote
        vm.prank(account2);
        treasuryGovernor.castVote(proposalId, 1); // Vote "for"
        vm.stopPrank();

        // Fast forward to vote end
        vm.roll(treasuryGovernor.proposalDeadline(proposalId) + 1);

        // Queue proposal
        treasuryGovernor.queue(targets, values, calldatas, keccak256(bytes("Increase voting period to 14 days")));
        vm.warp(treasuryGovernor.proposalEta(proposalId) + 1);

        // Execute proposal
        treasuryGovernor.execute(targets, values, calldatas, keccak256("Increase voting period to 14 days"));

        uint256 votingPeriod = treasuryGovernor.votingPeriod();
        assertEq(votingPeriod, 14 days);
    }

    function testCanUpdateProposalThresholdSetting() public {
        // Create a proposal
        address[] memory targets = new address[](1);
        targets[0] = address(treasuryGovernor);

        uint256[] memory values = new uint256[](1);
        values[0] = 0;

        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSelector(treasuryGovernor.setProposalThreshold.selector, 2000000e18);

        vm.roll(2);
        vm.startPrank(account2);
        uint256 proposalId = treasuryGovernor.propose(
            targets,
            values,
            calldatas,
            "Increase proposal threshold to 2000000e18"
        );
        vm.stopPrank();

        // Fast forward to after vote start
        vm.roll(treasuryGovernor.proposalSnapshot(proposalId) + 1);

        // Vote
        vm.prank(account2);
        treasuryGovernor.castVote(proposalId, 1); // Vote "for"
        vm.stopPrank();

        // Fast forward to vote end
        vm.roll(treasuryGovernor.proposalDeadline(proposalId) + 1);

        // Queue proposal
        treasuryGovernor.queue(
            targets,
            values,
            calldatas,
            keccak256(bytes("Increase proposal threshold to 2000000e18"))
        );
        vm.warp(treasuryGovernor.proposalEta(proposalId) + 1);

        // Execute proposal
        treasuryGovernor.execute(targets, values, calldatas, keccak256("Increase proposal threshold to 2000000e18"));

        uint256 proposalThreshold = treasuryGovernor.proposalThreshold();
        assertEq(proposalThreshold, 2000000e18);
    }

    function testSecurityCouncilAreEjectedAfterCancellingAProposal() public {
        // Create a proposal
        address[] memory targets = new address[](1);
        targets[0] = address(callReceiverMock);

        uint256[] memory values = new uint256[](1);
        values[0] = 0;

        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("mockFunction()");

        vm.roll(2);
        vm.startPrank(account2);
        uint256 proposalId = treasuryGovernor.propose(targets, values, calldatas, "Proposal description");
        vm.stopPrank();

        // Fast forward to after vote start
        vm.roll(treasuryGovernor.proposalSnapshot(proposalId) + 1);

        // Vote
        vm.prank(account2);
        treasuryGovernor.castVote(proposalId, 1); // Vote "for"
        vm.stopPrank();

        // Fast forward to vote end
        vm.roll(treasuryGovernor.proposalDeadline(proposalId) + 1);

        IGovernor.ProposalState state = treasuryGovernor.state(proposalId);
        assertEq(uint256(state), uint256(IGovernor.ProposalState.Succeeded));

        // Queue proposal
        treasuryGovernor.queue(targets, values, calldatas, keccak256(bytes("Proposal description")));

        // Cancel the proposal
        vm.warp(treasuryGovernor.proposalEta(proposalId));
        vm.prank(securityCouncil);
        treasuryGovernor.cancel(targets, values, calldatas, keccak256(bytes("Proposal description")));
        vm.stopPrank();

        state = treasuryGovernor.state(proposalId);
        assertEq(uint256(state), uint256(IGovernor.ProposalState.Canceled));

        assertEq(treasuryGovernor.securityCouncil(), address(0));
    }

    function testCanAssignSecurityCouncil() public {
        // Create a proposal
        address[] memory targets = new address[](1);
        targets[0] = address(treasuryGovernor);

        uint256[] memory values = new uint256[](1);
        values[0] = 0;

        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSelector(treasuryGovernor.assignSecurityCouncil.selector, account1);

        vm.roll(2);
        vm.startPrank(account2);
        uint256 proposalId = treasuryGovernor.propose(targets, values, calldatas, "Assign new security council");
        vm.stopPrank();

        // Fast forward to after vote start
        vm.roll(treasuryGovernor.proposalSnapshot(proposalId) + 1);

        // Vote
        vm.prank(account2);
        treasuryGovernor.castVote(proposalId, 1); // Vote "for"
        vm.stopPrank();

        // Fast forward to vote end
        vm.roll(treasuryGovernor.proposalDeadline(proposalId) + 1);

        // Queue proposal
        treasuryGovernor.queue(targets, values, calldatas, keccak256(bytes("Assign new security council")));
        vm.warp(treasuryGovernor.proposalEta(proposalId) + 1);

        // Execute proposal
        treasuryGovernor.execute(targets, values, calldatas, keccak256("Assign new security council"));

        address newSecurityCouncil = treasuryGovernor.securityCouncil();
        assertEq(newSecurityCouncil, account1);
    }

    function testCannotAssignSecurityCouncilOutsideOfGovernance() public {
        vm.expectRevert("Governor: onlyGovernance");
        treasuryGovernor.assignSecurityCouncil(account1);
    }
}
