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
import "./TestUniswapV3Pool.sol";

contract TestUniswapV3Factory {
    struct CreationParameters {
        IERC20Token token0;
        IERC20Token token1;
        uint24 fee;
    }

    event PoolCreated(TestUniswapV3Pool pool);

    bytes32 public immutable POOL_INIT_CODE_HASH;
    mapping(IERC20Token => mapping(IERC20Token => mapping(uint24 => TestUniswapV3Pool))) public getPool;
    CreationParameters public creationParameters;

    constructor() public {
        POOL_INIT_CODE_HASH = keccak256(type(TestUniswapV3Pool).creationCode);
    }

    function createPool(IERC20Token tokenA, IERC20Token tokenB, uint24 fee) external returns (TestUniswapV3Pool pool) {
        (IERC20Token token0, IERC20Token token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(getPool[token0][token1][fee] == TestUniswapV3Pool(0), "TestUniswapV3Factory/POOL_ALREADY_EXISTS");
        creationParameters = CreationParameters({token0: token0, token1: token1, fee: fee});
        pool = new TestUniswapV3Pool{salt: keccak256(abi.encode(token0, token1, fee))}();
        getPool[token0][token1][fee] = pool;
        getPool[token1][token0][fee] = pool;
        emit PoolCreated(pool);
    }
}
