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

import {ZeroExVotes} from "../src/ZeroExVotes.sol";
import {SafeCast} from "@openzeppelin/utils/math/SafeCast.sol";
import {Math} from "@openzeppelin/utils/math/Math.sol";
import {CubeRoot} from "./CubeRoot.sol";

contract ZeroExVotesMigration is ZeroExVotes {
    uint32 public migrationBlock;

    function initialize(address, uint256) public virtual override {
        revert();
    }

    function initialize() public virtual onlyProxy reinitializer(2) {
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

        (bool success, Checkpoint storage checkpoint) = _checkpointsLookup(_checkpoints[account], blockNumber);
        if (!success) {
            return 0;
        }
        if (checkpoint.fromBlock <= migrationBlock) {
            return 0;
        }
        return _toMigration(checkpoint).migratedVotes;
    }

    // TODO: we're not handling totalSupply

    // TODO: need to return the migrated weight
    function _writeCheckpoint(
        Checkpoint[] storage ckpts,
        function(uint256, uint256) view returns (uint256) op,
        uint256 userBalance,
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

        // Remove the entire sqrt userBalance from quadratic voting power.
        // Note that `userBalance` is value _after_ transfer.
        if (pos > 0) {
            uint256 oldQuadraticVotingPower = userBalance <= quadraticThreshold
                ? userBalance
                : quadraticThreshold + Math.sqrt((userBalance - quadraticThreshold) * 1e18);
            oldCkpt.quadraticVotes -= SafeCast.toUint96(oldQuadraticVotingPower);
        }
        if (oldCkpt.fromBlock > migrationBlock) {
            oldCkpt.migratedVotes -= SafeCast.toUint32(CubeRoot.cbrt(userBalance));
        }

        // if wallet > threshold, calculate quadratic power over the treshold only, below threshold is linear
        uint256 newBalance = op(userBalance, delta);
        uint256 newQuadraticBalance = newBalance <= quadraticThreshold
            ? newBalance
            : quadraticThreshold + Math.sqrt((newBalance - quadraticThreshold) * 1e18);
        newQuadraticWeight = oldCkpt.quadraticVotes + newQuadraticBalance;
        uint256 newMigratedWeight = oldCkpt.migratedVotes + CubeRoot.cbrt(newBalance);

        if (pos > 0 && oldCkpt.fromBlock == block.number) {
            CheckpointMigration storage chpt = _toMigration(_unsafeAccess(ckpts, pos - 1));
            chpt.votes = SafeCast.toUint96(newWeight);
            chpt.quadraticVotes = SafeCast.toUint96(newQuadraticWeight);
            chpt.migratedVotes = SafeCast.toUint32(newMigratedWeight);
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
}
