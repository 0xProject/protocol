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
import "@0x/contracts-erc20/contracts/src/v06/LibERC20TokenV06.sol";
import "@0x/contracts-utils/contracts/src/v06/LibSafeMathV06.sol";
import "../../external/ILiquidityProviderSandbox.sol";
import "../../fixins/FixinTokenSpender.sol";
import "../../vendor/ILiquidityProvider.sol";
import "../interfaces/IMultiplexFeature.sol";


abstract contract MultiplexLiquidityProvider is
    FixinTokenSpender
{
    using LibERC20TokenV06 for IERC20TokenV06;
    using LibSafeMathV06 for uint256;

    event LiquidityProviderSwap(
        address inputToken,
        address outputToken,
        uint256 inputTokenAmount,
        uint256 outputTokenAmount,
        address provider,
        address recipient
    );

    /// @dev The sandbox contract address.
    ILiquidityProviderSandbox public immutable sandbox;

    constructor(ILiquidityProviderSandbox sandbox_)
        internal
    {
        sandbox = sandbox_;
    }

    // Same as the LiquidityProviderFeature, but without the transfer in
    // (which is potentially done in the previous hop of a multi-hop fill)
    // and without the minBuyAmount check (which is performed at the top, i.e.
    // in either `batchFill` or `multiHopFill`).
    function _batchSellLiquidityProvider(
        IMultiplexFeature.BatchSellState memory state,
        IMultiplexFeature.BatchSellParams memory params,
        bytes memory wrappedCallData,
        uint256 sellAmount
    )
        internal
    {
        (address provider, bytes memory auxiliaryData) = abi.decode(
            wrappedCallData,
            (address, bytes)
        );

        if (params.useSelfBalance) {
            _transferERC20Tokens(
                params.inputToken,
                provider,
                sellAmount
            );
        } else {
            _transferERC20TokensFrom(
                params.inputToken,
                msg.sender,
                provider,
                sellAmount
            );
        }

        uint256 balanceBefore = params.outputToken
            .compatBalanceOf(params.recipient);

        sandbox.executeSellTokenForToken(
            ILiquidityProvider(provider),
            params.inputToken,
            params.outputToken,
            params.recipient,
            0,
            auxiliaryData
        );

        uint256 boughtAmount = params.outputToken
            .compatBalanceOf(params.recipient)
            .safeSub(balanceBefore);

        emit LiquidityProviderSwap(
            address(params.inputToken),
            address(params.outputToken),
            sellAmount,
            boughtAmount,
            provider,
            params.recipient
        );

        // Increment the sold and bought amounts.
        state.soldAmount = state.soldAmount.safeAdd(sellAmount);
        state.boughtAmount = state.boughtAmount.safeAdd(boughtAmount);
    }

    function _multiHopSellLiquidityProvider(
        IMultiplexFeature.MultiHopSellState memory state,
        IMultiplexFeature.MultiHopSellParams memory params,
        bytes memory wrappedCallData
    )
        internal
    {
        IERC20TokenV06 inputToken = IERC20TokenV06(params.tokens[state.hopIndex]);
        IERC20TokenV06 outputToken = IERC20TokenV06(params.tokens[state.hopIndex + 1]);

        (address provider, bytes memory auxiliaryData) = abi.decode(
            wrappedCallData,
            (address, bytes)
        );

        uint256 balanceBefore = outputToken
            .compatBalanceOf(state.nextTarget);

        sandbox.executeSellTokenForToken(
            ILiquidityProvider(provider),
            inputToken,
            outputToken,
            state.nextTarget,
            0,
            auxiliaryData
        );

        uint256 sellAmount = state.outputTokenAmount;
        state.outputTokenAmount = outputToken
            .compatBalanceOf(state.nextTarget)
            .safeSub(balanceBefore);

        emit LiquidityProviderSwap(
            address(inputToken),
            address(outputToken),
            sellAmount,
            state.outputTokenAmount,
            provider,
            state.nextTarget
        );
    }
}
