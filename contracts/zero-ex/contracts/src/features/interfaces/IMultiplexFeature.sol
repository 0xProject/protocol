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

    enum MultiplexSubcall {
        Invalid,
        RFQ,
        UniswapV2,
        UniswapV3,
        LiquidityProvider,
        TransformERC20,
        BatchSell,
        MultiHopSell
    }

    struct BatchSellParams {
        // The token being sold.
        IERC20TokenV06 inputToken;
        // The token being bought.
        IERC20TokenV06 outputToken;
        // The amount of `inputToken` to sell.
        uint256 sellAmount;
        // The nested calls to perform.
        BatchSellSubcall[] calls;

        bool useSelfBalance;
        address recipient;
    }

    // Represents a call nested within a `batchFill`.
    struct BatchSellSubcall {
        // The function to call.
        MultiplexSubcall id;
        // Amount of `inputToken` to sell.
        uint256 sellAmount;
        // ABI-encoded parameters needed to perform the call.
        bytes data;
    }

    // Parameters for `multiHopFill`.
    struct MultiHopSellParams {
        // The sell path, i.e.
        // tokens = [inputToken, hopToken1, ..., hopTokenN, outputToken]
        address[] tokens;
        // The amount of `tokens[0]` to sell.
        uint256 sellAmount;
        // The nested calls to perform.
        MultiHopSellSubcall[] calls;

        bool useSelfBalance;
        address recipient;
    }

    // Represents a call nested within a `multiHopFill`.
    struct MultiHopSellSubcall {
        // The function to call.
        MultiplexSubcall id;
        // ABI-encoded parameters needed to perform the call.
        bytes data;
    }

    struct BatchSellState {
        // Tracks the amount of input token sold.
        uint256 soldAmount;
        // Tracks the amount of output token bought.
        uint256 boughtAmount;
    }

    struct MultiHopSellState {
        // This variable is used as the input and output amounts of
        // each hop. After the final hop, this will contain the output
        // amount of the multi-hop fill.
        uint256 outputTokenAmount;
        // This variable is used to cache the address to target in the
        // next hop. See `_computeHopRecipient` for details.
        address currentTarget;
        address nextTarget;
        uint256 hopIndex;
    }

    function multiplexBatchSellEthForToken(
        IERC20TokenV06 outputToken,
        BatchSellSubcall[] calldata calls,
        uint256 minBuyAmount
    )
        external
        payable
        returns (uint256 boughtAmount);

    function multiplexBatchSellTokenForEth(
        IERC20TokenV06 inputToken,
        BatchSellSubcall[] calldata calls,
        uint256 sellAmount,
        uint256 minBuyAmount
    )
        external
        returns (uint256 boughtAmount);

    function multiplexBatchSellTokenForToken(
        IERC20TokenV06 inputToken,
        IERC20TokenV06 outputToken,
        BatchSellSubcall[] calldata calls,
        uint256 sellAmount,
        uint256 minBuyAmount
    )
        external
        returns (uint256 boughtAmount);

    function multiplexMultiHopSellEthForToken(
        address[] calldata tokens,
        MultiHopSellSubcall[] calldata calls,
        uint256 minBuyAmount
    )
        external
        payable
        returns (uint256 boughtAmount);

    function multiplexMultiHopSellTokenForEth(
        address[] calldata tokens,
        MultiHopSellSubcall[] calldata calls,
        uint256 sellAmount,
        uint256 minBuyAmount
    )
        external
        returns (uint256 boughtAmount);

    function multiplexMultiHopSellTokenForToken(
        address[] calldata tokens,
        MultiHopSellSubcall[] calldata calls,
        uint256 sellAmount,
        uint256 minBuyAmount
    )
        external
        returns (uint256 boughtAmount);
}
