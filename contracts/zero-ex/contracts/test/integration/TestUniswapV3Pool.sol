// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6;
pragma experimental ABIEncoderV2;
import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";
import "../../src/vendor/IUniswapV3Pool.sol";

interface IUniswapV3PoolDeployer {
    struct CreationParameters {
        IERC20TokenV06 token0;
        IERC20TokenV06 token1;
        uint24 fee;
    }

    function creationParameters()
        external
        view
        returns (CreationParameters memory);
}

interface IUniswapV3SwapCallback {
    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata data
    ) external;
}

contract TestUniswapV3Pool is IUniswapV3Pool {
    IERC20TokenV06 public immutable token0;
    IERC20TokenV06 public immutable token1;
    uint24 public immutable fee;

    constructor() public {
        IUniswapV3PoolDeployer.CreationParameters
            memory params = IUniswapV3PoolDeployer(msg.sender)
                .creationParameters();
        (token0, token1, fee) = (params.token0, params.token1, params.fee);
    }

    function swap(
        address recipient,
        bool zeroForOne,
        int256 amountSpecified,
        uint160,
        bytes calldata data
    ) external override returns (int256 amount0, int256 amount1) {
        uint256 balance0Before = token0.balanceOf(address(this));
        uint256 balance1Before = token1.balanceOf(address(this));
        if (zeroForOne) {
            amount0 = int256(amountSpecified);
            // Always buy 100% of other token balance.
            amount1 = -int256(balance1Before);
            token1.transfer(recipient, balance1Before);
        } else {
            amount0 = -int256(balance0Before);
            // Always buy 100% of other token balance.
            amount1 = int256(amountSpecified);
            token0.transfer(recipient, balance0Before);
        }
        IUniswapV3SwapCallback(msg.sender).uniswapV3SwapCallback(
            amount0,
            amount1,
            data
        );
        int256 balance0Change = int256(token0.balanceOf(address(this))) -
            int256(balance0Before);
        int256 balance1Change = int256(token1.balanceOf(address(this))) -
            int256(balance1Before);
        require(
            balance0Change >= amount0 && balance1Change >= amount1,
            "TestUniswapV3Pool/SWAP_NOT_PAID"
        );
    }
}
