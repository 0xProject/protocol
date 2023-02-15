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
import "./TestUniswapV2Pool.sol";

contract TestUniswapV2Factory {
    struct CreationParameters {
        IERC20Token token0;
        IERC20Token token1;
    }

    event PoolCreated(TestUniswapV2Pool pool);

    bytes32 public immutable POOL_INIT_CODE_HASH;
    mapping(IERC20Token => mapping(IERC20Token => TestUniswapV2Pool)) public getPool;
    CreationParameters public creationParameters;

    constructor() public {
        POOL_INIT_CODE_HASH = keccak256(type(TestUniswapV2Pool).creationCode);
    }

    function createPool(IERC20Token tokenA, IERC20Token tokenB) external returns (TestUniswapV2Pool pool) {
        (IERC20Token token0, IERC20Token token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(getPool[token0][token1] == TestUniswapV2Pool(0), "TestUniswapV2Factory/POOL_ALREADY_EXISTS");
        creationParameters = CreationParameters({token0: token0, token1: token1});
        pool = new TestUniswapV2Pool{salt: keccak256(abi.encodePacked(token0, token1))}();
        getPool[token0][token1] = pool;
        getPool[token1][token0] = pool;
        emit PoolCreated(pool);
    }
}
