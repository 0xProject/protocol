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

/// @dev VIP UniswapV2Fork  fill functions.
contract UniswapV2ForkFeature is
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
    /// @dev WETH contract.
    IEtherTokenV06 private immutable WETH;
    /// @dev UniswapV2Fork Factory contract address.
    address private immutable UNI_FACTORY_ADDRESS;
    /// @dev UniswapV2Fork init code of the factory.
    bytes32 private immutable UNI_POOL_INIT_CODE_HASH;

    address private constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    constructor(
        IEtherTokenV06 weth,
        address uniV2ForkFactory,
        bytes32 poolInitCodeHash
    ) public {
        WETH = weth;
        UNI_FACTORY_ADDRESS = uniV2ForkFactory;
        UNI_POOL_INIT_CODE_HASH = poolInitCodeHash;
    }

    function sellToUniswapV2Fork(
        ProtocolFork fork,
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

        if (address(tokens[0]) == ETH_ADDRESS) {
            require(msg.value == sellAmount, "UniswapV2ForkFeature/INVALID_SELL_AMOUNT");
            IEtherTokenV06(WETH).deposit{value:msg.value}();
            tokens[0] = IERC20TokenV06(WETH);
        }

        bool unwrapWeth = address(tokens[tokens.length - 1]) == ETH_ADDRESS;
        if (unwrapWeth) {
            tokens[tokens.length - 1] = IERC20TokenV06(WETH);
        }

        _transferERC20TokensFrom(
            tokens[0],
            msg.sender,
            address(_pairFor(tokens[0], tokens[1])),
            sellAmount
        );
        address recipient = unwrapWeth ? address(this) : msg.sender;
        uint[] memory amounts = _swap(tokens, sellAmount, recipient);
        buyAmount = amounts[amounts.length - 1];
        require(buyAmount >= minBuyAmount, 'UniswapV2ForkFeature/INSUFFICIENT_OUTPUT_AMOUNT');

        if (unwrapWeth) {
            IEtherTokenV06(WETH).withdraw(buyAmount);
            (bool sent, bytes memory data) = msg.sender.call{value: buyAmount}("");
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
        require(token0 != IERC20TokenV06(0), 'UniswapV2ForkFeature/ZERO_ADDRESS');
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
        (IERC20TokenV06 token0, IERC20TokenV06 token1) = _sortTokens(tokenA, tokenB);
        return IUniswapV2ForkPair(address(uint(keccak256(abi.encodePacked(
            hex'ff',
            UNI_FACTORY_ADDRESS,
            keccak256(abi.encodePacked(address(token0), address(token1))),
            UNI_POOL_INIT_CODE_HASH
        )))));
    }

    function _swap(
        IERC20TokenV06[] memory tokens,
        uint256 sellAmount,
        address _to
    )
        internal
        returns (uint[] memory amounts)
    {
        require(tokens.length >= 2, 'UniswapV2ForkFeature/INVALID_PATH');

        amounts = new uint[](tokens.length);
        amounts[0] = sellAmount;

        for (uint i; i < tokens.length - 1; i++) {
            (IERC20TokenV06 tokenA, IERC20TokenV06 tokenB, IERC20TokenV06 tokenC) =
                (tokens[i], tokens[i + 1], tokens[i + 2]);

            address to = i < tokens.length - 2 ? address(_pairFor(tokenB, tokenC)) : _to;
            amounts[i + 1] = _swapInternal(amounts[i], tokenA, tokenB, to);
        }
    }

    function _swapInternal(
        uint256 amountIn,
        IERC20TokenV06 tokenA,
        IERC20TokenV06 tokenB,
        address to
    )
        internal
        returns (uint amountOut)
    {
        IUniswapV2ForkPair pairCurrent = _pairFor(tokenA, tokenB);

        (IERC20TokenV06 token0,) = _sortTokens(tokenA, tokenB);
        (uint reserve0, uint reserve1,) = pairCurrent.getReserves();
        (uint reserveIn, uint reserveOut) = tokenA == token0 ? (reserve0, reserve1) : (reserve1, reserve0);

        amountOut = _getAmountOut(amountIn, reserveIn, reserveOut);
        (uint amount0Out, uint amount1Out) = tokenA == token0 ? (uint(0), amountOut) : (amountOut, uint(0));

        pairCurrent.swap(amount0Out, amount1Out, to, new bytes(0));
    }
}
