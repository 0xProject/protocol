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

        Checkpoint memory checkpoint = _checkpointsLookup(_totalSupplyCheckpoints, blockNumber);
        return checkpoint.votes;
    }

    /**
     * @inheritdoc IZeroExVotes
     */
    function moveVotingPower(
        address src,
        address dst,
        uint256 srcDelegatorBalance,
        uint256 dstDelegatorBalance,
        uint256 amount
    ) public override onlyToken {
        if (src != dst && amount > 0) {
            if (src != address(0)) {
                // Linear vote weight update
                (uint256 oldWeight, uint256 newWeight) = _writeCheckpoint(_checkpoints[src], _subtract, amount);

                // Quadratic vote weight update
                uint256 quadraticSrcDelegatorBalanceBeforeTransfer = Math.sqrt(srcDelegatorBalance + amount); // sqrt of balance of sender before transfer
                //todo if (_checkpoints[src] > 0) _writeCheckpoint(_checkpoints[src], _subtract, quadraticSrcDelegatorBalanceBeforeTransfer);

                uint256 quadraticSrcDelegatorBalanceAfterTransfer = Math.sqrt(srcDelegatorBalance); // sqrt of balance of sender before transfer
                (uint256 oldQuadraticWeight, uint256 newQuadraticWeight) = _writeCheckpoint(
                    _checkpoints[src],
                    _add,
                    quadraticSrcDelegatorBalanceAfterTransfer
                );

                emit DelegateVotesChanged(src, oldWeight, newWeight, oldQuadraticWeight, newQuadraticWeight);
            }

            if (dst != address(0)) {
                // Linear vote weight update
                (uint256 oldWeight, uint256 newWeight) = _writeCheckpoint(_checkpoints[dst], _add, amount);

                // Quadratic vote weight update
                uint256 quadraticDstDelegatorBalanceBeforeTransfer = Math.sqrt(dstDelegatorBalance - amount); // sqrt of balance of recipient before transfer
                _writeCheckpoint(_checkpoints[dst], _subtract, quadraticDstDelegatorBalanceBeforeTransfer);

                uint256 quadraticDstDelegatorBalanceAfterTransfer = Math.sqrt(dstDelegatorBalance);
                (uint256 oldQuadraticWeight, uint256 newQuadraticWeight) = _writeCheckpoint(
                    _checkpoints[dst],
                    _add,
                    quadraticDstDelegatorBalanceAfterTransfer
                );

                emit DelegateVotesChanged(dst, oldWeight, newWeight, oldQuadraticWeight, newQuadraticWeight);
            }
        }
    }

    /**
     * @inheritdoc IZeroExVotes
     */
    function writeCheckpointTotalSupply(uint256 totalSupply) public override onlyToken {
        _writeCheckpoint(_totalSupplyCheckpoints, totalSupply);
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
        // With each iteration, either `low` or `high` is moved towards the middle of the range to maintain the invariant.
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
        Checkpoint memory checkpoint = high > 0 ? Checkpoint(0, 0, 0) : _unsafeAccess(ckpts, high - 1);
        return checkpoint;
    }

    // function _writeCheckpoint(
    //     Checkpoint[] storage ckpts,
    //     function(uint256, uint256) view returns (uint256) op,
    //     uint256 delta
    // ) private returns (uint256 oldWeight, uint256 newWeight) {
    //     uint256 pos = ckpts.length;

    //     Checkpoint memory oldCkpt = pos == 0 ? Checkpoint(0, 0, 0) : _unsafeAccess(ckpts, pos - 1);

    //     oldWeight = oldCkpt.votes;
    //     newWeight = op(oldWeight, delta);

    //     // uint256 oldQuadraticWeight = oldCkpt.quadraticVotes;
    //     // uint256 newQuadraticWeight = op(oldQuadraticWeight, Math.sqrt(delta));

    //     if (pos > 0 && oldCkpt.fromBlock == block.number) {
    //         _unsafeAccess(ckpts, pos - 1).votes = SafeCast.toUint224(newWeight);
    //         // _unsafeAccess(ckpts, pos - 1).votes = SafeCast.toUint224(votes);
    //         // _unsafeAccess(ckpts, pos - 1).quadraticVotes = SafeCast.toUint224(quadraticVotes);
    //     } else {
    //         ckpts.push(
    //             Checkpoint({
    //                 fromBlock: SafeCast.toUint32(block.number),
    //                 votes: SafeCast.toUint224(newWeight),
    //                 quadraticVotes: 0 // TODO SafeCast.toUint224(quadraticVotes)
    //             })
    //         );
    //     }
    // }

    /**
     * Alternative version of openzeppelin/token/ERC20/extensions/ERC20Votes.sol implementation
     * which accepts the new voting weight value directly as opposed to calculating in within the function
     * based on a sub/add operation required.
     */
    function _writeCheckpoint(Checkpoint[] storage ckpts, uint256 newWeight) private {
        uint256 pos = ckpts.length;
        Checkpoint memory oldCkpt = pos == 0 ? Checkpoint(0, 0, 0) : _unsafeAccess(ckpts, pos - 1);

        if (pos > 0 && oldCkpt.fromBlock == block.number) {
            _unsafeAccess(ckpts, pos - 1).votes = SafeCast.toUint224(newWeight);
        } else {
            ckpts.push(Checkpoint({fromBlock: SafeCast.toUint32(block.number), votes: SafeCast.toUint224(newWeight)}));
        }
    }

    /**
     * @dev Access an element of the array without performing bounds check. The position is assumed to be within bounds.
     * Implementation as in openzeppelin/token/ERC20/extensions/ERC20Votes.sol
     * https://github.com/ethereum/solidity/issues/9117
     */
    function _unsafeAccess(Checkpoint[] storage ckpts, uint256 pos) private pure returns (Checkpoint storage result) {
        assembly {
            mstore(0, ckpts.slot)
            result.slot := add(keccak256(0, 0x20), pos)
        }
    }
}
