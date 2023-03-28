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

import "@0x/contracts-erc20/src/v06/LibERC20TokenV06.sol";
import "@0x/contracts-erc20/src/IERC20Token.sol";
import "../IBridgeAdapter.sol";

interface ILBRouter {
    /// @notice Swaps exact tokens for tokens while performing safety checks
    /// @param amountIn The amount of token to send
    /// @param amountOutMin The min amount of token to receive
    /// @param pairBinSteps The bin step of the pairs (0: V1, other values will use V2)
    /// @param tokenPath The swap path using the binSteps following `_pairBinSteps`
    /// @param to The address of the recipient
    /// @param deadline The deadline of the tx
    /// @return amountOut Output amount of the swap
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        uint256[] memory pairBinSteps,
        IERC20Token[] memory tokenPath,
        address to,
        uint256 deadline
    ) external returns (uint256 amountOut);
}

contract MixinTraderJoeV2 {
    using LibERC20TokenV06 for IERC20Token;

    function _tradeTraderJoeV2(
        IERC20Token buyToken,
        uint256 sellAmount,
        bytes memory bridgeData
    ) internal returns (uint256 boughtAmount) {
        ILBRouter router;
        IERC20Token[] memory tokenPath;
        uint256[] memory pairBinSteps;
        {
            address[] memory _path;
            (router, _path, pairBinSteps) = abi.decode(bridgeData, (ILBRouter, address[], uint256[]));
            // To get around `abi.decode()` not supporting interface array types.
            assembly {
                tokenPath := _path
            }
        }

        require(tokenPath.length >= 2, "MixinTraderJoeV2/PATH_LENGTH_MUST_BE_AT_LEAST_TWO");
        require(
            tokenPath.length == pairBinSteps.length + 1,
            "MixinTraderJoeV2/PAIR_BIN_STEPS_LENGTH_MUST_BE_ONE_LESS_THAN_TOKEN_PATH_LENGTH"
        );
        require(
            tokenPath[tokenPath.length - 1] == buyToken,
            "MixinTraderJoeV2/LAST_ELEMENT_OF_PATH_MUST_MATCH_OUTPUT_TOKEN"
        );
        // Grant the Trader Joe V2 router an allowance to sell the first token.
        tokenPath[0].approveIfBelow(address(router), sellAmount);

        boughtAmount = router.swapExactTokensForTokens(
            sellAmount,
            1,
            pairBinSteps,
            tokenPath,
            address(this),
            block.timestamp
        );
    }
}
