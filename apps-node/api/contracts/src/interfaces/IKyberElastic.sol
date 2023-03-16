pragma solidity >=0.6;
pragma experimental ABIEncoderV2;

interface IKyberElasticFactory {
    /// @notice Returns the pool address for a given pair of tokens and a swap fee
    /// @dev Token order does not matter
    /// @param tokenA Contract address of either token0 or token1
    /// @param tokenB Contract address of the other token
    /// @param swapFeeUnits Fee to be collected upon every swap in the pool, in fee units
    /// @return pool The pool address. Returns null address if it does not exist
    function getPool(address tokenA, address tokenB, uint24 swapFeeUnits) external view returns (address pool);
}

interface IKyberElasticPool {
    function token0() external view returns (address);

    function token1() external view returns (address);

    /// @notice The fee to be charged for a swap in basis points
    /// @return The swap fee in basis points
    function swapFeeUnits() external view returns (uint24);

    /// @notice Look up information about a specific tick in the pool
    /// @param tick The tick to look up
    /// @return liquidityGross total liquidity amount from positions that uses this tick as a lower or upper tick
    /// liquidityNet how much liquidity changes when the pool tick crosses above the tick
    /// feeGrowthOutside the fee growth on the other side of the tick relative to the current tick
    /// secondsPerLiquidityOutside the seconds spent on the other side of the tick relative to the current tick
    function ticks(
        int24 tick
    )
        external
        view
        returns (
            uint128 liquidityGross,
            int128 liquidityNet,
            uint256 feeGrowthOutside,
            uint128 secondsPerLiquidityOutside
        );

    /// @notice Returns the previous and next initialized ticks of a specific tick
    /// @dev If specified tick is uninitialized, the returned values are zero.
    /// @param tick The tick to look up
    function initializedTicks(int24 tick) external view returns (int24 previous, int24 next);

    /// @notice Fetches the pool's prices, ticks and lock status
    /// @return sqrtP sqrt of current price: sqrt(token1/token0)
    /// @return currentTick pool's current tick
    /// @return nearestCurrentTick pool's nearest initialized tick that is <= currentTick
    /// @return locked true if pool is locked, false otherwise
    function getPoolState()
        external
        view
        returns (uint160 sqrtP, int24 currentTick, int24 nearestCurrentTick, bool locked);

    /// @notice Fetches the pool's liquidity values
    /// @return baseL pool's base liquidity without reinvest liqudity
    /// @return reinvestL the liquidity is reinvested into the pool
    /// @return reinvestLLast last cached value of reinvestL, used for calculating reinvestment token qty
    function getLiquidityState() external view returns (uint128 baseL, uint128 reinvestL, uint128 reinvestLLast);
}
