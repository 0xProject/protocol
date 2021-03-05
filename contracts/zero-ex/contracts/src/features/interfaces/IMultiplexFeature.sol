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

pragma solidity ^0.6.5;
pragma experimental ABIEncoderV2;

import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";


interface IMultiplexFeature {

    // Parameters for `batchFill`.
    struct BatchFillData {
        // The token being sold.
        IERC20TokenV06 inputToken;
        // The token being bought.
        IERC20TokenV06 outputToken;
        // The amount of `inputToken` to sell.
        uint256 sellAmount;
        // The nested calls to perform.
        WrappedBatchCall[] calls;
    }

    // Represents a call nested within a `batchFill`.
    struct WrappedBatchCall {
        // The selector of the function to call.
        bytes4 selector;
        // Amount of `inputToken` to sell.
        uint256 sellAmount;
        // ABI-encoded parameters needed to perform the call.
        bytes data;
    }

    // Parameters for `multiHopFill`.
    struct MultiHopFillData {
        // The sell path, i.e.
        // tokens = [inputToken, hopToken1, ..., hopTokenN, outputToken]
        address[] tokens;
        // The amount of `tokens[0]` to sell.
        uint256 sellAmount;
        // The nested calls to perform.
        WrappedMultiHopCall[] calls;
    }

    // Represents a call nested within a `multiHopFill`.
    struct WrappedMultiHopCall {
        // The selector of the function to call.
        bytes4 selector;
        // ABI-encoded parameters needed to perform the call.
        bytes data;
    }

    event LiquidityProviderSwap(
        address inputToken,
        address outputToken,
        uint256 inputTokenAmount,
        uint256 outputTokenAmount,
        address provider,
        address recipient
    );

    event ExpiredRfqOrder(
        bytes32 orderHash,
        address maker,
        uint64 expiry
    );

    /// @dev Executes a batch of fills selling `fillData.inputToken`
    ///      for `fillData.outputToken` in sequence. Refer to the
    ///      internal variant `_batchFill` for the allowed nested
    ///      operations.
    /// @param fillData Encodes the input/output tokens, the sell
    ///        amount, and the nested operations for this batch fill.
    /// @param minBuyAmount The minimum amount of `fillData.outputToken`
    ///        to buy. Reverts if this amount is not met.
    /// @return outputTokenAmount The amount of the output token bought.
    function batchFill(
        BatchFillData calldata fillData,
        uint256 minBuyAmount
    )
        external
        payable
        returns (uint256 outputTokenAmount);

    /// @dev Executes a sequence of fills "hopping" through the
    ///      path of tokens given by `fillData.tokens`. Refer to the
    ///      internal variant `_multiHopFill` for the allowed nested
    ///      operations.
    /// @param fillData Encodes the path of tokens, the sell amount,
    ///        and the nested operations for this multi-hop fill.
    /// @param minBuyAmount The minimum amount of the output token
    ///        to buy. Reverts if this amount is not met.
    /// @return outputTokenAmount The amount of the output token bought.
    function multiHopFill(
        MultiHopFillData calldata fillData,
        uint256 minBuyAmount
    )
        external
        payable
        returns (uint256 outputTokenAmount);
}
