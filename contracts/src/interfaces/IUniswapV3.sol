pragma solidity >=0.6;

import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";

interface IUniswapV3QuoterV2 {
    function factory() external view returns (IUniswapV3Factory factory);

    // @notice Returns the amount out received for a given exact input swap without executing the swap
    // @param path The path of the swap, i.e. each token pair and the pool fee
    // @param amountIn The amount of the first token to swap
    // @return amountOut The amount of the last token that would be received
    // @return sqrtPriceX96AfterList List of the sqrt price after the swap for each pool in the path
    // @return initializedTicksCrossedList List of the initialized ticks that the swap crossed for each pool in the path
    // @return gasEstimate The estimate of the gas that the swap consumes
    function quoteExactInput(
        bytes memory path,
        uint256 amountIn
    )
        external
        returns (
            uint256 amountOut,
            uint160[] memory sqrtPriceX96AfterList,
            uint32[] memory initializedTicksCrossedList,
            uint256 gasEstimate
        );

    // @notice Returns the amount in required for a given exact output swap without executing the swap
    // @param path The path of the swap, i.e. each token pair and the pool fee. Path must be provided in reverse order
    // @param amountOut The amount of the last token to receive
    // @return amountIn The amount of first token required to be paid
    // @return sqrtPriceX96AfterList List of the sqrt price after the swap for each pool in the path
    // @return initializedTicksCrossedList List of the initialized ticks that the swap crossed for each pool in the path
    // @return gasEstimate The estimate of the gas that the swap consumes
    function quoteExactOutput(
        bytes memory path,
        uint256 amountOut
    )
        external
        returns (
            uint256 amountIn,
            uint160[] memory sqrtPriceX96AfterList,
            uint32[] memory initializedTicksCrossedList,
            uint256 gasEstimate
        );
}

interface IUniswapV3Pool {
    function token0() external view returns (IERC20TokenV06);

    function token1() external view returns (IERC20TokenV06);

    function fee() external view returns (uint24);

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

    /// @notice Returns 256 packed tick initialized boolean values. See TickBitmap for more information
    function tickBitmap(int16 wordPosition) external view returns (uint256);

    /// @notice The pool tick spacing
    /// @dev Ticks can only be used at multiples of this value, minimum of 1 and always positive
    /// e.g.: a tickSpacing of 3 means ticks can be initialized every 3rd tick, i.e., ..., -6, -3, 0, 3, 6, ...
    /// This value is an int24 to avoid casting even though it is always positive.
    /// @return The tick spacing
    function tickSpacing() external view returns (int24);

    /// @notice The currently in range liquidity available to the pool
    /// @dev This value has no relationship to the total liquidity across all ticks
    function liquidity() external view returns (uint128);

    /// @notice Look up information about a specific tick in the pool
    /// @param tick The tick to look up
    /// @return liquidityGross the total amount of position liquidity that uses the pool either as tick lower or
    /// tick upper,
    /// liquidityNet how much liquidity changes when the pool price crosses the tick,
    /// feeGrowthOutside0X128 the fee growth on the other side of the tick from the current tick in token0,
    /// feeGrowthOutside1X128 the fee growth on the other side of the tick from the current tick in token1,
    /// tickCumulativeOutside the cumulative tick value on the other side of the tick from the current tick
    /// secondsPerLiquidityOutsideX128 the seconds spent per liquidity on the other side of the tick from the current tick,
    /// secondsOutside the seconds spent on the other side of the tick from the current tick,
    /// initialized Set to true if the tick is initialized, i.e. liquidityGross is greater than 0, otherwise equal to false.
    /// Outside values can only be used if the tick is initialized, i.e. if liquidityGross is greater than 0.
    /// In addition, these values are only relative and must be used only in comparison to previous snapshots for
    /// a specific position.
    function ticks(
        int24 tick
    )
        external
        view
        returns (
            uint128 liquidityGross,
            int128 liquidityNet,
            uint256 feeGrowthOutside0X128,
            uint256 feeGrowthOutside1X128,
            int56 tickCumulativeOutside,
            uint160 secondsPerLiquidityOutsideX128,
            uint32 secondsOutside,
            bool initialized
        );
}

interface IUniswapV3Factory {
    function getPool(address a, address b, uint24 fee) external view returns (IUniswapV3Pool pool);
}
