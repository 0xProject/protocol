// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6;
pragma experimental ABIEncoderV2;

import "./TestBase.sol";
import "../src/ERC20BridgeSampler.sol";

contract CurveSamplerTest is
    TestBase 
{
    ERC20BridgeSampler sampler;

    function setUp() public {
        sampler = new ERC20BridgeSampler();
        sampler.setSampleValues(_toSingleValueArray(1e18));
    }

    function testCurveSampler()
        public
        requiresChainId(1)
        requiresBlockNumberGte(14000000)
    {

        uint256[] memory values = sampler.sampleSellsFromCurveGlobal(
            CurveSampler.CurveInfo({
                poolAddress: 0x06cb22615BA53E60D67Bf6C341a0fD5E718E1655,
                sellQuoteFunctionSelector: 0x07211ef7,
                buyQuoteFunctionSelector: 0x00000000
            }),
            0,
            1
        );

        assertGt(values[0], 0);
    }

    function testCurveSamplerOptimism()
        public
        requiresChainId(10)
        measureGasUsed()
    {

        uint256[] memory values = sampler.sampleSellsFromCurveGlobal(
            CurveSampler.CurveInfo({
                poolAddress: 0x1337BedC9D22ecbe766dF105c9623922A27963EC,
                sellQuoteFunctionSelector: 0x5e0d443f,
                buyQuoteFunctionSelector: 0x00000000
            }),
            0,
            1
        );

        assertGt(values[0], 0);
    }
}
