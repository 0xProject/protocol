// SPDX-License-Identifier: Apache-2.0
/*

  Copyright 2019 ZeroEx Intl.

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

pragma solidity ^0.6;
pragma experimental ABIEncoderV2;

import "@0x/contracts-utils/contracts/src/v06/LibSafeMathV06.sol";


interface IERC1155Receiver {

    /// @notice Handle the receipt of a single ERC1155 token type
    /// @dev The smart contract calls this function on the recipient
    /// after a `safeTransferFrom`. This function MAY throw to revert and reject the
    /// transfer. Return of other than the magic value MUST result in the
    ///transaction being reverted
    /// Note: the contract address is always the message sender
    /// @param operator  The address which called `safeTransferFrom` function
    /// @param from      The address which previously owned the token
    /// @param id        An array containing the ids of the token being transferred
    /// @param value     An array containing the amount of tokens being transferred
    /// @param data      Additional data with no specified format
    /// @return success  `bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))`
    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    )
        external
        returns(bytes4 success);

    /// @notice Handle the receipt of multiple ERC1155 token types
    /// @dev The smart contract calls this function on the recipient
    /// after a `safeTransferFrom`. This function MAY throw to revert and reject the
    /// transfer. Return of other than the magic value MUST result in the
    /// transaction being reverted
    /// Note: the contract address is always the message sender
    /// @param operator  The address which called `safeTransferFrom` function
    /// @param from      The address which previously owned the token
    /// @param ids       An array containing ids of each token being transferred
    /// @param values    An array containing amounts of each token being transferred
    /// @param data      Additional data with no specified format
    /// @return success  `bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))`
    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    )
        external
        returns(bytes4 success);
}

contract TestMintableERC1155Token {
    using LibSafeMathV06 for uint256;

    /// @dev Either TransferSingle or TransferBatch MUST emit when tokens are transferred,
    ///      including zero value transfers as well as minting or burning.
    /// Operator will always be msg.sender.
    /// Either event from address `0x0` signifies a minting operation.
    /// An event to address `0x0` signifies a burning or melting operation.
    /// The total value transferred from address 0x0 minus the total value transferred to 0x0 may
    /// be used by clients and exchanges to be added to the "circulating supply" for a given token ID.
    /// To define a token ID with no initial balance, the contract SHOULD emit the TransferSingle event
    /// from `0x0` to `0x0`, with the token creator as `_operator`.
    event TransferSingle(
        address indexed operator,
        address indexed from,
        address indexed to,
        uint256 id,
        uint256 value
    );

    /// @dev Either TransferSingle or TransferBatch MUST emit when tokens are transferred,
    ///      including zero value transfers as well as minting or burning.
    ///Operator will always be msg.sender.
    /// Either event from address `0x0` signifies a minting operation.
    /// An event to address `0x0` signifies a burning or melting operation.
    /// The total value transferred from address 0x0 minus the total value transferred to 0x0 may
    /// be used by clients and exchanges to be added to the "circulating supply" for a given token ID.
    /// To define multiple token IDs with no initial balance, this SHOULD emit the TransferBatch event
    /// from `0x0` to `0x0`, with the token creator as `_operator`.
    event TransferBatch(
        address indexed operator,
        address indexed from,
        address indexed to,
        uint256[] ids,
        uint256[] values
    );

    /// @dev MUST emit when an approval is updated.
    event ApprovalForAll(
        address indexed owner,
        address indexed operator,
        bool approved
    );

    // selectors for receiver callbacks
    bytes4 constant public ERC1155_RECEIVED       = 0xf23a6e61;
    bytes4 constant public ERC1155_BATCH_RECEIVED = 0xbc197c81;

    // id => (owner => balance)
    mapping (uint256 => mapping(address => uint256)) internal balances;

    // owner => (operator => approved)
    mapping (address => mapping(address => bool)) internal operatorApproval;


    function mint(
        address to,
        uint256 id,
        uint256 quantity
    )
        external
    {
        // Grant the items to the caller
        balances[id][to] = quantity.safeAdd(balances[id][to]);

        // Emit the Transfer/Mint event.
        // the 0x0 source address implies a mint
        // It will also provide the circulating supply info.
        emit TransferSingle(
            msg.sender,
            address(0x0),
            to,
            id,
            quantity
        );

        // if `to` is a contract then trigger its callback
        uint256 receiverCodeSize;
        assembly {
            receiverCodeSize := extcodesize(to)
        }
        if (receiverCodeSize > 0) {
            bytes4 callbackReturnValue = IERC1155Receiver(to).onERC1155Received(
                msg.sender,
                msg.sender,
                id,
                quantity,
                ""
            );
            require(
                callbackReturnValue == ERC1155_RECEIVED,
                "BAD_RECEIVER_RETURN_VALUE"
            );
        }
    }

    /// @notice Transfers value amount of an _id from the _from address to the _to address specified.
    /// @dev MUST emit TransferSingle event on success.
    /// Caller must be approved to manage the _from account's tokens (see isApprovedForAll).
    /// MUST throw if `_to` is the zero address.
    /// MUST throw if balance of sender for token `_id` is lower than the `_value` sent.
    /// MUST throw on any other error.
    /// When transfer is complete, this function MUST check if `_to` is a smart contract (code size > 0).
    /// If so, it MUST call `onERC1155Received` on `_to` and revert if the return value
    /// is not `bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))`.
    /// @param from    Source address
    /// @param to      Target address
    /// @param id      ID of the token type
    /// @param value   Transfer amount
    /// @param data    Additional data with no specified format, sent in call to `_to`
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 value,
        bytes calldata data
    )
        external
    {
        // sanity checks
        require(
            to != address(0x0),
            "CANNOT_TRANSFER_TO_ADDRESS_ZERO"
        );
        require(
            from == msg.sender || operatorApproval[from][msg.sender] == true,
            "INSUFFICIENT_ALLOWANCE"
        );

        // perform transfer
        balances[id][from] = balances[id][from].safeSub(value);
        balances[id][to] = balances[id][to].safeAdd(value);

        emit TransferSingle(msg.sender, from, to, id, value);

        // if `to` is a contract then trigger its callback
        uint256 receiverCodeSize;
        assembly {
            receiverCodeSize := extcodesize(to)
        }
        if (receiverCodeSize > 0) {
            bytes4 callbackReturnValue = IERC1155Receiver(to).onERC1155Received(
                msg.sender,
                from,
                id,
                value,
                data
            );
            require(
                callbackReturnValue == ERC1155_RECEIVED,
                "BAD_RECEIVER_RETURN_VALUE"
            );
        }
    }

    /// @notice Send multiple types of Tokens from a 3rd party in one transfer (with safety call).
    /// @dev MUST emit TransferBatch event on success.
    /// Caller must be approved to manage the _from account's tokens (see isApprovedForAll).
    /// MUST throw if `_to` is the zero address.
    /// MUST throw if length of `_ids` is not the same as length of `_values`.
    ///  MUST throw if any of the balance of sender for token `_ids` is lower than the respective `_values` sent.
    /// MUST throw on any other error.
    /// When transfer is complete, this function MUST check if `_to` is a smart contract (code size > 0).
    /// If so, it MUST call `onERC1155BatchReceived` on `_to` and revert if the return value
    /// is not `bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))`.
    /// @param from    Source addresses
    /// @param to      Target addresses
    /// @param ids     IDs of each token type
    /// @param values  Transfer amounts per token type
    /// @param data    Additional data with no specified format, sent in call to `_to`
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    )
        external
    {
        // sanity checks
        require(
            to != address(0x0),
            "CANNOT_TRANSFER_TO_ADDRESS_ZERO"
        );
        require(
            ids.length == values.length,
            "TOKEN_AND_VALUES_LENGTH_MISMATCH"
        );

        // Only supporting a global operator approval allows us to do
        // only 1 check and not to touch storage to handle allowances.
        require(
            from == msg.sender || operatorApproval[from][msg.sender] == true,
            "INSUFFICIENT_ALLOWANCE"
        );

        // perform transfers
        for (uint256 i = 0; i < ids.length; ++i) {
            // Cache value to local variable to reduce read costs.
            uint256 id = ids[i];
            uint256 value = values[i];

            balances[id][from] = balances[id][from].safeSub(value);
            balances[id][to] = balances[id][to].safeAdd(value);
        }
        emit TransferBatch(msg.sender, from, to, ids, values);

        // if `to` is a contract then trigger its callback
        uint256 receiverCodeSize;
        assembly {
            receiverCodeSize := extcodesize(to)
        }
        if (receiverCodeSize > 0) {
            bytes4 callbackReturnValue = IERC1155Receiver(to).onERC1155BatchReceived(
                msg.sender,
                from,
                ids,
                values,
                data
            );
            require(
                callbackReturnValue == ERC1155_BATCH_RECEIVED,
                "BAD_RECEIVER_RETURN_VALUE"
            );
        }
    }

    /// @notice Enable or disable approval for a third party ("operator") to manage all of the caller's tokens.
    /// @dev MUST emit the ApprovalForAll event on success.
    /// @param operator  Address to add to the set of authorized operators
    /// @param approved  True if the operator is approved, false to revoke approval
    function setApprovalForAll(address operator, bool approved) external {
        operatorApproval[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    /// @notice Queries the approval status of an operator for a given owner.
    /// @param owner        The owner of the Tokens
    /// @param operator     Address of authorized operator
    /// @return isApproved  True if the operator is approved, false if not
    function isApprovedForAll(address owner, address operator) external view returns (bool isApproved) {
        return operatorApproval[owner][operator];
    }

    /// @notice Get the balance of an account's Tokens.
    /// @param owner     The address of the token holder
    /// @param id        ID of the Token
    /// @return balance  The _owner's balance of the Token type requested
    function balanceOf(address owner, uint256 id) external view returns (uint256 balance) {
        return balances[id][owner];
    }

    /// @notice Get the balance of multiple account/token pairs
    /// @param owners      The addresses of the token holders
    /// @param ids         ID of the Tokens
    /// @return balances_  The _owner's balance of the Token types requested
    function balanceOfBatch(address[] calldata owners, uint256[] calldata ids) external view returns (uint256[] memory balances_) {
        // sanity check
        require(
            owners.length == ids.length,
            "OWNERS_AND_IDS_MUST_HAVE_SAME_LENGTH"
        );

        // get balances
        balances_ = new uint256[](owners.length);
        for (uint256 i = 0; i < owners.length; ++i) {
            uint256 id = ids[i];
            balances_[i] = balances[id][owners[i]];
        }

        return balances_;
    }
}
