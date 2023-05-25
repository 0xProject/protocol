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

pragma solidity ^0.6.5;
pragma experimental ABIEncoderV2;

import "@0x/contracts-utils/contracts/src/v06/LibBytesV06.sol";
import "../fixins/FixinCommon.sol";
import "../fixins/FixinEIP712.sol";
import "./interfaces/IFeature.sol";
import "./interfaces/IDCAFeature.sol";
import "./libs/LibSignature.sol";
import "../migrations/LibMigrate.sol";
import "./interfaces/ITransformERC20Feature.sol";

import "forge-std/Test.sol";

/// @dev DCA feature.
contract DCAFeature is IFeature, IDCAFeature, FixinCommon, FixinEIP712 {
    using LibBytesV06 for bytes;
    using LibRichErrorsV06 for bytes;

    /// @dev Describes the state of the DCA.
    struct ExecuteState {
        // Hash of the DCA order.
        bytes32 hash;
        // The DCA order data;
        DCAData dca;
        // The DCA signature (by `dca.signer`).
        LibSignature.Signature signature;
        // The calldata to fill for the current iteration of the DCA.
        bytes swapCalldata;
    }

    /// @dev Arguments for a `TransformERC20.transformERC20()` call.
    struct ExternalTransformERC20Args {
        IERC20Token inputToken;
        IERC20Token outputToken;
        uint256 inputTokenAmount;
        uint256 minOutputTokenAmount;
        ITransformERC20Feature.Transformation[] transformations;
    }

    /// @dev Name of this feature.
    string public constant override FEATURE_NAME = "DCA";
    /// @dev Version of this feature.
    uint256 public immutable override FEATURE_VERSION = _encodeVersion(1, 0, 0);
    /// @dev EIP712 typehash of the `DCAData` struct.
    bytes32 public constant DCA_DATA_TYPEHASH =
        keccak256(
            "DCAData("
            "address buyToken,"
            "address sellToken,"
            "uint256 sellAmount,"
            "uint256 interval,"
            "uint256 numFills,"
            "uint256 startTime,"
            "address signer"
            ")"
        );
    /// @dev number of fills executed per DCA order.
    mapping(bytes32 => uint256) public numFilled;

    constructor(address zeroExAddress) public FixinCommon() FixinEIP712(zeroExAddress) {}

    function migrate() external returns (bytes4 success) {
        _registerFeatureFunction(this.fillDCATransaction.selector);
        _registerFeatureFunction(this.getDCAHash.selector);
        return LibMigrate.MIGRATE_SUCCESS;
    }

    function fillDCATransaction(
        DCAData calldata dcaData,
        LibSignature.Signature calldata signature,
        bytes calldata swapCallData
    ) public override returns (bytes memory returnResult) {
        ExecuteState memory state;
        state.dca = dcaData;
        state.hash = getDCAHash(dcaData);
        state.signature = signature;
        state.swapCalldata = swapCallData;

        returnResult = _fillDCATransaction(state);
    }

    /// @dev Get the EIP712 hash of a dca order.
    /// @param dca The DCA order.
    /// @return dcaHash the EIP712 hash of 'dca'.
    function getDCAHash(DCAData memory dca) public view override returns (bytes32 dcaHash) {
        return
            _getEIP712Hash(
                keccak256(
                    abi.encode(
                        DCA_DATA_TYPEHASH,
                        dca.buyToken,
                        dca.sellToken,
                        dca.sellAmount,
                        dca.interval,
                        dca.numFills,
                        dca.startTime,
                        dca.signer
                    )
                )
            );
    }

    function _fillDCATransaction(ExecuteState memory state) private returns (bytes memory returnResult) {
        _validateDCATransaction(state);

        // get balances of sellToken and buyToken before we execute calldata
        uint256 sellTokenBalanceBefore = state.dca.sellToken.balanceOf(state.dca.signer);
        uint256 buyTokenBalanceBefore = state.dca.buyToken.balanceOf(state.dca.signer);

        // execute the calldata
        bytes4 selector = state.swapCalldata.readBytes4(0);
        if (selector == ITransformERC20Feature.transformERC20.selector) {
            returnResult = _executeTransformERC20Call(state);
        } else {
            revert("Unsupported swap function");
        }

        // get the balances of the sellToken and buyToken after we execute the calldata
        uint256 sellTokenBalanceAfter = state.dca.sellToken.balanceOf(state.dca.signer);
        uint256 buyTokenBalanceAfter = state.dca.buyToken.balanceOf(state.dca.signer);
        // validate deltas
        if (sellTokenBalanceAfter > sellTokenBalanceBefore) {
            revert("Sell token balance increased");
        }
        if (sellTokenBalanceBefore - sellTokenBalanceAfter != state.dca.sellAmount) {
            revert("Sell token balance delta does not match sell amount");
        }

        if (buyTokenBalanceAfter < buyTokenBalanceBefore) {
            revert("Buy token balance decreased");
        }
        // TODO query oracle to ensure minslippage is achieved

        // update storage to show that we have executed the order
        numFilled[state.hash] += 1;
    }

    function _validateDCATransaction(ExecuteState memory state) private view {
        // validate that the signature
        if (LibSignature.getSignerOfHash(state.hash, state.signature) != state.dca.signer) {
            LibSignatureRichErrors
                .SignatureValidationError(
                    LibSignatureRichErrors.SignatureValidationErrorCodes.WRONG_SIGNER,
                    state.hash,
                    state.dca.signer,
                    // TODO: Remove this field from SignatureValidationError
                    //       when rich reverts are part of the protocol repo.
                    ""
                )
                .rrevert();
        }

        // check if all DCA orders have been executed already
        if (numFilled[state.hash] == state.dca.numFills) {
            revert("All DCA orders have been executed already");
        }

        // Check that DCA order is within the right time window
        uint256 endTime = state.dca.startTime + (state.dca.interval * state.dca.numFills);
        if (block.timestamp < state.dca.startTime || block.timestamp > endTime) {
            revert("Invalid time window");
        }

        uint256 currTime = block.timestamp;
        uint256 currFill = (state.dca.numFills * (currTime - state.dca.startTime)) / (endTime - state.dca.startTime); // zero-indexed
        uint256 currWindowMidpoint = ((currFill + 1) * (endTime - state.dca.startTime)) / state.dca.numFills;
        currWindowMidpoint = currWindowMidpoint + state.dca.startTime;
        uint256 halfWindowSizeSeconds = 150; // 2.5 minutes

        uint256 currWindowStart = currWindowMidpoint < halfWindowSizeSeconds
            ? 0
            : currWindowMidpoint - halfWindowSizeSeconds;
        uint256 currWindowEnd = currWindowMidpoint + halfWindowSizeSeconds;

        if (currTime < currWindowStart || currTime > currWindowEnd) {
            console.log(
                "currTime=%d, currWindowMidpoint=%d, halfWindow=%d",
                currTime,
                currWindowMidpoint,
                halfWindowSizeSeconds
            );
            revert("Invalid time window 2");
        }
    }

    /// @dev Execute a `ITransformERC20Feature.transformERC20()` meta-transaction call
    ///      by decoding the call args and translating the call to the internal
    ///      `ITransformERC20Feature._transformERC20()` variant, where we can override
    ///      the taker address.
    function _executeTransformERC20Call(ExecuteState memory state) private returns (bytes memory returnResult) {
        // HACK(dorothy-zbornak): `abi.decode()` with the individual args
        // will cause a stack overflow. But we can prefix the call data with an
        // offset to transform it into the encoding for the equivalent single struct arg,
        // since decoding a single struct arg consumes far less stack space than
        // decoding multiple struct args.

        // Where the encoding for multiple args (with the selector ommitted)
        // would typically look like:
        // | argument                 |  offset |
        // |--------------------------|---------|
        // | inputToken               |       0 |
        // | outputToken              |      32 |
        // | inputTokenAmount         |      64 |
        // | minOutputTokenAmount     |      96 |
        // | transformations (offset) |     128 | = 32
        // | transformations (data)   |     160 |

        // We will ABI-decode a single struct arg copy with the layout:
        // | argument                 |  offset |
        // |--------------------------|---------|
        // | (arg 1 offset)           |       0 | = 32
        // | inputToken               |      32 |
        // | outputToken              |      64 |
        // | inputTokenAmount         |      96 |
        // | minOutputTokenAmount     |     128 |
        // | transformations (offset) |     160 | = 32
        // | transformations (data)   |     192 |

        ExternalTransformERC20Args memory args;
        {
            bytes memory encodedStructArgs = new bytes(state.swapCalldata.length - 4 + 32);
            // Copy the args data from the original, after the new struct offset prefix.
            bytes memory fromCallData = state.swapCalldata;
            assert(fromCallData.length >= 160);
            uint256 fromMem;
            uint256 toMem;
            assembly {
                // Prefix the calldata with a struct offset,
                // which points to just one word over.
                mstore(add(encodedStructArgs, 32), 32)
                // Copy everything after the selector.
                fromMem := add(fromCallData, 36)
                // Start copying after the struct offset.
                toMem := add(encodedStructArgs, 64)
            }
            LibBytesV06.memCopy(toMem, fromMem, fromCallData.length - 4);
            // Decode call args for `ITransformERC20Feature.transformERC20()` as a struct.
            args = abi.decode(encodedStructArgs, (ExternalTransformERC20Args));
        }
        // Call `ITransformERC20Feature._transformERC20()` (internal variant).
        return
            _callSelf(
                abi.encodeWithSelector(
                    ITransformERC20Feature._transformERC20.selector,
                    ITransformERC20Feature.TransformERC20Args({
                        taker: state.dca.signer, // taker is mtx signer
                        inputToken: args.inputToken,
                        outputToken: args.outputToken,
                        inputTokenAmount: args.inputTokenAmount,
                        minOutputTokenAmount: args.minOutputTokenAmount,
                        transformations: args.transformations,
                        useSelfBalance: false,
                        recipient: state.dca.signer
                    })
                )
            );
    }

    /// @dev Make an arbitrary internal, meta-transaction call.
    ///      Warning: Do not let unadulterated `callData` into this function.
    function _callSelf(bytes memory callData) private returns (bytes memory returnResult) {
        bool success;
        (success, returnResult) = address(this).call(callData);
        if (!success) {
            console.logBytes(returnResult);
            revert("Swap execution failed ");
        }
    }
}
