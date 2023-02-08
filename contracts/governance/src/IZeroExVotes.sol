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

/// @custom:security-contact security@0xproject.com
interface IZeroExVotes {
    struct Checkpoint {
        uint32 fromBlock;
        uint224 votes;
        uint224 quadraticVotes;
    }

    enum VotingType {
        OneTokenOneVote,
        Quadratic
    }

    /**
     * @dev Emitted when a token transfer or delegate change results in changes to a delegate's number of votes.
     */
    event DelegateVotesChanged(
        address indexed delegate,
        uint256 previousLinearBalance,
        uint256 newLinearBalance,
        uint256 previousQuadraticBalance,
        uint256 newQuadraticBalance
    );

    /**
     * @dev Get the `pos`-th checkpoint for `account`.
     */
    function checkpoints(address account, uint32 pos) external view returns (Checkpoint memory);

    /**
     * @dev Get number of checkpoints for `account`.
     */
    function numCheckpoints(address account) external view returns (uint32);

    /**
     * @dev Gets the current votes balance for `account`
     */
    function getVotes(address account) external view returns (uint256);

    /**
     * @dev Gets the current quadratic votes balance for `account`
     */
    function getQuadraticVotes(address account) external view returns (uint256);

    /**
     * @dev Retrieve the number of votes for `account` at the end of `blockNumber`.
     *
     * Requirements:
     *
     * - `blockNumber` must have been already mined
     */
    function getPastVotes(address account, uint256 blockNumber) external view returns (uint256);

    /**
     * @dev Retrieve the number of quadratic votes for `account` at the end of `blockNumber`.
     *
     * Requirements:
     *
     * - `blockNumber` must have been already mined
     */
    function getPastQuadraticVotes(address account, uint256 blockNumber) external view returns (uint256);

    /**
     * @dev Retrieve the `totalSupply` at the end of `blockNumber`. Note, this value is the sum of all balances.
     * It is but NOT the sum of all the delegated votes!
     *
     * Requirements:
     *
     * - `blockNumber` must have been already mined
     */
    function getPastTotalSupply(uint256 blockNumber) external view returns (uint256);

    function moveVotingPower(address src, address dst, uint256 srcBalance, uint256 dstBalance, uint256 amount) external;

    function writeCheckpointAddTotalSupply(uint256 delta) external returns (uint256 oldWeight, uint256 newWeight);

    function writeCheckpointSubTotalSupply(uint256 delta) external returns (uint256 oldWeight, uint256 newWeight);
}
