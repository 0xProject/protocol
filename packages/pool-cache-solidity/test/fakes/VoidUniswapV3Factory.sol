// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

contract VoidUniswapV3Factory {
    function getPool(address, address, uint24) external pure returns (address) {
        return address(0);
    }
}
