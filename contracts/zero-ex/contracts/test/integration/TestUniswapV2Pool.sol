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
import "../../src/vendor/IUniswapV2Pair.sol";

interface IUniswapV2PoolDeployer {
    struct CreationParameters {
        IERC20Token token0;
        IERC20Token token1;
    }

    function creationParameters() external view returns (CreationParameters memory);
}

contract TestUniswapV2Pool is IUniswapV2Pair {
    IERC20Token public immutable token0;
    IERC20Token public immutable token1;

    uint112 reserve0;
    uint112 reserve1;
    uint32 blockTimestampLast;

    constructor() public {
        IUniswapV2PoolDeployer.CreationParameters memory params = IUniswapV2PoolDeployer(msg.sender)
            .creationParameters();
        (token0, token1) = (params.token0, params.token1);
    }

    function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes calldata /* data */) external override {
        if (amount0Out > 0) {
            token0.transfer(to, amount0Out);
        }
        if (amount1Out > 0) {
            token1.transfer(to, amount1Out);
        }
    }

    function setReserves(uint112 reserve0_, uint112 reserve1_, uint32 blockTimestampLast_) external {
        reserve0 = reserve0_;
        reserve1 = reserve1_;
        blockTimestampLast = blockTimestampLast_;
    }

    function getReserves() external view override returns (uint112, uint112, uint32) {
        return (reserve0, reserve1, blockTimestampLast);
    }
}
