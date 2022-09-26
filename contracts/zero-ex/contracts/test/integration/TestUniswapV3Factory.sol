// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6;
pragma experimental ABIEncoderV2;
import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";
import "./TestUniswapV3Pool.sol";

contract TestUniswapV3Factory {
    struct CreationParameters {
        IERC20TokenV06 token0;
        IERC20TokenV06 token1;
        uint24 fee;
    }

    event PoolCreated(TestUniswapV3Pool pool);

    bytes32 public immutable POOL_INIT_CODE_HASH;
    mapping(IERC20TokenV06 => mapping(IERC20TokenV06 => mapping(uint24 => TestUniswapV3Pool)))
        public getPool;
    CreationParameters public creationParameters;

    constructor() public {
        POOL_INIT_CODE_HASH = keccak256(type(TestUniswapV3Pool).creationCode);
    }

    function createPool(
        IERC20TokenV06 tokenA,
        IERC20TokenV06 tokenB,
        uint24 fee
    ) external returns (TestUniswapV3Pool pool) {
        (IERC20TokenV06 token0, IERC20TokenV06 token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
        require(
            getPool[token0][token1][fee] == TestUniswapV3Pool(0),
            "TestUniswapV3Factory/POOL_ALREADY_EXISTS"
        );
        creationParameters = CreationParameters({
            token0: token0,
            token1: token1,
            fee: fee
        });
        pool = new TestUniswapV3Pool{
            salt: keccak256(abi.encode(token0, token1, fee))
        }();
        getPool[token0][token1][fee] = pool;
        getPool[token1][token0][fee] = pool;
        emit PoolCreated(pool);
    }
}
