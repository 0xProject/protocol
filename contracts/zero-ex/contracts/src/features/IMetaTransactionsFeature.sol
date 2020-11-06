/*

  Copyright 2020 ZeroEx Intl.

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

pragma solidity ^0.6.5;
pragma experimental ABIEncoderV2;

import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";
import "./libs/LibSignature.sol";

/// @dev Meta-transactions feature.
interface IMetaTransactionsFeature {
<<<<<<< HEAD
=======
    /// @dev Describes the state of a meta transaction.
    struct ExecuteState {
        // Sender of the meta-transaction.
        address sender;
        // Hash of the meta-transaction data.
        bytes32 hash;
        // The meta-transaction data.
        MetaTransactionData mtx;
        // The meta-transaction signature (by `mtx.signer`).
        LibSignature.Signature signature;
        // The selector of the function being called.
        bytes4 selector;
        // The ETH balance of this contract before performing the call.
        uint256 selfBalance;
        // The block number at which the meta-transaction was executed.
        uint256 executedBlockNumber;
    }

>>>>>>> refactor MetaTransactionsFeature to unpack signatures early and pass around ExecuteStates
    /// @dev Describes an exchange proxy meta transaction.
    struct MetaTransactionData {
        // Signer of meta-transaction. On whose behalf to execute the MTX.
        address payable signer;
        // Required sender, or NULL for anyone.
        address sender;
        // Minimum gas price.
        uint256 minGasPrice;
        // Maximum gas price.
        uint256 maxGasPrice;
        // MTX is invalid after this time.
        uint256 expirationTimeSeconds;
        // Nonce to make this MTX unique.
        uint256 salt;
        // Encoded call data to a function on the exchange proxy.
        bytes callData;
        // Amount of ETH to attach to the call.
        uint256 value;
        // ERC20 fee `signer` pays `sender`.
        IERC20TokenV06 feeToken;
        // ERC20 fee amount.
        uint256 feeAmount;
    }

    /// @dev Emitted whenever a meta-transaction is executed via
    ///      `executeMetaTransaction()` or `executeMetaTransactions()`.
    /// @param hash The meta-transaction hash.
    /// @param selector The selector of the function being executed.
    /// @param signer Who to execute the meta-transaction on behalf of.
    /// @param sender Who executed the meta-transaction.
    event MetaTransactionExecuted(
        bytes32 hash,
        bytes4 indexed selector,
        address signer,
        address sender
    );

    /// @dev Execute a single meta-transaction.
    /// @param mtx The meta-transaction.
    /// @param signature The signature by `mtx.signer`.
    /// @return returnResult The ABI-encoded result of the underlying call.
    function executeMetaTransaction(
        MetaTransactionData calldata mtx,
        LibSignature.Signature calldata signature
    )
        external
        payable
        returns (bytes memory returnResult);

    /// @dev Execute multiple meta-transactions.
    /// @param mtxs The meta-transactions.
    /// @param signatures The signature by each respective `mtx.signer`.
    /// @return returnResults The ABI-encoded results of the underlying calls.
    function batchExecuteMetaTransactions(
        MetaTransactionData[] calldata mtxs,
        LibSignature.Signature[] calldata signatures
    )
        external
        payable
        returns (bytes[] memory returnResults);

    /// @dev Execute a meta-transaction via `sender`. Privileged variant.
    ///      Only callable from within.
    /// @param state The `ExecuteState` for this metatransaction, with `sender`,
    ///              `hash`, `mtx`, and `signature` fields filled.
    /// @return returnResult The ABI-encoded result of the underlying call.
    function _executeMetaTransaction(ExecuteState memory state)
        external
        payable
        returns (bytes memory returnResult);

    /// @dev Get the block at which a meta-transaction has been executed.
    /// @param mtx The meta-transaction.
    /// @return blockNumber The block height when the meta-transactioin was executed.
    function getMetaTransactionExecutedBlock(MetaTransactionData calldata mtx)
        external
        view
        returns (uint256 blockNumber);

    /// @dev Get the block at which a meta-transaction hash has been executed.
    /// @param mtxHash The meta-transaction hash.
    /// @return blockNumber The block height when the meta-transactioin was executed.
    function getMetaTransactionHashExecutedBlock(bytes32 mtxHash)
        external
        view
        returns (uint256 blockNumber);

    /// @dev Get the EIP712 hash of a meta-transaction.
    /// @param mtx The meta-transaction.
    /// @return mtxHash The EIP712 hash of `mtx`.
    function getMetaTransactionHash(MetaTransactionData calldata mtx)
        external
        view
        returns (bytes32 mtxHash);
}
