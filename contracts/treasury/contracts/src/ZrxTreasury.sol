// SPDX-License-Identifier: Apache-2.0
/*

  Copyright 2021 ZeroEx Intl.

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

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";
import "@0x/contracts-erc20/contracts/src/v06/LibERC20TokenV06.sol";
import "@0x/contracts-utils/contracts/src/v06/LibBytesV06.sol";
import "@0x/contracts-utils/contracts/src/v06/LibSafeMathV06.sol";
import "@0x/contracts-utils/contracts/src/v06/errors/LibRichErrorsV06.sol";
import "@0x/contracts-zero-ex/contracts/src/features/libs/LibSignature.sol";
import "./IZrxTreasury.sol";


contract ZrxTreasury is
    IZrxTreasury
{
    using LibERC20TokenV06 for IERC20TokenV06;
    using LibSafeMathV06 for uint256;
    using LibRichErrorsV06 for bytes;
    using LibBytesV06 for bytes;

    // Immutables
    IStaking public immutable override stakingProxy;
    DefaultPoolOperator public immutable override defaultPoolOperator;
    bytes32 public immutable override defaultPoolId;
    uint256 public immutable override votingPeriod;
    uint256 public immutable override proposalThreshold;
    uint256 public immutable override quorumThreshold;

    // Storage
    Proposal[] public proposals;
    mapping (uint256 => mapping (address => bool)) public hasVoted;

    /// @dev Initializes the ZRX treasury and creates the default
    ///      staking pool.
    /// @param stakingProxy_ The 0x staking proxy contract.
    /// @param weth_ The WETH token contract.
    /// @param params Immutable treasury parameters.
    constructor(
        IStaking stakingProxy_,
        IERC20TokenV06 weth_,
        TreasuryParameters memory params
    )
        public
    {
        require(
            params.votingPeriod < stakingProxy_.epochDurationInSeconds(),
            "VOTING_PERIOD_TOO_LONG"
        );
        stakingProxy = stakingProxy_;
        DefaultPoolOperator defaultPoolOperator_ = new DefaultPoolOperator(
            stakingProxy_,
            weth_
        );
        defaultPoolOperator = defaultPoolOperator_;
        defaultPoolId = defaultPoolOperator_.poolId();
        votingPeriod = params.votingPeriod;
        proposalThreshold = params.proposalThreshold;
        quorumThreshold = params.quorumThreshold;
    }

    // solhint-disable
    /// @dev Allows this contract to receive ether.
    receive() external payable {}
    // solhint-enable

    /// @dev Creates a proposal to send ZRX from this treasury on the
    ///      the given actions. Must have at least `proposalThreshold`
    ///      of voting power to call this function. See `getVotingPower`
    ///      for how voting power is computed. If a proposal is successfully
    ///      created, voting starts at the epoch after next (currentEpoch + 2).
    ///      If the vote passes, the proposal is executable during the
    ///      `executionEpoch`. See `hasProposalPassed` for the passing criteria.
    /// @param actions The proposed ZRX actions. An action specifies a
    ///        contract call.
    /// @param executionEpoch The epoch during which the proposal is to
    ///        be executed if it passes. Must be at least two epochs
    ///        from the current epoch.
    /// @param description A text description for the proposal.
    /// @param operatedPoolIds The pools operated by `msg.sender`. The
    ///        ZRX currently delegated to those pools will be accounted
    ///        for in the voting power.
    /// @return proposalId The ID of the newly created proposal.
    function propose(
        ProposedAction[] memory actions,
        uint256 executionEpoch,
        string memory description,
        bytes32[] memory operatedPoolIds
    )
        public
        override
        returns (uint256 proposalId)
    {
        require(
            getVotingPower(msg.sender, operatedPoolIds) >= proposalThreshold,
            "propose/INSUFFICIENT_VOTING_POWER"
        );
        require(
            actions.length > 0,
            "propose/NO_ACTIONS_PROPOSED"
        );
        uint256 currentEpoch = stakingProxy.currentEpoch();
        require(
            executionEpoch >= currentEpoch + 2,
            "propose/INVALID_EXECUTION_EPOCH"
        );

        proposalId = proposalCount();
        Proposal storage newProposal = proposals.push();
        newProposal.actionsHash = keccak256(abi.encode(actions));
        newProposal.executionEpoch = executionEpoch;
        newProposal.voteEpoch = currentEpoch + 2;

        emit ProposalCreated(
            msg.sender,
            operatedPoolIds,
            proposalId,
            actions,
            executionEpoch,
            description
        );
    }

    /// @dev Casts a vote for the given proposal. Only callable
    ///      during the voting period for that proposal. See
    ///      `getVotingPower` for how voting power is computed.
    /// @param proposalId The ID of the proposal to vote on.
    /// @param support Whether to support the proposal or not.
    /// @param operatedPoolIds The pools operated by `msg.sender`. The
    ///        ZRX currently delegated to those pools will be accounted
    ///        for in the voting power.
    function castVote(
        uint256 proposalId,
        bool support,
        bytes32[] memory operatedPoolIds
    )
        public
        override
    {
        if (proposalId >= proposalCount()) {
            revert("castVote/INVALID_PROPOSAL_ID");
        }
        if (hasVoted[proposalId][msg.sender]) {
            revert("castVote/ALREADY_VOTED");
        }

        Proposal memory proposal = proposals[proposalId];
        if (
            proposal.voteEpoch != stakingProxy.currentEpoch() ||
            _hasVoteEnded(proposal.voteEpoch)
        ) {
            revert("castVote/VOTING_IS_CLOSED");
        }

        uint256 votingPower = getVotingPower(msg.sender, operatedPoolIds);
        if (votingPower == 0) {
            revert("castVote/NO_VOTING_POWER");
        }

        if (support) {
            proposals[proposalId].votesFor = proposals[proposalId].votesFor
                .safeAdd(votingPower);
            hasVoted[proposalId][msg.sender] = true;
        } else {
            proposals[proposalId].votesAgainst = proposals[proposalId].votesAgainst
                .safeAdd(votingPower);
            hasVoted[proposalId][msg.sender] = true;
        }

        emit VoteCast(
            msg.sender,
            operatedPoolIds,
            proposalId,
            support,
            votingPower
        );
    }

    /// @dev Executes a proposal that has passed and is
    ///      currently executable.
    /// @param proposalId The ID of the proposal to execute.
    /// @param actions Actions associated with the proposal to execute.
    function execute(uint256 proposalId, ProposedAction[] memory actions)
        public
        payable
        override
    {
        if (proposalId >= proposalCount()) {
            revert("execute/INVALID_PROPOSAL_ID");
        }
        Proposal memory proposal = proposals[proposalId];
        _assertProposalExecutable(proposal, actions);

        proposals[proposalId].executed = true;

        for (uint256 i = 0; i != actions.length; i++) {
            ProposedAction memory action = actions[i];
            (bool didSucceed, ) = action.target.call{value: action.value}(action.data);
            require(
                didSucceed,
                "execute/ACTION_EXECUTION_FAILED"
            );
        }

        emit ProposalExecuted(proposalId);
    }

    /// @dev Returns the total number of proposals.
    /// @return count The number of proposals.
    function proposalCount()
        public
        override
        view
        returns (uint256 count)
    {
        return proposals.length;
    }

    /// @dev Computes the current voting power of the given account.
    ///      Voting power is equal to:
    ///      (ZRX delegated to the default pool) +
    ///      0.5 * (ZRX delegated to other pools) +
    ///      0.5 * (ZRX delegated to pools operated by account)
    /// @param account The address of the account.
    /// @param operatedPoolIds The pools operated by `account`. The
    ///        ZRX currently delegated to those pools will be accounted
    ///        for in the voting power.
    /// @return votingPower The current voting power of the given account.
    function getVotingPower(address account, bytes32[] memory operatedPoolIds)
        public
        override
        view
        returns (uint256 votingPower)
    {
        uint256 delegatedBalance = stakingProxy.getOwnerStakeByStatus(
            account,
            IStaking.StakeStatus.DELEGATED
        ).currentEpochBalance;
        uint256 balanceDelegatedToDefaultPool = stakingProxy.getStakeDelegatedToPoolByOwner(
            account,
            defaultPoolId
        ).currentEpochBalance;

        // Voting power for ZRX delegated to the default pool is not diluted,
        // so we double-count the balance delegated to the default pool before
        // dividing by 2.
        votingPower = delegatedBalance
            .safeAdd(balanceDelegatedToDefaultPool)
            .safeDiv(2);

        // Add voting power for operated staking pools.
        for (uint256 i = 0; i != operatedPoolIds.length; i++) {
            IStaking.Pool memory pool = stakingProxy.getStakingPool(operatedPoolIds[i]);
            require(
                pool.operator == account,
                "getVotingPower/POOL_NOT_OPERATED_BY_ACCOUNT"
            );
            uint96 stakeDelegatedToPool = stakingProxy
                .getTotalStakeDelegatedToPool(operatedPoolIds[i])
                .currentEpochBalance;
            uint256 poolVotingPower = uint256(stakeDelegatedToPool).safeDiv(2);
            votingPower = votingPower.safeAdd(poolVotingPower);
        }

        return votingPower;
    }

    /// @dev Checks whether the given proposal is executable.
    ///      Reverts if not.
    /// @param proposal The proposal to check.
    function _assertProposalExecutable(
        Proposal memory proposal,
        ProposedAction[] memory actions
    )
        private
        view
    {
        require(
            keccak256(abi.encode(actions)) == proposal.actionsHash,
            "_assertProposalExecutable/INVALID_ACTIONS"
        );
        require(
            _hasProposalPassed(proposal),
            "_assertProposalExecutable/PROPOSAL_HAS_NOT_PASSED"
        );
        require(
            !proposal.executed,
            "_assertProposalExecutable/PROPOSAL_ALREADY_EXECUTED"
        );
        require(
            stakingProxy.currentEpoch() == proposal.executionEpoch,
            "_assertProposalExecutable/CANNOT_EXECUTE_THIS_EPOCH"
        );
    }

    /// @dev Checks whether the given proposal has passed or not.
    /// @param proposal The proposal to check.
    /// @return hasPassed Whether the proposal has passed.
    function _hasProposalPassed(Proposal memory proposal)
        private
        view
        returns (bool hasPassed)
    {
        // Proposal is not passed until the vote is over.
        if (!_hasVoteEnded(proposal.voteEpoch)) {
            return false;
        }
        // Must have >50% support.
        if (proposal.votesFor <= proposal.votesAgainst) {
            return false;
        }
        // Must reach quorum threshold.
        if (proposal.votesFor < quorumThreshold) {
            return false;
        }
        return true;
    }

    /// @dev Checks whether a vote starting at the given
    ///      epoch has ended or not.
    /// @param voteEpoch The epoch at which the vote started.
    /// @return hasEnded Whether the vote has ended.
    function _hasVoteEnded(uint256 voteEpoch)
        private
        view
        returns (bool hasEnded)
    {
        uint256 currentEpoch = stakingProxy.currentEpoch();
        if (currentEpoch < voteEpoch) {
            return false;
        }
        if (currentEpoch > voteEpoch) {
            return true;
        }
        // voteEpoch == currentEpoch
        // Vote ends at currentEpochStartTime + votingPeriod
        uint256 voteEndTime = stakingProxy
            .currentEpochStartTimeInSeconds()
            .safeAdd(votingPeriod);
        return block.timestamp > voteEndTime;
    }
}
