// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6;

import "./TestBase.sol";
import "../src/ERC20BridgeSampler.sol";

contract UniswapV2SamplerTest is
    TestBase 
{
    ERC20BridgeSampler sampler;

    function setUp() public {
        sampler = new ERC20BridgeSampler();
        sampler.setSampleValues(_toSingleValueArray(1e18));
    }

    function testUniswapV2Sell()
        public
        requiresChainId(1)
        requiresBlockNumberGte(14000000)
    {
        address router = 0xf164fC0Ec4E93095b804a4795bBe1e041497b92a;
        address weth = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
        address usdc = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;

        address[] memory path = new address[](2);
        path[0] = weth;
        path[1] = usdc;

        uint256[] memory values = sampler.sampleSellsFromUniswapV2Global(
            router,
            path
        );

        assertGt(values[0], 0);
    }
}
