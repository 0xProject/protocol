// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import {ERC20} from "solmate/tokens/ERC20.sol";

import {FullMathLib} from "./utils/FullMathLib.sol";
import {SafeERC20Lib} from "./utils/SafeERC20Lib.sol";
import {UniswapV3MathLib} from "./utils/UniswapV3MathLib.sol";

// Copied from: https://github.com/Uniswap/v3-core/blob/e3589b192d0be27e100cd0daaf6c97204fdb1899/contracts/interfaces/IUniswapV3Factory.sol
interface IUniswapV3Factory {
    /// @notice Returns the pool address for a given pair of tokens and a fee, or address 0 if it does not exist
    /// @dev tokenA and tokenB may be passed in either token0/token1 or token1/token0 order
    /// @param tokenA The contract address of either token0 or token1
    /// @param tokenB The contract address of the other token
    /// @param fee The fee collected upon every swap in the pool, denominated in hundredths of a bip
    /// @return pool The pool address
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

// Copied from:
//   https://github.com/Uniswap/v3-core/blob/e3589b192d0be27e100cd0daaf6c97204fdb1899/contracts/interfaces/pool/IUniswapV3PoolState.sol
//   https://github.com/Uniswap/v3-core/blob/e3589b192d0be27e100cd0daaf6c97204fdb1899/contracts/interfaces/pool/IUniswapV3PoolImmutables.sol
interface IUniV3Pool {
    /// @notice The 0th storage slot in the pool stores many values, and is exposed as a single method to save gas
    /// when accessed externally.
    /// @return sqrtPriceX96 The current price of the pool as a sqrt(token1/token0) Q64.96 value
    /// tick The current tick of the pool, i.e. according to the last tick transition that was run.
    /// This value may not always be equal to SqrtTickMath.getTickAtSqrtRatio(sqrtPriceX96) if the price is on a tick
    /// boundary.
    /// observationIndex The index of the last oracle observation that was written,
    /// observationCardinality The current maximum number of observations stored in the pool,
    /// observationCardinalityNext The next maximum number of observations, to be updated when the observation.
    /// feeProtocol The protocol fee for both tokens of the pool.
    /// Encoded as two 4 bit values, where the protocol fee of token1 is shifted 4 bits and the protocol fee of token0
    /// is the lower 4 bits. Used as the denominator of a fraction of the swap fee, e.g. 4 means 1/4th of the swap fee.
    /// unlocked Whether the pool is currently locked to reentrancy
    function slot0()
        external
        view
        returns (
            uint160 sqrtPriceX96,
            int24 tick,
            uint16 observationIndex,
            uint16 observationCardinality,
            uint16 observationCardinalityNext,
            uint8 feeProtocol,
            bool unlocked
        );

    /// @notice The first of the two tokens of the pool, sorted by address
    /// @return The token contract address
    function token0() external view returns (address);

    /// @notice The second of the two tokens of the pool, sorted by address
    /// @return The token contract address
    function token1() external view returns (address);
}

struct UniswapV3Pool {
    // Fee denominated in hundredths of a bip .
    uint24 fee;
    address poolAddress;
    uint256 totalValueInToken1;
}

contract UniswapV3PoolFetcher {
    using SafeERC20Lib for ERC20;

    // NOTE: the address is different on Celo.
    // If Celo is integrated in the future it should be set differently.
    // https://docs.uniswap.org/contracts/v3/reference/deployments
    IUniswapV3Factory public constant uniV3Factory = IUniswapV3Factory(0x1F98431c8aD98523631AE4a59f267346ea31F984);
    uint256 internal constant numUniV3FeeTiers = 4;

    constructor() {}

    function getPools(address tokenA, address tokenB) public view returns (UniswapV3Pool[] memory pools) {
        pools = new UniswapV3Pool[](numUniV3FeeTiers);

        // 1bps, 5bps, 30bps, 100bps
        uint24[4] memory fees = [uint24(100), uint24(500), uint24(3000), uint24(10000)];

        for (uint256 i = 0; i < numUniV3FeeTiers; i++) {
            pools[i] = getPool(tokenA, tokenB, fees[i]);
        }
    }

    function getPool(address tokenA, address tokenB, uint24 fee) internal view returns (UniswapV3Pool memory data) {
        address poolAddress = uniV3Factory.getPool(tokenA, tokenB, fee);
        data.poolAddress = poolAddress;
        data.fee = fee;

        if (poolAddress == address(0)) {
            return data;
        }

        IUniV3Pool pool = IUniV3Pool(poolAddress);
        ERC20 token0 = ERC20(pool.token0());
        ERC20 token1 = ERC20(pool.token1());
        (uint160 sqrtPriceX96, , , , , , ) = pool.slot0();

        uint256 token0PriceInToken1 = UniswapV3MathLib.getToken0PriceInToken1(token0, sqrtPriceX96);
        uint256 token0WorthInToken1 = FullMathLib.mulDiv(
            token0.balanceOf(poolAddress),
            token0PriceInToken1,
            10 ** token0.safeDecimals(18)
        );
        data.totalValueInToken1 = token0WorthInToken1 + token1.balanceOf(poolAddress);
    }
}
