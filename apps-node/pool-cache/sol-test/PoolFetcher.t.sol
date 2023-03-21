// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";

import {UniswapV3PoolFetcher, UniswapV3Pool, IUniswapV3Factory} from "../src/contracts/UniswapV3PoolFetcher.sol";
import {PoolFetcher, TokenPair} from "../src/contracts/PoolFetcher.sol";
import {FakeERC20} from "./fakes/FakeERC20.sol";
import {VoidUniswapV3Factory} from "./fakes/VoidUniswapV3Factory.sol";
import {MockUniswapV3Pool} from "./mocks/MockUniswapV3Pool.sol";

contract PoolFetcherTest is Test {
    FakeERC20 public fakeUsdc;
    FakeERC20 public fakeWeth;
    FakeERC20 public fakeDai;
    PoolFetcher public fetcher;

    function setUp() public {
        fakeUsdc = new FakeERC20("USD Coin", "USDC", 6);
        fakeWeth = new FakeERC20("Wrapped ETH", "WETH", 18);
        fakeDai = new FakeERC20("Dai Stablecoin", "DAI", 18);
        fetcher = new PoolFetcher();

        // Make `uniV3Factory` to return 0 address on getPool();
        vm.etch(address(fetcher.uniV3Factory()), address(new VoidUniswapV3Factory()).code);
    }

    function testBatchFetchEmpty() public {
        TokenPair[] memory pairs = new TokenPair[](0);
        UniswapV3Pool[] memory pools = fetcher.batchFetch(pairs);

        assertEq(pools.length, 0);
    }

    function testBatchFetchTwoPairs() public {
        TokenPair[] memory pairs = new TokenPair[](2);
        pairs[0] = TokenPair({tokenA: address(fakeUsdc), tokenB: address(fakeWeth)});
        pairs[1] = TokenPair({tokenA: address(fakeDai), tokenB: address(fakeUsdc)});

        address factoryAddress = address(fetcher.uniV3Factory());
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

        UniswapV3Pool[] memory pools = fetcher.batchFetch(pairs);

        //  USDC/WETH pools . DAI/USDC pools
        // [x, 5, x, x] . [1, x, x, x]
        assertEq(pools.length, 8);
        uint8[6] memory emptyPoolIndices = [0, 2, 3, 5, 6, 7];
        for (uint i = 0; i < emptyPoolIndices.length; i++) {
            uint8 poolIndex = emptyPoolIndices[i];
            assertEq(pools[poolIndex].poolAddress, address(0));
            assertEq(pools[poolIndex].totalValueInToken1, 0);
        }

        assertEq(pools[1].fee, 500);
        assertEq(pools[1].poolAddress, address(pool5bps));
        // 100m USDC + 100k WETH
        assertEq(pools[1].totalValueInToken1, 100_000_000 * 607500662220496 + 100_000 * 1e18);

        //
        assertEq(pools[4].fee, 100);
        assertEq(pools[4].poolAddress, address(pool1bps));
        // 35m DAI + 70m USDC
        assertEq(pools[4].totalValueInToken1, 35_000_000 * 1000075 + 70_000_000 * 1e6);
    }
}
