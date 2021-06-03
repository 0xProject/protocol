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
import "../../vendor/IUniswapV2Pair.sol";
import "../interfaces/IMultiplexFeature.sol";


abstract contract MultiplexUniswapV2 is
    FixinTokenSpender
{
    using LibSafeMathV06 for uint256;

    // address of the UniswapV2Factory contract.
    address private constant UNISWAP_FACTORY = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
    // address of the (Sushiswap) UniswapV2Factory contract.
    address private constant SUSHISWAP_FACTORY = 0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac;
    // Init code hash of the UniswapV2Pair contract.
    uint256 private constant UNISWAP_PAIR_INIT_CODE_HASH = 0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f;
    // Init code hash of the (Sushiswap) UniswapV2Pair contract.
    uint256 private constant SUSHISWAP_PAIR_INIT_CODE_HASH = 0xe18a34eb0e04b04f7a0ac29a6e80748dca96319b42c54d679cb821dca90c6303;

    function _batchSellUniswapV2(
        IMultiplexFeature.BatchSellState memory state,
        IMultiplexFeature.BatchSellParams memory params,
        bytes memory wrappedCallData,
        uint256 sellAmount
    )
        internal
    {
        (address[] memory tokens, bool isSushi) = abi.decode(
            wrappedCallData,
            (address[], bool)
        );
        require(
            tokens.length >= 2 &&
            tokens[0] == address(params.inputToken) &&
            tokens[tokens.length - 1] == address(params.outputToken),
            "MultiplexUniswapV2::_batchSellUniswapV2/UNISWAP_INVALID_TOKENS"
        );

        address firstPairAddress = _computeUniswapPairAddress(
            tokens[0],
            tokens[1],
            isSushi
        );
        if (params.useSelfBalance) {
            _transferERC20Tokens(
                IERC20TokenV06(tokens[0]),
                firstPairAddress,
                sellAmount
            );
        } else {
            _transferERC20TokensFrom(
                IERC20TokenV06(tokens[0]),
                msg.sender,
                firstPairAddress,
                sellAmount
            );
        }

        // Perform the Uniswap/Sushiswap trade.
        uint256 boughtAmount = _sellToUniswapV2(
            tokens,
            sellAmount,
            isSushi,
            firstPairAddress,
            params.recipient
        );

        // Increment the sold and bought amounts.
        state.soldAmount = state.soldAmount.safeAdd(sellAmount);
        state.boughtAmount = state.boughtAmount.safeAdd(boughtAmount);
    }

    function _multiHopSellUniswapV2(
        IMultiplexFeature.MultiHopSellState memory state,
        IMultiplexFeature.MultiHopSellParams memory params,
        bytes memory wrappedCallData
    )
        internal
    {
        (address[] memory tokens, bool isSushi) = abi.decode(
            wrappedCallData,
            (address[], bool)
        );
        require(
            tokens.length >= 2 &&
            tokens[0] == params.tokens[state.hopIndex] &&
            tokens[tokens.length - 1] == params.tokens[state.hopIndex + 1],
            "MultiplexUniswapV2::_multiHopSellUniswapV2/UNISWAP_INVALID_TOKENS"
        );

        state.outputTokenAmount = _sellToUniswapV2(
            tokens,
            state.outputTokenAmount,
            isSushi,
            state.currentTarget,
            state.nextTarget
        );
    }

    // Similar to the UniswapFeature, but with a couple of differences:
    // - Does not perform the transfer in if `pairAddress` is given,
    //   which indicates that the transfer in was already performed
    //   in the previous hop of a multi-hop fill.
    // - Does not include a minBuyAmount check (which is performed in
    //   either `batchFill` or `multiHopFill`).
    // - Takes a `recipient` address parameter, so the output of the
    //   final `swap` call can be sent to an address other than `msg.sender`.
    function _sellToUniswapV2(
        address[] memory tokens,
        uint256 sellAmount,
        bool isSushi,
        address pairAddress,
        address recipient
    )
        private
        returns (uint256 outputTokenAmount)
    {
        for (uint256 i = 0; i < tokens.length - 1; i++) {
            (address inputToken, address outputToken) = (tokens[i], tokens[i + 1]);
            outputTokenAmount = _computeUniswapOutputAmount(
                pairAddress,
                inputToken,
                outputToken,
                sellAmount
            );
            (uint256 amount0Out, uint256 amount1Out) = inputToken < outputToken
                ? (uint256(0), outputTokenAmount)
                : (outputTokenAmount, uint256(0));
            address to = i < tokens.length - 2
                ? _computeUniswapPairAddress(outputToken, tokens[i + 2], isSushi)
                : recipient;
            IUniswapV2Pair(pairAddress).swap(
                amount0Out,
                amount1Out,
                to,
                new bytes(0)
            );
            pairAddress = to;
            sellAmount = outputTokenAmount;
        }
    }

    // Computes the Uniswap/Sushiswap pair contract address for the
    // given tokens.
    function _computeUniswapPairAddress(
        address tokenA,
        address tokenB,
        bool isSushi
    )
        internal
        pure
        returns (address pairAddress)
    {
        (address token0, address token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
        if (isSushi) {
            return address(uint256(keccak256(abi.encodePacked(
                hex'ff',
                SUSHISWAP_FACTORY,
                keccak256(abi.encodePacked(token0, token1)),
                SUSHISWAP_PAIR_INIT_CODE_HASH
            ))));
        } else {
            return address(uint256(keccak256(abi.encodePacked(
                hex'ff',
                UNISWAP_FACTORY,
                keccak256(abi.encodePacked(token0, token1)),
                UNISWAP_PAIR_INIT_CODE_HASH
            ))));
        }
    }

    // Computes the the amount of output token that would be bought
    // from Uniswap/Sushiswap given the input amount.
    function _computeUniswapOutputAmount(
        address pairAddress,
        address inputToken,
        address outputToken,
        uint256 inputAmount
    )
        private
        view
        returns (uint256 outputAmount)
    {
        require(
            inputAmount > 0,
            "MultiplexFeature::_computeUniswapOutputAmount/INSUFFICIENT_INPUT_AMOUNT"
        );
        (uint256 reserve0, uint256 reserve1,) = IUniswapV2Pair(pairAddress).getReserves();
        require(
            reserve0 > 0 && reserve1 > 0,
            'MultiplexFeature::_computeUniswapOutputAmount/INSUFFICIENT_LIQUIDITY'
        );
        (uint256 inputReserve, uint256 outputReserve) = inputToken < outputToken
            ? (reserve0, reserve1)
            : (reserve1, reserve0);
        uint256 inputAmountWithFee = inputAmount.safeMul(997);
        uint256 numerator = inputAmountWithFee.safeMul(outputReserve);
        uint256 denominator = inputReserve.safeMul(1000).safeAdd(inputAmountWithFee);
        return numerator / denominator;
    }
}
