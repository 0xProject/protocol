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

import "../BaseTest.t.sol";
import "../../src/IZeroExGovernor.sol";
import "../../src/ZeroExTimelock.sol";
import "../../src/ZeroExProtocolGovernor.sol";
import "../../src/ZRXWrappedToken.sol";
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

    event SecurityCouncilAssigned(address securityCouncil);
    event SecurityCouncilEjected();

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

    function setSecurityCouncil(address council) internal {
        address[] memory targets = new address[](1);
        targets[0] = address(governor);

        uint256[] memory values = new uint256[](1);
        values[0] = 0;

        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSelector(governor.assignSecurityCouncil.selector, council);

        vm.roll(2);
        vm.startPrank(account2);
        uint256 proposalId = governor.propose(targets, values, calldatas, "Assign new security council");
        vm.stopPrank();

        // Fast forward to after vote start
        vm.roll(governor.proposalSnapshot(proposalId) + 1);

        // Vote
        vm.prank(account2);
        governor.castVote(proposalId, 1); // Vote "for"

        // Fast forward to vote end
        vm.roll(governor.proposalDeadline(proposalId) + 1);

        // Queue proposal
        governor.queue(targets, values, calldatas, keccak256(bytes("Assign new security council")));
        vm.warp(governor.proposalEta(proposalId) + 1);

        // Execute proposal
        governor.execute(targets, values, calldatas, keccak256("Assign new security council"));

        assertEq(governor.securityCouncil(), council);
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

        // Fast forward to vote end
        vm.roll(governor.proposalDeadline(proposalId) + 1);

        // Queue proposal
        governor.queue(targets, values, calldatas, keccak256(bytes("Assign new security council")));
        vm.warp(governor.proposalEta(proposalId) + 1);

        // Execute proposal
        vm.expectEmit(true, false, false, false);
        emit SecurityCouncilAssigned(account1);
        governor.execute(targets, values, calldatas, keccak256("Assign new security council"));

        assertEq(governor.securityCouncil(), account1);
    }

    function testCannotAssignSecurityCouncilOutsideOfGovernance() public {
        vm.expectRevert("Governor: onlyGovernance");
        governor.assignSecurityCouncil(account1);
    }

    // This functionality is currently not enabled
    // Leaving this test for potential future use.
    function testFailSecurityCouncilAreEjectedAfterCancellingAProposal() public {
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

        vm.expectEmit(true, false, false, false);
        emit SecurityCouncilEjected();
        governor.cancel(targets, values, calldatas, keccak256(bytes("Proposal description")));
        vm.stopPrank();

        state = governor.state(proposalId);
        assertEq(uint256(state), uint256(IGovernor.ProposalState.Canceled));

        assertEq(governor.securityCouncil(), address(0));
    }

    function testWhenNoSecurityCouncilCannottSubmitProposals() public {
        setSecurityCouncil(address(0));

        address[] memory targets = new address[](1);
        targets[0] = address(callReceiverMock);

        uint256[] memory values = new uint256[](1);
        values[0] = 0;

        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("mockFunction()");

        vm.expectRevert("SecurityCouncil: security council not assigned and this is not an assignment call");
        governor.propose(targets, values, calldatas, "Proposal description");
    }

    function testWhenNoSecurityCouncilCannotQueueSuccessfulProposals() public {
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

        // Fast forward to vote end
        vm.roll(governor.proposalDeadline(proposalId) + 1);

        // Set security council to address(0)
        setSecurityCouncil(address(0));

        vm.expectRevert("SecurityCouncil: security council not assigned and this is not an assignment call");
        governor.queue(targets, values, calldatas, keccak256(bytes("Proposal description")));

        IGovernor.ProposalState state = governor.state(proposalId);
        assertEq(uint256(state), uint256(IGovernor.ProposalState.Succeeded));
    }

    function testWhenNoSecurityCouncilCanPassProposalToAssignSecurityCouncil() public {
        setSecurityCouncil(address(0));

        setSecurityCouncil(account1);
    }

    function testCannotPassABadProposalToSetSecurityCouncil() public {
        setSecurityCouncil(address(0));

        address[] memory targets = new address[](2);
        targets[0] = address(governor);
        targets[1] = address(callReceiverMock);

        uint256[] memory values = new uint256[](2);
        values[0] = 0;
        values[1] = 0;

        bytes[] memory calldatas = new bytes[](2);
        calldatas[0] = abi.encodeWithSelector(governor.assignSecurityCouncil.selector, account1);
        calldatas[1] = abi.encodeWithSignature("mockFunction()");

        vm.roll(2);
        vm.startPrank(account2);
        vm.expectRevert("SecurityCouncil: more than 1 transaction in proposal");
        governor.propose(targets, values, calldatas, "Assign new security council");
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

        // Fast forward to vote end
        vm.roll(governor.proposalDeadline(proposalId) + 1);

        // Queue proposal
        governor.queue(targets, values, calldatas, keccak256(bytes("Increase voting delay to 3 days")));
        vm.warp(governor.proposalEta(proposalId) + 1);
        // Execute proposal
        governor.execute(targets, values, calldatas, keccak256("Increase voting delay to 3 days"));

        assertEq(governor.votingDelay(), 3 days);
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

        // Fast forward to vote end
        vm.roll(governor.proposalDeadline(proposalId) + 1);

        // Queue proposal
        governor.queue(targets, values, calldatas, keccak256(bytes("Increase voting period to 14 days")));
        vm.warp(governor.proposalEta(proposalId) + 1);
        // Execute proposal
        governor.execute(targets, values, calldatas, keccak256("Increase voting period to 14 days"));

        assertEq(governor.votingPeriod(), 14 days);
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

        // Fast forward to vote end
        vm.roll(governor.proposalDeadline(proposalId) + 1);

        // Queue proposal
        governor.queue(targets, values, calldatas, keccak256(bytes("Increase proposal threshold to 2000000e18")));
        vm.warp(governor.proposalEta(proposalId) + 1);
        // Execute proposal
        governor.execute(targets, values, calldatas, keccak256("Increase proposal threshold to 2000000e18"));

        assertEq(governor.proposalThreshold(), 2000000e18);
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

        // Fast forward to vote end
        vm.roll(governor.proposalDeadline(proposalId) + 1);

        // Queue proposal
        governor.queue(targets, values, calldatas, keccak256(bytes("Increase timelock delay to 7 days")));
        vm.warp(governor.proposalEta(proposalId) + 1);
        // Execute proposal
        governor.execute(targets, values, calldatas, keccak256("Increase timelock delay to 7 days"));

        assertEq(timelock.getMinDelay(), 7 days);
    }

    function testSupportsGovernanceInterfaces() public {
        assertTrue(governor.supportsInterface(type(IGovernorTimelock).interfaceId));
        assertTrue(governor.supportsInterface(type(IGovernor).interfaceId));
        assertTrue(governor.supportsInterface(type(IERC1155Receiver).interfaceId));
    }
}
