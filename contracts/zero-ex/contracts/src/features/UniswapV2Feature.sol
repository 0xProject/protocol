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
import "../migrations/LibMigrate.sol";
import "../fixins/FixinCommon.sol";
import "./interfaces/IFeature.sol";
import "./interfaces/IPancakeSwapFeature.sol";
import "@uniswap/v2-periphery/contracts/libraries/UniswapV2Library.sol";

/// @dev VIP UniswapV2 fill functions.
contract UniswapV2Feature is
    IFeature,
    IPancakeSwapFeature,
    FixinCommon
{
    /// @dev Name of this feature.
    string public constant override FEATURE_NAME = "UniswapV2Feature";
    /// @dev Version of this feature.
    uint256 public immutable override FEATURE_VERSION = _encodeVersion(1, 0, 0);

    // TODO: complete the list
    // address of the SushiSwapV2 factory contract.
    address constant private SUSHISWAPV2_FACTORY = address(0xc35DADB65012eC5796536bD9864eD8773aBc74C4);

    // other available

    function _getFactory(ProtocolFork fork) private view returns(address) {
        // TODO: complete the list
        if (fork == ProtocolFork.SushiSwap) {
            return SUSHISWAPV2_FACTORY;
        } else {
            revert("isnt it weired revert in view fun?");
        }
    }

    function sellToUniswapV2(
        IERC20TokenV06[] calldata tokens,
        uint256 sellAmount,
        uint256 minBuyAmount,
        ProtocolFork fork
    )
        external
        payable
        override
        returns (uint256 buyAmount)
    {
        require(tokens.length > 1, "UniswapV2Feature/InvalidTokensLength");
        address[] memory path = new address[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            path[i] = address(tokens[i]);
        }
        address factory = _getFactory(fork);
        amounts = UniswapV2Library.getAmountsOut(factory, sellAmount, path);
        buyAmount = amounts[amounts.length - 1];
        require(buyAmount >= minBuyAmount, 'UniswapV2Feature/INSUFFICIENT_OUTPUT_AMOUNT');
        _safeTransferFrom(
            path[0], msg.sender, UniswapV2Library.pairFor(factory, path[0], path[1]), amounts[0]
        );
        _swap(amounts, path, to);
    }

    // **** SWAP ****
    // requires the initial amount to have already been sent to the first pair
    function _swap(uint[] memory amounts, address[] memory path, address _to) internal virtual {
        for (uint i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0,) = UniswapV2Library.sortTokens(input, output);
            uint amountOut = amounts[i + 1];
            (uint amount0Out, uint amount1Out) = input == token0 ? (uint(0), amountOut) : (amountOut, uint(0));
            address to = i < path.length - 2 ? UniswapV2Library.pairFor(factory, output, path[i + 2]) : _to;
            IUniswapV2Pair(UniswapV2Library.pairFor(factory, input, output)).swap(
                amount0Out, amount1Out, to, new bytes(0)
            );
        }
    }

    function _safeTransferFrom(
        address token,
        address from,
        address to,
        uint256 value
    ) internal {
        // bytes4(keccak256(bytes('transferFrom(address,address,uint256)')));
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0x23b872dd, from, to, value));
        require(
            success && (data.length == 0 || abi.decode(data, (bool))),
            'TransferHelper::transferFrom: transferFrom failed'
        );
    }
}
