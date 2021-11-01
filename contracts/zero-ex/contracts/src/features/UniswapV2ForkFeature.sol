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
import "@0x/contracts-erc20/contracts/src/v06/IEtherTokenV06.sol";
import "@0x/contracts-erc20/contracts/src/WETH9.sol";
import "../migrations/LibMigrate.sol";
import "../fixins/FixinCommon.sol";
import "../fixins/FixinTokenSpender.sol";
import "./interfaces/IFeature.sol";
import "./interfaces/IPancakeSwapFeature.sol";
import "./interfaces/IUniswapV2ForkPair.sol";

/// @dev VIP UniswapV2Fork  fill functions.
contract UniswapV2ForkFeature is
    IFeature,
    IPancakeSwapFeature,
    FixinCommon,
    FixinTokenSpender
{
    /// @dev Name of this feature.
    string public constant override FEATURE_NAME = "UniswapV2ForkFeature";
    /// @dev Version of this feature.
    uint256 public immutable override FEATURE_VERSION = _encodeVersion(1, 0, 0);

    address private constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address private constant WETH_ADDRESS = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    // TODO: complete the list
    // address of the SushiSwapV2 factory contract.
    address constant private SUSHISWAPV2_FACTORY = address(0xc35DADB65012eC5796536bD9864eD8773aBc74C4);

    function sellToUniswapV2Fork(
        ProtocolFork fork,
        IERC20TokenV06[] calldata tokens,
        uint256 sellAmount,
        uint256 minBuyAmount
    )
        external
        payable
        override
        returns (uint256 buyAmount)
    {
        require(tokens.length > 1, 'UniswapV2ForkFeature/INVALID_TOKENS_LENGTH');

        if (tokens[0] == ETH_ADDRESS) {
            WETH9(WETH_ADDRESS).deposit{value:msg.value}();
            tokens[0] = WETH_ADDRESS;
        }

        bool unwrapWeth = tokens[tokens.length - 1] == ETH_ADDRESS;
        if (unwrapWeth) {
            tokens[tokens.length - 1] = WETH_ADDRESS;
        }

        address factory = _getFactory(fork);
        amounts = _getAmountsOut(factory, sellAmount, tokens);
        buyAmount = amounts[amounts.length - 1];
        require(buyAmount >= minBuyAmount, 'UniswapV2ForkFeature/INSUFFICIENT_OUTPUT_AMOUNT');
        _transferERC20TokensFrom(
            path[0],
            msg.sender,
            _pairFor(factory, path[0], path[1]),
            amounts[0]
        );
        _swap(amounts, path, to);

        if (unwrapWeth) {
            WETH9(WETH_ADDRESS).withdraw(buyAmount);
        }
    }

    function _getAmountsOut(
        address factory,
        uint amountIn,
        IERC20TokenV06[] memory tokens
    )
        internal
        view
        returns (uint[] memory amounts)
    {
        require(tokens.length >= 2, 'UniswapV2ForkFeature/INVALID_PATH');
        amounts = new uint[](tokens.length);
        amounts[0] = amountIn;
        for (uint i; i < tokens.length - 1; i++) {
            (uint reserveIn, uint reserveOut) = _getReserves(factory, address(tokens[i]), address(tokens[i + 1]));
            amounts[i + 1] = _getAmountOut(amounts[i], reserveIn, reserveOut);
        }
    }

    function _getReserves(
        address factory,
        address tokenA,
        address tokenB
    )
        internal
        view
        returns (uint reserveA, uint reserveB)
    {
        (address token0,) = _sortTokens(tokenA, tokenB);
        (uint reserve0, uint reserve1,) = IUniswapV2ForkPair(_pairFor(factory, tokenA, tokenB)).getReserves();
        (reserveA, reserveB) = tokenA == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
    }

    function _sortTokens(
        address tokenA,
        address tokenB
    )
        internal
        pure
        returns (address token0, address token1)
    {
        require(tokenA != tokenB, 'UniswapV2ForkFeature/IDENTICAL_ADDRESSES');
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), 'UniswapV2ForkFeature/ZERO_ADDRESS');
    }

    function _getAmountOut(
        uint amountIn,
        uint reserveIn,
        uint reserveOut
    )
        internal
        pure
        returns (uint amountOut)
    {
        require(amountIn > 0, 'UniswapV2ForkFeature/INSUFFICIENT_INPUT_AMOUNT');
        require(reserveIn > 0 && reserveOut > 0, 'UniswapV2ForkFeature/INSUFFICIENT_LIQUIDITY');
        uint amountInWithFee = amountIn.mul(997);
        uint numerator = amountInWithFee.mul(reserveOut);
        uint denominator = reserveIn.mul(1000).add(amountInWithFee);
        amountOut = numerator / denominator;
    }

    function _getFactory(ProtocolFork fork) private view returns (address) {
        // TODO: complete the list
        if (fork == ProtocolFork.SushiSwap) {
            return SUSHISWAPV2_FACTORY;
        } else {
            revert('UniswapV2ForkFeature/UNSUPPORTED_FORK');
        }
    }

    function _pairFor(
        address factory,
        address tokenA,
        address tokenB
    )
        internal
        pure
        returns (address pair)
    {
        (address token0, address token1) = _sortTokens(tokenA, tokenB);
        pair = address(uint(keccak256(abi.encodePacked(
            hex'ff',
            factory,
            keccak256(abi.encodePacked(token0, token1)),
            hex'96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f' // init code hash TODO(Cece): how can I find the init code for each fork
        ))));
    }

    // requires the initial amount to have already been sent to the first pair
    function _swap(uint[] memory amounts, address[] memory path, address _to) internal {
        for (uint i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0,) = _sortTokens(input, output);
            uint amountOut = amounts[i + 1];
            (uint amount0Out, uint amount1Out) = input == token0 ? (uint(0), amountOut) : (amountOut, uint(0));
            address to = i < path.length - 2 ? _pairFor(factory, output, path[i + 2]) : _to;
            IUniswapV2ForkPair(_pairFor(factory, input, output)).swap(
                amount0Out, amount1Out, to, new bytes(0)
            );
        }
    }
}
