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

contract ZeroExTreasuryGovernorTest is ZeroExGovernorBaseTest {
    function setUp() public {
        governorName = "ZeroExTreasuryGovernor";
        proposalThreshold = 5e11;
        quorum = 23e11;

        address governorAddress;
        (token, wToken, votes, , timelock, , governorAddress) = setupGovernance();
        governor = IZeroExGovernor(governorAddress);

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
        assertEq(votesFor, Math.sqrt(10000000e18));
        assertEq(votesAgainst, Math.sqrt(2000000e18));
        assertEq(votesAbstain, Math.sqrt(3000000e18));

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
