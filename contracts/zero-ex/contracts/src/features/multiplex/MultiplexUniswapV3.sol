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
import "@0x/contracts-utils/contracts/src/v06/LibSafeMathV06.sol";
import "../../fixins/FixinTokenSpender.sol";
import "../interfaces/IMultiplexFeature.sol";
import "../interfaces/IUniswapV3Feature.sol";


abstract contract MultiplexUniswapV3 is
    FixinTokenSpender
{
    using LibSafeMathV06 for uint256;

    function _batchSellUniswapV3(
        IMultiplexFeature.BatchSellState memory state,
        IMultiplexFeature.BatchSellParams memory params,
        bytes memory wrappedCallData,
        uint256 sellAmount
    )
        internal
    {
        bool success;
        bytes memory resultData;
        if (params.useSelfBalance) {
            // If the tokens are held by `address(this)`, we call
            // the `onlySelf` variant `_sellHeldTokenForTokenToUniswapV3`,
            // which uses the Exchange Proxy's balance of input token.
            (success, resultData) = address(this).call(
                abi.encodeWithSelector(
                    IUniswapV3Feature._sellHeldTokenForTokenToUniswapV3.selector,
                    wrappedCallData,
                    sellAmount,
                    0,
                    params.recipient
                )
            );
        } else {
            // Otherwise, we self-delegatecall the normal variant
            // `sellTokenForTokenToUniswapV3`, which pulls the input token
            // from `msg.sender`.
            (success, resultData) = address(this).delegatecall(
                abi.encodeWithSelector(
                    IUniswapV3Feature.sellTokenForTokenToUniswapV3.selector,
                    wrappedCallData,
                    sellAmount,
                    0,
                    params.recipient
                )
            );
        }
        if (success) {
            // Decode the output token amount on success.
            uint256 outputTokenAmount = abi.decode(resultData, (uint256));
            // Increment the sold and bought amounts.
            state.soldAmount = state.soldAmount.safeAdd(sellAmount);
            state.boughtAmount = state.boughtAmount.safeAdd(outputTokenAmount);
        }
    }

    function _multiHopSellUniswapV3(
        IMultiplexFeature.MultiHopSellState memory state,
        bytes memory wrappedCallData
    )
        internal
    {
        bool success;
        bytes memory resultData;
        if (state.from == address(this)) {
            // If the tokens are held by `address(this)`, we call
            // the `onlySelf` variant `_sellHeldTokenForTokenToUniswapV3`,
            // which uses the Exchange Proxy's balance of input token.
            (success, resultData) = address(this).call(
                abi.encodeWithSelector(
                    IUniswapV3Feature._sellHeldTokenForTokenToUniswapV3.selector,
                    wrappedCallData,
                    state.outputTokenAmount,
                    0,
                    state.to
                )
            );
        } else {
            // Otherwise, we self-delegatecall the normal variant
            // `sellTokenForTokenToUniswapV3`, which pulls the input token
            // from `msg.sender`.
            (success, resultData) = address(this).delegatecall(
                abi.encodeWithSelector(
                    IUniswapV3Feature.sellTokenForTokenToUniswapV3.selector,
                    wrappedCallData,
                    state.outputTokenAmount,
                    0,
                    state.to
                )
            );
        }
        if (success) {
            // Decode the output token amount on success.
            state.outputTokenAmount = abi.decode(resultData, (uint256));
        } else {
            revert("MultiplexUniswapV3::_multiHopSellUniswapV3/SWAP_FAILED");
        }
    }
}
