// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";

import {UniswapV3PoolFetcher, UniswapV3Pool, IUniswapV3Factory} from "../src/contracts/UniswapV3PoolFetcher.sol";
import {FakeERC20} from "./fakes/FakeERC20.sol";

contract VoidUniswapV3Factory {
    function getPool(address, address, uint24) external pure returns (address) {
        return address(0);
    }
}

contract MockUniswapV3Pool {
    uint160 sqrtPriceX96;
    address token0Address;
    address token1Address;

    constructor(uint160 _sqrtPriceX96, address _token0, address _token1) {
        sqrtPriceX96 = _sqrtPriceX96;
        token0Address = _token0;
        token1Address = _token1;
    }

    function slot0() external view returns (uint160, int24, uint16, uint16, uint16, uint8, bool) {
        return (sqrtPriceX96, 0, 0, 0, 0, 0, false);
    }

    function token0() external view returns (address) {
        return token0Address;
    }

    function token1() external view returns (address) {
        return token1Address;
    }
}

contract UniswapV3PoolFetcherTest is Test {
    FakeERC20 public fakeUsdc;
    FakeERC20 public fakeWeth;
    FakeERC20 public fakeDai;
    UniswapV3PoolFetcher public fetcher;

    function setUp() public {
        fakeUsdc = new FakeERC20("USD Coin", "USDC", 6);
        fakeWeth = new FakeERC20("Wrapped ETH", "WETH", 18);
        fakeDai = new FakeERC20("Dai Stablecoin", "DAI", 18);
        fetcher = new UniswapV3PoolFetcher();

        // Make `factoryAddress`  to return 0 address on getPool();
        vm.etch(address(fetcher.factory()), address(new VoidUniswapV3Factory()).code);
    }

    function testZeroAddressAndTvlWhenNoPools() public {
        UniswapV3Pool[] memory pools = fetcher.getPools(address(42), address(43));

        assertEq(pools.length, 4);

        assertEq(pools[0].fee, 100);
        assertEq(pools[0].poolAddress, address(0));
        assertEq(pools[0].totalValueInToken1, 0);

        assertEq(pools[1].fee, 500);
        assertEq(pools[1].poolAddress, address(0));
        assertEq(pools[1].totalValueInToken1, 0);

        assertEq(pools[2].fee, 3000);
        assertEq(pools[2].poolAddress, address(0));
        assertEq(pools[2].totalValueInToken1, 0);

        assertEq(pools[3].fee, 10000);
        assertEq(pools[3].poolAddress, address(0));
        assertEq(pools[3].totalValueInToken1, 0);
    }

    function testUsdcWethPools() public {
        address factoryAddress = address(fetcher.factory());

        MockUniswapV3Pool pool5bps = new MockUniswapV3Pool(
            // echo '(1952778395280128921191001709604188^2) * 10^6 / (2^192)' | bc
            1952778395280128921191001709604188, // 1 USDC = 607500662220496 WETH / 1e18
            address(fakeUsdc),
            address(fakeWeth)
        );
        fakeUsdc.mint(address(pool5bps), 100_000_000 * 1e6);
        fakeWeth.mint(address(pool5bps), 100_000 * 1e18);
        vm.mockCall(
            factoryAddress,
            abi.encodeWithSelector(
                IUniswapV3Factory.getPool.selector,
                address(fakeUsdc),
                address(fakeWeth),
                uint24(500)
            ),
            abi.encode(address(pool5bps))
        );

        MockUniswapV3Pool pool30bps = new MockUniswapV3Pool(
            // echo '(1953778395280128921191001709604188^2) * 10^6 / (2^192)' | bc
            1953778395280128921191001709604188, // 1 USDC = 608123012622838 WETH / 1e18
            address(fakeUsdc),
            address(fakeWeth)
        );
        fakeUsdc.mint(address(pool30bps), 50_000_000 * 1e6);
        fakeWeth.mint(address(pool30bps), 50_000 * 1e18);
        vm.mockCall(
            factoryAddress,
            abi.encodeWithSelector(
                IUniswapV3Factory.getPool.selector,
                address(fakeUsdc),
                address(fakeWeth),
                uint24(3000)
            ),
            abi.encode(address(pool30bps))
        );

        UniswapV3Pool[] memory pools = fetcher.getPools(address(fakeUsdc), address(fakeWeth));

        assertEq(pools[1].fee, 500);
        assertEq(pools[1].poolAddress, address(pool5bps));
        // 100m USDC + 100k WETH
        assertEq(pools[1].totalValueInToken1, 100_000_000 * 607500662220496 + 100_000 * 1e18);

        assertEq(pools[2].fee, 3000);
        assertEq(pools[2].poolAddress, address(pool30bps));
        // 50m USDC + 50k WETH
        assertEq(pools[2].totalValueInToken1, 50_000_000 * 608123012622838 + 50_000 * 1e18);
    }

    function testUsdcDaiPools() public {
        address factoryAddress = address(fetcher.factory());
        MockUniswapV3Pool pool1bps = new MockUniswapV3Pool(
            // echo '(79231158259708656486340^2) * 10^18 / (2^192)' | bc
            79231158259708656486340, // 1 DAI = 1000075 USDC / 1e6
            address(fakeDai),
            address(fakeUsdc)
        );
        fakeDai.mint(address(pool1bps), 35_000_000 * 1e18);
        fakeUsdc.mint(address(pool1bps), 70_000_000 * 1e6);
        vm.mockCall(
            factoryAddress,
            abi.encodeWithSelector(
                IUniswapV3Factory.getPool.selector,
                address(fakeDai),
                address(fakeUsdc),
                uint24(100)
            ),
            abi.encode(address(pool1bps))
        );

        UniswapV3Pool[] memory pools = fetcher.getPools(address(fakeDai), address(fakeUsdc));

        assertEq(pools[0].fee, 100);
        assertEq(pools[0].poolAddress, address(pool1bps));
        // 35m DAI + 70m USDC
        assertEq(pools[0].totalValueInToken1, 35_000_000 * 1000075 + 70_000_000 * 1e6);
    }
}
