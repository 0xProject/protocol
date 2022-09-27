// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6;
pragma experimental ABIEncoderV2;
import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";
import "../../src/vendor/IUniswapV2Pair.sol";

interface IUniswapV2PoolDeployer {
    struct CreationParameters {
        IERC20TokenV06 token0;
        IERC20TokenV06 token1;
    }

    function creationParameters() external view returns (CreationParameters memory);
}

contract TestUniswapV2Pool is IUniswapV2Pair {
    IERC20TokenV06 public immutable token0;
    IERC20TokenV06 public immutable token1;

    uint112 reserve0;
    uint112 reserve1;
    uint32 blockTimestampLast;

    constructor() public {
        IUniswapV2PoolDeployer.CreationParameters memory params = IUniswapV2PoolDeployer(msg.sender)
            .creationParameters();
        (token0, token1) = (params.token0, params.token1);
    }

    function swap(
        uint256 amount0Out,
        uint256 amount1Out,
        address to,
        bytes calldata /* data */
    ) external override {
        if (amount0Out > 0) {
            token0.transfer(to, amount0Out);
        }
        if (amount1Out > 0) {
            token1.transfer(to, amount1Out);
        }
    }

    function setReserves(
        uint112 reserve0_,
        uint112 reserve1_,
        uint32 blockTimestampLast_
    ) external {
        reserve0 = reserve0_;
        reserve1 = reserve1_;
        blockTimestampLast = blockTimestampLast_;
    }

    function getReserves()
        external
        view
        override
        returns (
            uint112,
            uint112,
            uint32
        )
    {
        return (reserve0, reserve1, blockTimestampLast);
    }
}
