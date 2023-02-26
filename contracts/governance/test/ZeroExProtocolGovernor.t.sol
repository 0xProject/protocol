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

import "./ZeroExGovernorBaseTest.t.sol";
import "./ZeroExMock.sol";
import "../src/ZeroExProtocolGovernor.sol";

contract ZeroExProtocolGovernorTest is ZeroExGovernorBaseTest {
    ZeroExProtocolGovernor internal protocolGovernor;
    ZeroExMock internal zeroExMock;
    event CallExecuted(bytes32 indexed id, uint256 indexed index, address target, uint256 value, bytes data);

    function setUp() public {
        governorName = "ZeroExProtocolGovernor";
        proposalThreshold = 1000000e18;
        quorum = 10000000e18;

        address governorAddress;
        (token, wToken, votes, timelock, , governorAddress, ) = setupGovernance();
        governor = IZeroExGovernor(governorAddress);
        protocolGovernor = ZeroExProtocolGovernor(payable(governorAddress));
        zeroExMock = new ZeroExMock();
        initialiseAccounts();
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
        uint256 proposalId = governor.propose(targets, values, calldatas, "Proposal description");
        vm.stopPrank();

        // Fast forward to after vote start
        vm.roll(governor.proposalSnapshot(proposalId) + 1);

        // Vote
        vm.prank(account2);
        governor.castVote(proposalId, 1); // Vote "for"
        vm.stopPrank();
        vm.prank(account3);
        governor.castVote(proposalId, 0); // Vote "against"
        vm.stopPrank();
        vm.prank(account4);
        governor.castVote(proposalId, 2); // Vote "abstain"
        vm.stopPrank();

        // Fast forward to vote end
        vm.roll(governor.proposalDeadline(proposalId) + 1);

        // Get vote results
        (uint256 votesAgainst, uint256 votesFor, uint256 votesAbstain) = governor.proposalVotes(proposalId);
        assertEq(votesFor, 10000000e18);
        assertEq(votesAgainst, 2000000e18);
        assertEq(votesAbstain, 3000000e18);

        IGovernor.ProposalState state = governor.state(proposalId);
        assertEq(uint256(state), uint256(IGovernor.ProposalState.Succeeded));

        // Queue proposal
        governor.queue(targets, values, calldatas, keccak256(bytes("Proposal description")));
        vm.warp(governor.proposalEta(proposalId) + 1);

        governor.execute(targets, values, calldatas, keccak256("Proposal description"));
        state = governor.state(proposalId);
        assertEq(uint256(state), uint256(IGovernor.ProposalState.Executed));
    }

    function testSecurityCouncilShouldBeAbleToExecuteRollback() public {
        // Create a proposal
        address[] memory targets = new address[](1);
        targets[0] = address(zeroExMock);

        uint256[] memory values = new uint256[](1);
        values[0] = 0;

        bytes[] memory calldatas = new bytes[](1);
        bytes4 testFunctionSig = 0xc853c969;
        address testFunctionImpl = 0x5615dEB798BB3E4dFa0139dFa1b3D433Cc23b72f;
        calldatas[0] = abi.encodeWithSignature("rollback(bytes4,address)", testFunctionSig, testFunctionImpl);

        // Security council adds the batch of rollbacks to the queue
        vm.startPrank(securityCouncil);

        bytes32 proposalId = timelock.hashOperationBatch(
            targets,
            values,
            calldatas,
            0,
            keccak256(bytes("Emergency rollback"))
        );
        vm.expectEmit(false, false, false, false);
        emit CallExecuted(proposalId, 0, targets[0], values[0], calldatas[0]);

        protocolGovernor.executeRollback(targets, values, calldatas, keccak256(bytes("Emergency rollback")));
    }

    function testSecurityCouncilShouldNotBeAbleToExecuteArbitraryFunctions() public {
        // Create a proposal
        address[] memory targets = new address[](1);
        targets[0] = address(callReceiverMock);

        uint256[] memory values = new uint256[](1);
        values[0] = 0;

        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = abi.encodeWithSignature("mockFunction()");

        // Security council tries to
        vm.startPrank(securityCouncil);

        bytes32 proposalId = timelock.hashOperationBatch(
            targets,
            values,
            calldatas,
            0,
            keccak256(bytes("Proposal description"))
        );
        vm.expectRevert("TimelockController: Not a rollback call");
        protocolGovernor.executeRollback(targets, values, calldatas, keccak256(bytes("Proposal description")));
    }
}
