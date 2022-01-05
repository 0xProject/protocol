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
import "@0x/contracts-utils/contracts/src/v06/LibSafeMathV06.sol";
import "../migrations/LibMigrate.sol";
import "../fixins/FixinCommon.sol";
import "../fixins/FixinTokenSpender.sol";
import "./interfaces/IFeature.sol";
import "./interfaces/IUniswapV2ForkFeature.sol";
import "./interfaces/IUniswapV2ForkPair.sol";

/// @dev VIP UniswapV2Fork fill functions.
abstract contract UniswapV2ForkFeature is
    IFeature,
    IUniswapV2ForkFeature,
    FixinCommon,
    FixinTokenSpender
{
    using LibSafeMathV06 for uint256;

    /// @dev Name of this feature.
    string public constant override FEATURE_NAME = "UniswapV2ForkFeature";
    /// @dev Version of this feature.
    uint256 public immutable override FEATURE_VERSION = _encodeVersion(1, 0, 0);

    address private constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    function _getForkDetails(ProtocolFork fork)
        internal
        pure
        virtual
        returns (address factoryAddress, bytes32 initCodeHash);

    function _getWeth()
        internal
        pure
        virtual
        returns (IEtherTokenV06 weth);

    /// @dev Efficiently sell directly to UniswapV2 (and forks).
    /// @param tokens Sell path.
    /// @param sellAmount of `tokens[0]` Amount to sell.
    /// @param minBuyAmount Minimum amount of `tokens[-1]` to buy.
    /// @return buyAmount Amount of `tokens[-1]` bought.
    function sellToUniswapV2Fork(
        IERC20TokenV06[] memory tokens,
        uint256 sellAmount,
        uint256 minBuyAmount
    )
        public
        payable
        override
        returns (uint256 buyAmount)
    {
        require(tokens.length > 1, 'UniswapV2ForkFeature/INVALID_TOKENS_LENGTH');

        IEtherTokenV06 weth = _getWeth();
        bool wrapEth = address(tokens[0]) == ETH_ADDRESS;
        if (wrapEth) {
            require(msg.value == sellAmount, "UniswapV2ForkFeature/INVALID_SELL_AMOUNT");
            weth.deposit{value:msg.value}();
            tokens[0] = weth;
        }

        bool unwrapWeth = address(tokens[tokens.length - 1]) == ETH_ADDRESS;
        if (unwrapWeth) {
            tokens[tokens.length - 1] = weth;
        }

        uint256[] memory amounts = _swap(
            tokens,
            sellAmount,
            wrapEth ? address(this) : msg.sender,
            unwrapWeth ? address(this) : msg.sender
        );
        buyAmount = amounts[amounts.length - 1];
        require(buyAmount >= minBuyAmount, 'UniswapV2ForkFeature/INSUFFICIENT_OUTPUT_AMOUNT');

        if (unwrapWeth) {
            weth.withdraw(buyAmount);
            (bool sent, ) = msg.sender.call{value: buyAmount}("");
            require(sent, "UniswapV2ForkFeature/FAILED_TO_SEND_ETHER");
        }
    }

    function _sortTokens(
        IERC20TokenV06 tokenA,
        IERC20TokenV06 tokenB
    )
        internal
        pure
        returns (IERC20TokenV06 token0, IERC20TokenV06 token1)
    {
        require(tokenA != tokenB, 'UniswapV2ForkFeature/IDENTICAL_ADDRESSES');
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
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
        uint amountInWithFee = amountIn.safeMul(997);
        uint numerator = amountInWithFee.safeMul(reserveOut);
        uint denominator = reserveIn.safeMul(1000).safeMul(amountInWithFee);
        amountOut = numerator / denominator;
    }

    function _pairFor(
        IERC20TokenV06 tokenA,
        IERC20TokenV06 tokenB
    )
        internal
        view
        returns (IUniswapV2ForkPair)
    {
        (address factoryAddress, bytes32 initCodeHash) = _getForkDetails();
        (IERC20TokenV06 token0, IERC20TokenV06 token1) = _sortTokens(tokenA, tokenB);
        return IUniswapV2ForkPair(address(uint(keccak256(abi.encodePacked(
            hex'ff',
            factoryAddress,
            keccak256(abi.encodePacked(address(token0), address(token1))),
            initCodeHash
        )))));
    }

    function _swap(
        IERC20TokenV06[] memory tokens,
        uint256 sellAmount,
        address _from,
        address _to
    )
        internal
        returns (uint[] memory amounts)
    {
        require(tokens.length >= 2, 'UniswapV2ForkFeature/INVALID_PATH');

        IUniswapV2ForkPair currPair = _pairFor(tokens[0], tokens[1]);
        if (_from == address(this)) {
            _transferERC20Tokens(
                tokens[0],
                address(currPair),
                sellAmount
            );
        } else {
            _transferERC20TokensFrom(
                tokens[0],
                _from,
                address(currPair),
                sellAmount
            );
        }

        amounts = new uint[](tokens.length);
        amounts[0] = sellAmount;

        for (uint i; i < tokens.length - 1; i++) {
            (IERC20TokenV06 tokenA, IERC20TokenV06 tokenB) = (tokens[i], tokens[i + 1]);

            IUniswapV2ForkPair nextPair;
            address to = _to;
            if (i < tokens.length - 2) {
                nextPair = _pairFor(tokens[i + 1], tokens[i + 2]);
                to = address(nextPair);
            }

            amounts[i + 1] = _swapInternal(currPair, tokenA, tokenB, amounts[i], to);
            currPair = nextPair;
        }
    }

    function _swapInternal(
        IUniswapV2ForkPair pair,
        IERC20TokenV06 tokenA,
        IERC20TokenV06 tokenB,
        uint256 amountIn,
        address to
    )
        internal
        returns (uint amountOut)
    {
        (uint256 reserveIn, uint256 reserveOut,) = pair.getReserves();
        (reserveIn, reserveOut) = tokenA < tokenB ? (reserveIn, reserveOut) : (reserveOut, reserveIn);

        amountOut = _getAmountOut(amountIn, reserveIn, reserveOut);
        (uint amount0Out, uint amount1Out) = tokenA < tokenB ? (uint(0), amountOut) : (amountOut, uint(0));

        pair.swap(amount0Out, amount1Out, to, "");
    }
}

