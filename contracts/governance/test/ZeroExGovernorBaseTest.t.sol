// SPDX-License-Identifier: Apache-2.0
/*

  Copyright 2023 ZeroEx Intl.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF IZeroExGovernorANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.

*/
pragma solidity ^0.8.19;

import "./BaseTest.t.sol";
import "./IZeroExGovernor.sol";
import "../src/ZeroExTimelock.sol";
import "../src/ZeroExProtocolGovernor.sol";
import "../src/ZRXWrappedToken.sol";
import "@openzeppelin/token/ERC20/ERC20.sol";
import "@openzeppelin/mocks/CallReceiverMock.sol";

abstract contract ZeroExGovernorBaseTest is BaseTest {
    IERC20 public token;
    ZRXWrappedToken internal wToken;
    ZeroExVotes internal votes;
    ZeroExTimelock internal timelock;
    IZeroExGovernor internal governor;
    CallReceiverMock internal callReceiverMock;

    string internal governorName;
    uint256 internal proposalThreshold;
    uint256 internal quorum;

    function initialiseAccounts() public {
        vm.startPrank(account1);
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
        assertEq(governor.name(), governorName);
    }

    function testShouldReturnCorrectVotingDelay() public {
        assertEq(governor.votingDelay(), 14400);
    }

    function testShouldReturnCorrectVotingPeriod() public {
        assertEq(governor.votingPeriod(), 50400);
    }

    function testShouldReturnCorrectProposalThreshold() public {
        assertEq(governor.proposalThreshold(), proposalThreshold);
    }

    function testShouldReturnCorrectQuorum() public {
        assertEq(governor.quorum(block.number), quorum);
    }

    function testShouldReturnCorrectToken() public {
        assertEq(address(governor.token()), address(votes));
    }

    function testShouldReturnCorrectTimelock() public {
        assertEq(address(governor.timelock()), address(timelock));
    }

    function testShouldReturnCorrectSecurityCouncil() public {
        assertEq(governor.securityCouncil(), securityCouncil);
    }

    function testCanAssignSecurityCouncil() public {
        // Create a proposal
        address[] memory targets = new address[](1);
        targets[0] = address(governor);

        uint256[] memory values = new uint256[](1);
        values[0] = 0;

        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSelector(governor.assignSecurityCouncil.selector, account1);

        vm.roll(2);
        vm.startPrank(account2);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Assign new security council");
        vm.stopPrank();

        // Fast forward to after vote start
        vm.roll(governor.proposalSnapshot(proposalId) + 1);

        // Vote
        vm.prank(account2);
        governor.castVote(proposalId, 1); // Vote "for"
        vm.stopPrank();

        // Fast forward to vote end
        vm.roll(governor.proposalDeadline(proposalId) + 1);

        // Queue proposal
        governor.queue(targets, values, calldatas, keccak256(bytes("Assign new security council")));
        vm.warp(governor.proposalEta(proposalId) + 1);

        // Execute proposal
        governor.execute(targets, values, calldatas, keccak256("Assign new security council"));

        address newSecurityCouncil = governor.securityCouncil();
        assertEq(newSecurityCouncil, account1);
    }

    function testCannotAssignSecurityCouncilOutsideOfGovernance() public {
        vm.expectRevert("Governor: onlyGovernance");
        governor.assignSecurityCouncil(account1);
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
        uint256 proposalId = governor.propose(targets, values, calldatas, "Proposal description");
        vm.stopPrank();

        // Fast forward to after vote start
        vm.roll(governor.proposalSnapshot(proposalId) + 1);

        // Vote
        vm.prank(account2);
        governor.castVote(proposalId, 1); // Vote "for"
        vm.stopPrank();

        // Fast forward to vote end
        vm.roll(governor.proposalDeadline(proposalId) + 1);

        IGovernor.ProposalState state = governor.state(proposalId);
        assertEq(uint256(state), uint256(IGovernor.ProposalState.Succeeded));

        // Queue proposal
        governor.queue(targets, values, calldatas, keccak256(bytes("Proposal description")));

        // Cancel the proposal
        vm.warp(governor.proposalEta(proposalId));

        vm.prank(securityCouncil);
        governor.cancel(targets, values, calldatas, keccak256(bytes("Proposal description")));
        vm.stopPrank();

        state = governor.state(proposalId);
        assertEq(uint256(state), uint256(IGovernor.ProposalState.Canceled));

        assertEq(governor.securityCouncil(), address(0));
    }

    function testCanUpdateVotingDelaySetting() public {
        // Create a proposal
        address[] memory targets = new address[](1);
        targets[0] = address(governor);

        uint256[] memory values = new uint256[](1);
        values[0] = 0;

        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSelector(governor.setVotingDelay.selector, 3 days);

        vm.roll(2);
        vm.startPrank(account2);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Increase voting delay to 3 days");
        vm.stopPrank();

        // Fast forward to after vote start
        vm.roll(governor.proposalSnapshot(proposalId) + 1);

        // Vote
        vm.prank(account2);
        governor.castVote(proposalId, 1); // Vote "for"
        vm.stopPrank();

        // Fast forward to vote end
        vm.roll(governor.proposalDeadline(proposalId) + 1);

        // Queue proposal
        governor.queue(targets, values, calldatas, keccak256(bytes("Increase voting delay to 3 days")));
        vm.warp(governor.proposalEta(proposalId) + 1);
        // Execute proposal
        governor.execute(targets, values, calldatas, keccak256("Increase voting delay to 3 days"));

        uint256 votingDelay = governor.votingDelay();
        assertEq(votingDelay, 3 days);
    }

    function testCanUpdateVotingPeriodSetting() public {
        // Create a proposal
        address[] memory targets = new address[](1);
        targets[0] = address(governor);

        uint256[] memory values = new uint256[](1);
        values[0] = 0;

        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSelector(governor.setVotingPeriod.selector, 14 days);

        vm.roll(2);
        vm.startPrank(account2);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Increase voting period to 14 days");
        vm.stopPrank();

        // Fast forward to after vote start
        vm.roll(governor.proposalSnapshot(proposalId) + 1);

        // Vote
        vm.prank(account2);
        governor.castVote(proposalId, 1); // Vote "for"
        vm.stopPrank();

        // Fast forward to vote end
        vm.roll(governor.proposalDeadline(proposalId) + 1);

        // Queue proposal
        governor.queue(targets, values, calldatas, keccak256(bytes("Increase voting period to 14 days")));
        vm.warp(governor.proposalEta(proposalId) + 1);
        // Execute proposal
        governor.execute(targets, values, calldatas, keccak256("Increase voting period to 14 days"));

        uint256 votingPeriod = governor.votingPeriod();
        assertEq(votingPeriod, 14 days);
    }

    function testCanUpdateProposalThresholdSetting() public {
        // Create a proposal
        address[] memory targets = new address[](1);
        targets[0] = address(governor);

        uint256[] memory values = new uint256[](1);
        values[0] = 0;

        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSelector(governor.setProposalThreshold.selector, 2000000e18);

        vm.roll(2);
        vm.startPrank(account2);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Increase proposal threshold to 2000000e18");
        vm.stopPrank();

        // Fast forward to after vote start
        vm.roll(governor.proposalSnapshot(proposalId) + 1);

        // Vote
        vm.prank(account2);
        governor.castVote(proposalId, 1); // Vote "for"
        vm.stopPrank();

        // Fast forward to vote end
        vm.roll(governor.proposalDeadline(proposalId) + 1);

        // Queue proposal
        governor.queue(targets, values, calldatas, keccak256(bytes("Increase proposal threshold to 2000000e18")));
        vm.warp(governor.proposalEta(proposalId) + 1);
        // Execute proposal
        governor.execute(targets, values, calldatas, keccak256("Increase proposal threshold to 2000000e18"));

        uint256 proposalThreshold = governor.proposalThreshold();
        assertEq(proposalThreshold, 2000000e18);
    }

    function testCanUpdateTimelockDelay() public {
        // Create a proposal
        address[] memory targets = new address[](1);
        targets[0] = address(timelock);

        uint256[] memory values = new uint256[](1);
        values[0] = 0;

        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSelector(timelock.updateDelay.selector, 7 days);

        vm.roll(2);
        vm.startPrank(account2);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Increase timelock delay to 7 days");
        vm.stopPrank();

        // Fast forward to after vote start
        vm.roll(governor.proposalSnapshot(proposalId) + 1);

        // Vote
        vm.prank(account2);
        governor.castVote(proposalId, 1); // Vote "for"
        vm.stopPrank();

        // Fast forward to vote end
        vm.roll(governor.proposalDeadline(proposalId) + 1);

        // Queue proposal
        governor.queue(targets, values, calldatas, keccak256(bytes("Increase timelock delay to 7 days")));
        vm.warp(governor.proposalEta(proposalId) + 1);
        // Execute proposal
        governor.execute(targets, values, calldatas, keccak256("Increase timelock delay to 7 days"));

        uint256 timelockDelay = timelock.getMinDelay();
        assertEq(timelockDelay, 7 days);
    }
}
