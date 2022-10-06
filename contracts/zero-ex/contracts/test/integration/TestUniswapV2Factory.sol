// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6;
pragma experimental ABIEncoderV2;
import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";
import "./TestUniswapV2Pool.sol";

contract TestUniswapV2Factory {
    struct CreationParameters {
        IERC20TokenV06 token0;
        IERC20TokenV06 token1;
    }

    event PoolCreated(TestUniswapV2Pool pool);

    bytes32 public immutable POOL_INIT_CODE_HASH;
    mapping(IERC20TokenV06 => mapping(IERC20TokenV06 => TestUniswapV2Pool)) public getPool;
    CreationParameters public creationParameters;

    constructor() public {
        POOL_INIT_CODE_HASH = keccak256(type(TestUniswapV2Pool).creationCode);
    }

    function createPool(IERC20TokenV06 tokenA, IERC20TokenV06 tokenB) external returns (TestUniswapV2Pool pool) {
        (IERC20TokenV06 token0, IERC20TokenV06 token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(getPool[token0][token1] == TestUniswapV2Pool(0), "TestUniswapV2Factory/POOL_ALREADY_EXISTS");
        creationParameters = CreationParameters({token0: token0, token1: token1});
        pool = new TestUniswapV2Pool{salt: keccak256(abi.encodePacked(token0, token1))}();
        getPool[token0][token1] = pool;
        getPool[token1][token0] = pool;
        emit PoolCreated(pool);
    }
}
