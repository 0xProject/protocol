// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import {UniswapV3PoolFetcher, UniswapV3Pool} from "./UniswapV3PoolFetcher.sol";

struct TokenPair {
    address tokenA;
    address tokenB;
}

contract PoolFetcher is UniswapV3PoolFetcher {
    /// @notice Fetch all pools of the given pairs.
    /// @param pairs Token pairs of the pools to be fetched.
    /// @return uniswapV3Pools All Uniswap V3 pools of the given pairs. The caller is responsible for fitlering out all pools with zero address.
    function batchFetch(TokenPair[] memory pairs) public view returns (UniswapV3Pool[] memory uniswapV3Pools) {
        uniswapV3Pools = new UniswapV3Pool[](pairs.length * numUniV3FeeTiers);

        for (uint256 i; i < pairs.length; i++) {
            UniswapV3Pool[] memory pairPools = getPools(pairs[i].tokenA, pairs[i].tokenB);
            for (uint256 j; j < numUniV3FeeTiers; j++) {
                uniswapV3Pools[i * numUniV3FeeTiers + j] = pairPools[j];
            }
        }
    }
}