contract EthereumUniswapV2ForkFeature is UniswapV2ForkFeature {
    address private constant WETH_ADDRESS = address(0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2);

    address private constant UNISWAP_V2_FACTORY_ADDRESS = address(0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f);
    bytes32 private constant UNISWAP_V2_INIT_CODE_HASH = 0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f;
    address private constant SUSHISWAP_FACTORY_ADDRESS = address(0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac);
    bytes32 private constant SUSHISWAP_INIT_CODE_HASH = 0xe18a34eb0e04b04f7a0ac29a6e80748dca96319b42c54d679cb821dca90c6303;

    function _getForkDetails(ProtocolFork fork)
        internal
        pure
        override
        returns (address factoryAddress, bytes32 initCodeHash)
    {
        if (fork == ProtocolFork.UniSwapV2) {
            return (UNISWAP_V2_FACTORY_ADDRESS, UNISWAP_V2_INIT_CODE_HASH);
        } else if (fork == Protocol.SushiSwap) {
            return (SUSHISWAP_FACTORY_ADDRESS, SUSHISWAP_INIT_CODE_HASH);
        } else {
            revert('unsupported uniswap2 fork');
        }
    }

    function _getWeth()
    internal
    pure
    override
    returns (IEtherTokenV06 weth){
        return IEtherTokenV06(WETH_ADDRESS);
    }
}

contract PolygonUniswapV2ForkFeature is UniswapV2ForkFeature {
    address private constant WETH_ADDRESS = address(0x7ceb23fd6bc0add59e62ac25578270cff1b9f619);
    address private constant SUSHISWAP_FACTORY_ADDRESS = address(0xc35DADB65012eC5796536bD9864eD8773aBc74C4);
    bytes32 private constant SUSHISWAP_INIT_CODE_HASH = 0xe18a34eb0e04b04f7a0ac29a6e80748dca96319b42c54d679cb821dca90c6303;

    function _getForkDetails(ProtocolFork fork)
        internal
        pure
        override
        returns (address factoryAddress, bytes32 initCodeHash)
    {
        if (fork == Protocol.SushiSwap) {
            return (SUSHISWAP_FACTORY_ADDRESS, SUSHISWAP_INIT_CODE_HASH);
        } else {
            revert('unsupported uniswap2 fork');
        }
    }

    function _getWeth()
        internal
        pure
        override
        returns (IEtherTokenV06 weth){
        return IEtherTokenV06(WETH_ADDRESS);
    }
}

contract BscUniswapV2ForkFeature is UniswapV2ForkFeature {
    address private constant WETH_ADDRESS = address(0);
    address private constant SUSHISWAP_FACTORY_ADDRESS = address(0xc35DADB65012eC5796536bD9864eD8773aBc74C4);
    bytes32 private constant SUSHISWAP_INIT_CODE_HASH = 0xe18a34eb0e04b04f7a0ac29a6e80748dca96319b42c54d679cb821dca90c6303;

    function _getForkDetails(ProtocolFork fork)
    internal
    pure
    override
    returns (address factoryAddress, bytes32 initCodeHash)
    {
        if (fork == Protocol.SushiSwap) {
            return (SUSHISWAP_FACTORY_ADDRESS, SUSHISWAP_INIT_CODE_HASH);
        } else {
            revert('unsupported uniswap2 fork');
        }
    }

    function _getWeth()
    internal
    pure
    override
    returns (IEtherTokenV06 weth){
        return IEtherTokenV06(WETH_ADDRESS);
    }
}
