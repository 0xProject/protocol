pragma solidity ^0.8.0;

interface IPool {
    /// @notice The fee to be charged for a swap in basis points
    /// @return The swap fee in basis points
    function swapFeeUnits() external view returns (uint24);

    /// @notice The pool tick distance
    /// @dev Ticks can only be initialized and used at multiples of this value
    /// It remains an int24 to avoid casting even though it is >= 1.
    /// e.g: a tickDistance of 5 means ticks can be initialized every 5th tick, i.e., ..., -10, -5, 0, 5, 10, ...
    /// @return The tick distance
    function tickDistance() external view returns (int24);

    /// @notice Maximum gross liquidity that an initialized tick can have
    /// @dev This is to prevent overflow the pool's active base liquidity (uint128)
    /// also prevents out-of-range liquidity from being used to prevent adding in-range liquidity to a pool
    /// @return The max amount of liquidity per tick
    function maxTickLiquidity() external view returns (uint128);

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

    /// @notice Returns the information about a position by the position's key
    /// @return liquidity the liquidity quantity of the position
    /// @return feeGrowthInsideLast fee growth inside the tick range as of the last mint / burn action performed
    function getPositions(
        address owner,
        int24 tickLower,
        int24 tickUpper
    ) external view returns (uint128 liquidity, uint256 feeGrowthInsideLast);

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
