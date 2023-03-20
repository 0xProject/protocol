// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

contract MockUniswapV3Pool {
    uint160 sqrtPriceX96;
    address token0Address;
    address token1Address;

    constructor(uint160 _sqrtPriceX96, address _token0, address _token1) {
        sqrtPriceX96 = _sqrtPriceX96;
        token0Address = _token0;
        token1Address = _token1;
    }

    function slot0() external view returns (uint160, int24, uint16, uint16, uint16, uint8, bool) {
        return (sqrtPriceX96, 0, 0, 0, 0, 0, false);
    }

    function token0() external view returns (address) {
        return token0Address;
    }

    function token1() external view returns (address) {
        return token1Address;
    }
}
