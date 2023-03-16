pragma solidity >=0.6;

interface IAlgebraFactory {
    /**
     *  @notice Returns the pool address for a given pair of tokens and a fee, or address 0 if it does not exist
     *  @dev tokenA and tokenB may be passed in either token0/token1 or token1/token0 order
     *  @param tokenA The contract address of either token0 or token1
     *  @param tokenB The contract address of the other token
     *  @return pool The pool address
     */
    function poolByPair(address tokenA, address tokenB) external view returns (address pool);
}

interface IAlgebraPool {
    /**
     * @notice The globalState structure in the pool stores many values but requires only one slot
     * and is exposed as a single method to save gas when accessed externally.
     * @return price The current price of the pool as a sqrt(token1/token0) Q64.96 value;
     * Returns tick The current tick of the pool, i.e. according to the last tick transition that was run;
     * Returns This value may not always be equal to SqrtTickMath.getTickAtSqrtRatio(price) if the price is on a tick
     * boundary;
     * Returns fee The last pool fee value in hundredths of a bip, i.e. 1e-6;
     * Returns timepointIndex The index of the last written timepoint;
     * Returns communityFeeToken0 The community fee percentage of the swap fee in thousandths (1e-3) for token0;
     * Returns communityFeeToken1 The community fee percentage of the swap fee in thousandths (1e-3) for token1;
     * Returns unlocked Whether the pool is currently locked to reentrancy;
     */
    function globalState()
        external
        view
        returns (
            uint160 price,
            int24 tick,
            uint16 fee,
            uint16 timepointIndex,
            uint8 communityFeeToken0,
            uint8 communityFeeToken1,
            bool unlocked
        );

    /**
     * @notice The currently in range liquidity available to the pool
     * @dev This value has no relationship to the total liquidity across all ticks.
     * Returned value cannot exceed type(uint128).max
     */
    function liquidity() external view returns (uint128);

    /**
     * @notice The pool tick spacing
     * @dev Ticks can only be used at multiples of this value
     * e.g.: a tickSpacing of 60 means ticks can be initialized every 60th tick, i.e., ..., -120, -60, 0, 60, 120, ...
     * This value is an int24 to avoid casting even though it is always positive.
     * @return The tick spacing
     */
    function tickSpacing() external view returns (int24);

    /** @notice Returns 256 packed tick initialized boolean values. See TickTable for more information */
    function tickTable(int16 wordPosition) external view returns (uint256);

    /**
     * @notice Look up information about a specific tick in the pool
     * @dev This is a public structure, so the `return` natspec tags are omitted.
     * @param tick The tick to look up
     * @return liquidityTotal the total amount of position liquidity that uses the pool either as tick lower or
     * tick upper;
     * Returns liquidityDelta how much liquidity changes when the pool price crosses the tick;
     * Returns outerFeeGrowth0Token the fee growth on the other side of the tick from the current tick in token0;
     * Returns outerFeeGrowth1Token the fee growth on the other side of the tick from the current tick in token1;
     * Returns outerTickCumulative the cumulative tick value on the other side of the tick from the current tick;
     * Returns outerSecondsPerLiquidity the seconds spent per liquidity on the other side of the tick from the current tick;
     * Returns outerSecondsSpent the seconds spent on the other side of the tick from the current tick;
     * Returns initialized Set to true if the tick is initialized, i.e. liquidityTotal is greater than 0
     * otherwise equal to false. Outside values can only be used if the tick is initialized.
     * In addition, these values are only relative and must be used only in comparison to previous snapshots for
     * a specific position.
     */
    function ticks(
        int24 tick
    )
        external
        view
        returns (
            uint128 liquidityTotal,
            int128 liquidityDelta,
            uint256 outerFeeGrowth0Token,
            uint256 outerFeeGrowth1Token,
            int56 outerTickCumulative,
            uint160 outerSecondsPerLiquidity,
            uint32 outerSecondsSpent,
            bool initialized
        );
}
