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

import "@0x/contracts-utils/contracts/src/v06/errors/LibRichErrorsV06.sol";
import "@0x/contracts-utils/contracts/src/v06/LibSafeMathV06.sol";
import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";
import "@0x/contracts-erc20/contracts/src/v06/LibERC20TokenV06.sol";
import "../errors/LibTransformERC20RichErrors.sol";
import "./Transformer.sol";
import "./LibERC20Transformer.sol";


/// @dev A transformer that transfers tokens to arbitrary addresses.
contract PositiveSlippageFeeTransformer is
    Transformer
{
    using LibRichErrorsV06 for bytes;
    using LibSafeMathV06 for uint256;
    using LibERC20Transformer for IERC20TokenV06;

    /// @dev Information for a single fee.
    struct TokenFee {
        // The token to transfer to `recipient`.
        IERC20TokenV06 token;
        // Amount of each `token` to transfer to `recipient`.
        uint256 bestCaseAmount;
        // Recipient of `token`.
        address payable recipient;
    }

    /// @dev Transfers tokens to recipients.
    /// @param context Context information.
    /// @return success The success bytes (`LibERC20Transformer.TRANSFORMER_SUCCESS`).
    function transform(TransformContext calldata context)
        external
        override
    returns (bytes4 success)
    {
        TokenFee memory fee = abi.decode(context.data, (TokenFee));

        uint256 transformerAmount = LibERC20Transformer.getTokenBalanceOf(fee.token, address(this));
        if (transformerAmount > fee.bestCaseAmount) {
            uint256 positiveSlippageAmount = transformerAmount - fee.bestCaseAmount;
            fee.token.transformerTransfer(fee.recipient, positiveSlippageAmount);
        }

        return LibERC20Transformer.TRANSFORMER_SUCCESS;
    }
}
