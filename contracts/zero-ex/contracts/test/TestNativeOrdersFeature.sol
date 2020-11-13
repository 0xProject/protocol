pragma solidity ^0.6;
pragma experimental ABIEncoderV2;

import "../src/features/NativeOrdersFeature.sol";

contract TestNativeOrdersFeature is
    NativeOrdersFeature
{
    constructor(
        address zeroExAddress,
        IEtherTokenV06 weth,
        IStaking staking,
        uint32 protocolFeeMultiplier
    )
        public
        NativeOrdersFeature(zeroExAddress, weth, staking, protocolFeeMultiplier)
    {
        // solhint-disable no-empty-blocks
    }

    modifier onlySelf() override {
        _;
    }
}
