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

import {ZeroExVotes} from "../../src/ZeroExVotes.sol";
import {SafeCast} from "@openzeppelin/utils/math/SafeCast.sol";
import {Math} from "@openzeppelin/utils/math/Math.sol";
import {CubeRoot} from "./CubeRoot.sol";

contract ZeroExVotesMigration is ZeroExVotes {
    uint32 public migrationBlock;

    constructor(address _token, uint256 _quadraticThreshold) ZeroExVotes(_token, _quadraticThreshold) {}

    function initialize() public virtual override onlyProxy reinitializer(2) {
        migrationBlock = uint32(block.number);
    }

    struct CheckpointMigration {
        uint32 fromBlock;
        uint96 votes;
        uint96 quadraticVotes;
        uint32 migratedVotes;
    }

    function _toMigration(Checkpoint storage ckpt) internal pure returns (CheckpointMigration storage result) {
        assembly {
            result.slot := ckpt.slot
        }
    }

    function _toMigration(Checkpoint[] storage ckpt) internal pure returns (CheckpointMigration[] storage result) {
        assembly {
            result.slot := ckpt.slot
        }
    }

    function getMigratedVotes(address account) public view returns (uint256) {
        uint256 pos = _checkpoints[account].length;
        if (pos == 0) {
            return 0;
        }
        Checkpoint storage ckpt = _unsafeAccess(_checkpoints[account], pos - 1);
        if (ckpt.fromBlock <= migrationBlock) {
            return 0;
        }
        return _toMigration(ckpt).migratedVotes;
    }

    function getPastMigratedVotes(address account, uint256 blockNumber) public view returns (uint256) {
        require(blockNumber < block.number, "ZeroExVotesMigration: block not yet mined");
        if (blockNumber <= migrationBlock) {
            return 0;
        }

        Checkpoint storage checkpoint = _checkpointsLookupStorage(_checkpoints[account], blockNumber);
        if (checkpoint.fromBlock <= migrationBlock) {
            return 0;
        }
        return _toMigration(checkpoint).migratedVotes;
    }

    function _checkpointsLookupStorage(
        Checkpoint[] storage ckpts,
        uint256 blockNumber
    ) internal view returns (Checkpoint storage result) {
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
        // Checkpoint memory checkpoint = high == 0 ? Checkpoint(0, 0, 0) : _unsafeAccess(ckpts, high - 1);
        // return checkpoint;
        // TODO: bad. very bad. only works on accident
        if (high > 0) {
            result = _unsafeAccess(ckpts, high - 1);
        } else {
            // suppress compiler warning, which really shouldn't be suppressed
            assembly {
                result.slot := 0xDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEF
            }
        }
    }

    // TODO: we're not handling totalSupply

    // TODO: need to return the migrated weight
    function _writeCheckpoint(
        Checkpoint[] storage ckpts,
        function(uint256, uint256) view returns (uint256) op,
        uint256 userBalance,
        uint96 balanceLastUpdated,
        uint256 delta
    )
        internal
        virtual
        override
        returns (uint256 oldWeight, uint256 newWeight, uint256 oldQuadraticWeight, uint256 newQuadraticWeight)
    {
        uint256 pos = ckpts.length;

        CheckpointMigration memory oldCkpt = pos == 0
            ? CheckpointMigration(0, 0, 0, 0)
            : _toMigration(_unsafeAccess(ckpts, pos - 1));

        oldWeight = oldCkpt.votes;
        newWeight = op(oldWeight, delta);

        oldQuadraticWeight = oldCkpt.quadraticVotes;

        if (pos > 0) {
            deductOldWeightFromCheckpoint(oldCkpt, userBalance, balanceLastUpdated);
        }

        // if wallet > threshold, calculate quadratic power over the treshold only, below threshold is linear
        uint256 newBalance = op(userBalance, delta);
        uint256 newQuadraticBalance = newBalance <= quadraticThreshold
            ? newBalance
            : quadraticThreshold + Math.sqrt((newBalance - quadraticThreshold) * 1e18);
        newQuadraticWeight = oldCkpt.quadraticVotes + newQuadraticBalance;
        uint256 newMigratedWeight = oldCkpt.migratedVotes + CubeRoot.cbrt(newBalance);

        if (pos > 0 && oldCkpt.fromBlock == block.number) {
            addCheckpoint(ckpts, pos, newWeight, newQuadraticWeight, newMigratedWeight);
        } else {
            _toMigration(ckpts).push(
                CheckpointMigration({
                    fromBlock: SafeCast.toUint32(block.number),
                    votes: SafeCast.toUint96(newWeight),
                    quadraticVotes: SafeCast.toUint96(newQuadraticWeight),
                    migratedVotes: SafeCast.toUint32(newMigratedWeight)
                })
            );
        }
    }

    function deductOldWeightFromCheckpoint(
        CheckpointMigration memory oldCkpt,
        uint256 userBalance,
        uint96 balanceLastUpdated
    ) internal {
        // Remove the entire sqrt userBalance from quadratic voting power.
        // Note that `userBalance` is value _after_ transfer.
        uint256 oldQuadraticVotingPower = userBalance <= quadraticThreshold
            ? userBalance
            : quadraticThreshold + Math.sqrt((userBalance - quadraticThreshold) * 1e18);
        oldCkpt.quadraticVotes -= SafeCast.toUint96(oldQuadraticVotingPower);

        if (balanceLastUpdated > migrationBlock) {
            oldCkpt.migratedVotes -= SafeCast.toUint32(CubeRoot.cbrt(userBalance));
        }
    }

    function addCheckpoint(
        Checkpoint[] storage ckpts,
        uint256 pos,
        uint256 newWeight,
        uint256 newQuadraticWeight,
        uint256 newMigratedWeight
    ) internal {
        CheckpointMigration storage chpt = _toMigration(_unsafeAccess(ckpts, pos - 1));
        chpt.votes = SafeCast.toUint96(newWeight);
        chpt.quadraticVotes = SafeCast.toUint96(newQuadraticWeight);
        chpt.migratedVotes = SafeCast.toUint32(newMigratedWeight);
    }
}
