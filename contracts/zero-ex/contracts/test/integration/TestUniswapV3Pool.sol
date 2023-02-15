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

pragma solidity ^0.6;
pragma experimental ABIEncoderV2;
import "@0x/contracts-erc20/src/IERC20Token.sol";
import "../../src/vendor/IUniswapV3Pool.sol";

interface IUniswapV3PoolDeployer {
    struct CreationParameters {
        IERC20Token token0;
        IERC20Token token1;
        uint24 fee;
    }

    function creationParameters() external view returns (CreationParameters memory);
}

interface IUniswapV3SwapCallback {
    function uniswapV3SwapCallback(int256 amount0Delta, int256 amount1Delta, bytes calldata data) external;
}

contract TestUniswapV3Pool is IUniswapV3Pool {
    IERC20Token public immutable token0;
    IERC20Token public immutable token1;
    uint24 public immutable fee;

    constructor() public {
        IUniswapV3PoolDeployer.CreationParameters memory params = IUniswapV3PoolDeployer(msg.sender)
            .creationParameters();
        (token0, token1, fee) = (params.token0, params.token1, params.fee);
    }

    function swap(
        address recipient,
        bool zeroForOne,
        int256 amountSpecified,
        uint160,
        bytes calldata data
    ) external override returns (int256 amount0, int256 amount1) {
        uint256 balance0Before = token0.balanceOf(address(this));
        uint256 balance1Before = token1.balanceOf(address(this));
        if (zeroForOne) {
            amount0 = int256(amountSpecified);
            // Always buy 100% of other token balance.
            amount1 = -int256(balance1Before);
            token1.transfer(recipient, balance1Before);
        } else {
            amount0 = -int256(balance0Before);
            // Always buy 100% of other token balance.
            amount1 = int256(amountSpecified);
            token0.transfer(recipient, balance0Before);
        }
        IUniswapV3SwapCallback(msg.sender).uniswapV3SwapCallback(amount0, amount1, data);
        int256 balance0Change = int256(token0.balanceOf(address(this))) - int256(balance0Before);
        int256 balance1Change = int256(token1.balanceOf(address(this))) - int256(balance1Before);
        require(balance0Change >= amount0 && balance1Change >= amount1, "TestUniswapV3Pool/SWAP_NOT_PAID");
    }
}
