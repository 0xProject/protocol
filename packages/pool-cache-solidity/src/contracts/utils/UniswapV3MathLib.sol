// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {FullMathLib} from "./FullMathLib.sol";
import {SafeERC20Lib} from "./SafeERC20Lib.sol";
import {ERC20} from "solmate/tokens/ERC20.sol";

library UniswapV3MathLib {
    using SafeERC20Lib for ERC20;

    /// @notice Get token0 price in token 1.
    /// @param  token0 token0 of a Uniswap V3 pool.
    /// @param  sqrtPriceX96 sqrtPriceX96 from slot0 of a Uniswap V3 pool.
    /// @return price token0 full unit (10^decimals) price in token1.
    function getToken0PriceInToken1(ERC20 token0, uint160 sqrtPriceX96) internal view returns (uint256 price) {
        // While the vast majority of ERC20 tokens implement `decimals()`, it is technically optional.
        // Use 18 if it's unimplemented.
        uint8 decimals = token0.safeDecimals(18);

        // Equations:
        //   sqrt(price) * 2^96 = sqrtPriceX96
        //   sqrt(price) = sqrtPriceX96 / 2^96
        //   price = (sqrtPriceX96 / 2^96)^2
        //   price = sqrtPriceX96^2 / 2^192
        //
        // NOTE: due to the decimals difference price may be expressable in the lowest unit.
        // For example, 1 wei is worth less than 1 USDC/10^6.
        uint256 priceX96 = uint256(sqrtPriceX96) * uint256(sqrtPriceX96);
        price = FullMathLib.mulDiv(priceX96, 10 ** decimals, 1 << 192);
    }
}
