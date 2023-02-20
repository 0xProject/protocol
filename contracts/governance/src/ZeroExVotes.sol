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

import "@openzeppelin/utils/math/SafeCast.sol";
import "@openzeppelin/utils/math/Math.sol";
import "@openzeppelin/token/ERC20/ERC20.sol";
import "@openzeppelin/governance/utils/IVotes.sol";
import "./IZeroExVotes.sol";

contract ZeroExVotes is IZeroExVotes {
    address public token;

    mapping(address => Checkpoint[]) private _checkpoints;
    Checkpoint[] private _totalSupplyCheckpoints;

    modifier onlyToken() {
        require(msg.sender == token, "Only the token is allowed to perform this operation");
        _;
    }

    function initialize(address _token) public {
        require(token == address(0), "ZeroExVotes: Already initialized");
        token = _token;
    }

    /**
     * @inheritdoc IZeroExVotes
     */
    function checkpoints(address account, uint32 pos) public view override returns (Checkpoint memory) {
        return _checkpoints[account][pos];
    }

    /**
     * @inheritdoc IZeroExVotes
     */
    function numCheckpoints(address account) public view override returns (uint32) {
        return SafeCast.toUint32(_checkpoints[account].length);
    }

    /**
     * @inheritdoc IZeroExVotes
     */
    function getVotes(address account) public view override returns (uint256) {
        uint256 pos = _checkpoints[account].length;
        return pos == 0 ? 0 : _checkpoints[account][pos - 1].votes;
    }

    /**
     * @inheritdoc IZeroExVotes
     */
    function getQuadraticVotes(address account) public view override returns (uint256) {
        uint256 pos = _checkpoints[account].length;
        return pos == 0 ? 0 : _checkpoints[account][pos - 1].quadraticVotes;
    }

    /**
     * @inheritdoc IZeroExVotes
     */
    function getPastVotes(address account, uint256 blockNumber) public view override returns (uint256) {
        require(blockNumber < block.number, "ZeroExVotes: block not yet mined");

        Checkpoint memory checkpoint = _checkpointsLookup(_checkpoints[account], blockNumber);
        return checkpoint.votes;
    }

    /**
     * @inheritdoc IZeroExVotes
     */
    function getPastQuadraticVotes(address account, uint256 blockNumber) public view override returns (uint256) {
        require(blockNumber < block.number, "ZeroExVotes: block not yet mined");

        Checkpoint memory checkpoint = _checkpointsLookup(_checkpoints[account], blockNumber);
        return checkpoint.quadraticVotes;
    }

    /**
     * @inheritdoc IZeroExVotes
     */
    function getPastTotalSupply(uint256 blockNumber) public view override returns (uint256) {
        require(blockNumber < block.number, "ZeroExVotes: block not yet mined");

        // Note that due to the disabled updates of `_totalSupplyCheckpoints` in `writeCheckpointTotalSupply` function
        // this always returns 0.
        Checkpoint memory checkpoint = _checkpointsLookup(_totalSupplyCheckpoints, blockNumber);
        return checkpoint.votes;
    }

    /**
     * @inheritdoc IZeroExVotes
     */
    function getPastQuadraticTotalSupply(uint256 blockNumber) public view override returns (uint256) {
        require(blockNumber < block.number, "ZeroExVotes: block not yet mined");

        // Note that due to the disabled updates of `_totalSupplyCheckpoints` in `writeCheckpointTotalSupply` function
        // this always returns 0.
        Checkpoint memory checkpoint = _checkpointsLookup(_totalSupplyCheckpoints, blockNumber);
        return checkpoint.quadraticVotes;
    }

    /**
     * @inheritdoc IZeroExVotes
     */
    function moveEntireVotingPower(
        address srcDelegatee,
        address dstDelegatee,
        uint256 delegateBalance
    ) public override onlyToken {
        if (srcDelegatee != dstDelegatee && delegateBalance > 0) {
            if (srcDelegatee != address(0)) {
                uint256 pos = _checkpoints[srcDelegatee].length;
                Checkpoint memory oldCkptSrcDelegate = pos == 0
                    ? Checkpoint(0, 0, 0)
                    : _unsafeAccess(_checkpoints[srcDelegatee], pos - 1);

                uint256 newLinearBalance = oldCkptSrcDelegate.votes - delegateBalance;
                uint256 newQuadraticBalance = oldCkptSrcDelegate.quadraticVotes - Math.sqrt(delegateBalance);

                _writeCheckpoint(_checkpoints[srcDelegatee], newLinearBalance, newQuadraticBalance);

                emit DelegateVotesChanged(srcDelegatee, oldCkptSrcDelegate.votes, newLinearBalance);

                emit DelegateQuadraticVotesChanged(
                    srcDelegatee,
                    oldCkptSrcDelegate.quadraticVotes,
                    newQuadraticBalance
                );
            }

            if (dstDelegatee != address(0)) {
                uint256 pos = _checkpoints[dstDelegatee].length;
                Checkpoint memory oldCkptDstDelegate = pos == 0
                    ? Checkpoint(0, 0, 0)
                    : _unsafeAccess(_checkpoints[dstDelegatee], pos - 1);

                uint256 newLinearBalance = oldCkptDstDelegate.votes + delegateBalance;
                uint256 newQuadraticBalance = oldCkptDstDelegate.quadraticVotes + Math.sqrt(delegateBalance);

                _writeCheckpoint(_checkpoints[dstDelegatee], newLinearBalance, newQuadraticBalance);

                emit DelegateVotesChanged(dstDelegatee, oldCkptDstDelegate.votes, newLinearBalance);

                emit DelegateQuadraticVotesChanged(
                    dstDelegatee,
                    oldCkptDstDelegate.quadraticVotes,
                    newQuadraticBalance
                );
            }
        }
    }

    /**
     * @inheritdoc IZeroExVotes
     */
    function movePartialVotingPower(
        address srcDelegatee,
        address dstDelegatee,
        uint256 srcDelegateBalance,
        uint256 dstDelegateBalance,
        uint256 amount
    ) public override onlyToken {
        if (srcDelegatee != dstDelegatee && amount > 0) {
            if (srcDelegatee != address(0)) {
                uint256 pos = _checkpoints[srcDelegatee].length;
                Checkpoint memory oldCkptSrcDelegate = pos == 0
                    ? Checkpoint(0, 0, 0)
                    : _unsafeAccess(_checkpoints[srcDelegatee], pos - 1);

                // Remove the entire source delegator's sqrt balance from delegatee's voting power.
                // `srcDelegateBalance` is value _after_ transfer so add the amount that was transferred.
                if (pos > 0)
                    oldCkptSrcDelegate.quadraticVotes -= SafeCast.toUint48(Math.sqrt(srcDelegateBalance + amount));

                uint256 newLinearBalance = oldCkptSrcDelegate.votes - amount;
                uint256 newQuadraticBalance = oldCkptSrcDelegate.quadraticVotes + Math.sqrt(srcDelegateBalance);

                _writeCheckpoint(_checkpoints[srcDelegatee], newLinearBalance, newQuadraticBalance);

                emit DelegateVotesChanged(srcDelegatee, oldCkptSrcDelegate.votes, newLinearBalance);

                emit DelegateQuadraticVotesChanged(
                    srcDelegatee,
                    oldCkptSrcDelegate.quadraticVotes,
                    newQuadraticBalance
                );
            }

            if (dstDelegatee != address(0)) {
                uint256 pos = _checkpoints[dstDelegatee].length;
                Checkpoint memory oldCkptDstDelegate = pos == 0
                    ? Checkpoint(0, 0, 0)
                    : _unsafeAccess(_checkpoints[dstDelegatee], pos - 1);

                // Remove the entire destination delegator's sqrt balance from delegatee's voting power.
                // `dstDelegateBalance` is value _after_ transfer so remove the amount that was transferred.
                if (pos > 0)
                    oldCkptDstDelegate.quadraticVotes -= SafeCast.toUint48(Math.sqrt(dstDelegateBalance - amount));

                uint256 newLinearBalance = oldCkptDstDelegate.votes + amount;
                uint256 newQuadraticBalance = oldCkptDstDelegate.quadraticVotes + Math.sqrt(dstDelegateBalance);

                _writeCheckpoint(_checkpoints[dstDelegatee], newLinearBalance, newQuadraticBalance);

                emit DelegateVotesChanged(dstDelegatee, oldCkptDstDelegate.votes, newLinearBalance);

                emit DelegateQuadraticVotesChanged(
                    dstDelegatee,
                    oldCkptDstDelegate.quadraticVotes,
                    newQuadraticBalance
                );
            }
        }
    }

    /**
     * @inheritdoc IZeroExVotes
     */
    function writeCheckpointTotalSupply(uint256 totalSupply) public override onlyToken {
        // Currently we don't keep track of total supply checkpoints as all governance settings are fixed numbers
        // i.e. governance quorum is not a percentage of total
        // _writeCheckpoint(_totalSupplyCheckpoints, totalSupply, Math.sqrt(totalSupply));
    }

    /**
     * @dev Lookup a value in a list of (sorted) checkpoints.
     * Implementation as in openzeppelin/token/ERC20/extensions/ERC20Votes.sol except here we return the entire
     * checkpoint rather than part of it
     */
    function _checkpointsLookup(
        Checkpoint[] storage ckpts,
        uint256 blockNumber
    ) private view returns (Checkpoint memory) {
        // We run a binary search to look for the earliest checkpoint taken after `blockNumber`.
        //
        // Initially we check if the block is recent to narrow the search range.
        // During the loop, the index of the wanted checkpoint remains in the range [low-1, high).
        // With each iteration, either `low` or `high` is moved towards the middle of the range to maintain the
        // invariant.
        // - If the middle checkpoint is after `blockNumber`, we look in [low, mid)
        // - If the middle checkpoint is before or equal to `blockNumber`, we look in [mid+1, high)
        // Once we reach a single value (when low == high), we've found the right checkpoint at the index high-1, if not
        // out of bounds (in which case we're looking too far in the past and the result is 0).
        // Note that if the latest checkpoint available is exactly for `blockNumber`, we end up with an index that is
        // past the end of the array, so we technically don't find a checkpoint after `blockNumber`, but it works out
        // the same.
        uint256 length = ckpts.length;

        uint256 low = 0;
        uint256 high = length;

        if (length > 5) {
            uint256 mid = length - Math.sqrt(length);
            if (_unsafeAccess(ckpts, mid).fromBlock > blockNumber) {
                high = mid;
            } else {
                low = mid + 1;
            }
        }

        while (low < high) {
            uint256 mid = Math.average(low, high);
            if (_unsafeAccess(ckpts, mid).fromBlock > blockNumber) {
                high = mid;
            } else {
                low = mid + 1;
            }
        }

        // Leaving here for posterity this is the original OZ implementation which we've replaced
        // return high == 0 ? 0 : _unsafeAccess(ckpts, high - 1).votes;
        Checkpoint memory checkpoint = high == 0 ? Checkpoint(0, 0, 0) : _unsafeAccess(ckpts, high - 1);
        return checkpoint;
    }

    /**
     * Alternative version of openzeppelin/token/ERC20/extensions/ERC20Votes.sol implementation
     * which accepts the new voting weight values directly as opposed to calculating these within the function
     * based on a addition/subtraction operation.
     */
    function _writeCheckpoint(Checkpoint[] storage ckpts, uint256 voteWeight, uint256 quadraticVoteWeight) private {
        uint256 pos = ckpts.length;

        if (pos > 0 && _unsafeAccess(ckpts, pos - 1).fromBlock == block.number) {
            Checkpoint storage chpt = _unsafeAccess(ckpts, pos - 1);
            chpt.votes = SafeCast.toUint96(voteWeight);
            chpt.quadraticVotes = SafeCast.toUint48(quadraticVoteWeight);
        } else {
            ckpts.push(
                Checkpoint({
                    fromBlock: SafeCast.toUint32(block.number),
                    votes: SafeCast.toUint96(voteWeight),
                    quadraticVotes: SafeCast.toUint48(quadraticVoteWeight)
                })
            );
        }
    }

    /**
     * @dev Access an element of the array without performing bounds check. The position is assumed to be within bounds.
     * Implementation from openzeppelin/token/ERC20/extensions/ERC20Votes.sol
     * https://github.com/ethereum/solidity/issues/9117
     */
    function _unsafeAccess(Checkpoint[] storage ckpts, uint256 pos) private pure returns (Checkpoint storage result) {
        assembly {
            mstore(0, ckpts.slot)
            result.slot := add(keccak256(0, 0x20), pos)
        }
    }
}
