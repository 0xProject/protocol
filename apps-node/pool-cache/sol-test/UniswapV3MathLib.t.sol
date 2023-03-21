// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";

import {UniswapV3MathLib} from "../src/contracts/utils/UniswapV3MathLib.sol";
import {FakeERC20} from "./fakes/FakeERC20.sol";

contract Empty {
    constructor() {}
}

contract UniswapV3MathLibTest is Test {
    // Getting an expected price:
    //   echo '(sqrtPriceX96^2) * 10^token0_decimal / (2^192)' | bc

    FakeERC20 public fakeUsdc;
    FakeERC20 public fakeWeth;
    FakeERC20 public fakeDai;
    FakeERC20 public fakeTokenNoDecimals;

    function setUp() public {
        fakeUsdc = new FakeERC20("USD Coin", "USDC", 6);
        fakeWeth = new FakeERC20("Wrapped ETH", "WETH", 18);
        fakeDai = new FakeERC20("Dai Stablecoin", "DAI", 18);
        fakeTokenNoDecimals = FakeERC20(address(new Empty()));
    }

    function testToken0HasLowerDecimalsThanToken1() public {
        // token0: USDC (6 decimals)
        // token1: WETH (18 decimals)
        uint160 sqrtPriceX96 = 1952778395280128921191001709604188;

        // price of 1 full unit of USDC in WETH / 1e18.
        uint256 price = UniswapV3MathLib.getToken0PriceInToken1(fakeUsdc, sqrtPriceX96);

        // echo '(1952778395280128921191001709604188^2) * 10^6 / (2^192)' | bc
        assertEq(price, 607500662220496);
    }

    function testToken0HasHigherDecimalsThanToken1() public {
        // token0: DAI (18 decimals)
        // token1: USDC (6 decimals)
        uint160 sqrtPriceX96 = 79229406225302662243734;

        // price of 1 full unit of DAI in USDC / 1e6.
        uint256 price = UniswapV3MathLib.getToken0PriceInToken1(fakeDai, sqrtPriceX96);

        // echo '(79229406225302662243734^2) * 10^18 / (2^192)' | bc
        assertEq(price, 1000031);
    }

    function testToken0Token1SameDecimals() public {
        // token0: DAI (18 decimals)
        // token1: WETH (18 decimals)
        uint160 sqrtPriceX96 = 1942142447267710574382686197;

        // price of 1 full unit of DAI in WETH / 1e18.
        uint256 price = UniswapV3MathLib.getToken0PriceInToken1(fakeDai, sqrtPriceX96);

        // echo '(1942142447267710574382686197^2) * 10^18 / (2^192)' | bc
        assertEq(price, 600901091695729);
    }

    function testToken0DecimalUnimplemented() public {
        // token0: token without decimals (uses 18 decimals as a fallback)
        // token1: WETH (18 decimals)
        uint160 sqrtPriceX96 = 4729455117412656742828900030;

        // price of 1 full unit of token0 in WETH / 1e18.
        uint256 price = UniswapV3MathLib.getToken0PriceInToken1(fakeDai, sqrtPriceX96);

        // echo '(4729455117412656742828900030^2) * 10^18 / (2^192)' | bc
        assertEq(price, 3563387475707827);
    }
}
