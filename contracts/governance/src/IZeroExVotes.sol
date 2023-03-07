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

/// @custom:security-contact security@0xproject.com
interface IZeroExVotes {
    struct Checkpoint {
        uint32 fromBlock;
        uint96 votes;
        uint48 quadraticVotes;
    }

    /**
     * @dev Emitted when a token transfer or delegate change,
     * results in changes to a delegate's quadratic number of votes.
     */
    event DelegateQuadraticVotesChanged(
        address indexed delegate,
        uint256 previousQuadraticBalance,
        uint256 newQuadraticBalance
    );

    /**
     * @dev Emitted when a token transfer or delegate change, results in changes to a delegate's number of votes.
     */
    event DelegateVotesChanged(address indexed delegate, uint256 previousBalance, uint256 newBalance);

    /**
     * @dev Emitted when the total supply of the token is changed due to minting and burning which results in
     * the total supply checkpoint being writtenor updated.
     */
    event TotalSupplyChanged(uint256 totalSupplyVotes, uint256 totalSupplyQuadraticVotes);

    /**
     * @dev Emitted a new checkpoint is written.
     */
    event CheckpointAdded(uint256 blockNumber, uint256 totalSupplyVotes, uint256 totalSupplyQuadraticVotes);

    /**
     * @dev Emitted when an existing checkpoint is updated.
     */
    event CheckpointUpdated(uint256 blockNumber, uint256 totalSupplyVotes, uint256 totalSupplyQuadraticVotes);

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

    /**
     * @dev Retrieve the sqrt of `totalSupply` at the end of `blockNumber`. Note, this value is the square root of the
     * sum of all balances.
     * It is but NOT the sum of all the sqrt of the delegated votes!
     *
     * Requirements:
     *
     * - `blockNumber` must have been already mined
     */
    function getPastQuadraticTotalSupply(uint256 blockNumber) external view returns (uint256);

    /**
     * @dev Moves the voting power for an account with balance `delegateBalance` from `srcDelegatee` to `dstDelegatee`.
     * Note that if the delegator isn't delegating to anyone before the function call `srcDelegatee` = address(0)
     */
    function moveEntireVotingPower(address srcDelegatee, address dstDelegatee, uint256 delegateBalance) external;

    /**
     * @dev Moves the voting power corresponding to `amount` number of tokens from `srcDelegatee` to `dstDelegatee`.
     * Note that if the delegator isn't delegating to anyone before the function call `srcDelegatee` = address(0)
     * @param srcDelegatee the delegatee we are moving voting power away from
     * @param dstDelegatee the delegatee we are moving voting power to
     * @param srcDelegateBalance balance of the delegate whose delegatee is `srcDelegatee`.
     * This is value _after_ the transfer.
     * @param dstDelegateBalance balance of the delegate whose delegatee is `dstDelegatee`.
     * This is value _after_ the transfer.
     * @param amount The amount of tokens transferred from the source delegate to destination delegate.
     */
    function movePartialVotingPower(
        address srcDelegatee,
        address dstDelegatee,
        uint256 srcDelegateBalance,
        uint256 dstDelegateBalance,
        uint256 amount
    ) external;

    function writeCheckpointTotalSupplyMint(address account, uint256 amount, uint256 accountBalance) external;

    function writeCheckpointTotalSupplyBurn(address account, uint256 amount, uint256 accountBalance) external;
}
