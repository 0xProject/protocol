pragma solidity ^0.6;
pragma experimental ABIEncoderV2;

import "../src/features/LimitOrdersFeature.sol";

contract TestLimitOrdersFeature is
    LimitOrdersFeature
{
    constructor(
        address zeroExAddress,
        IEtherTokenV06 weth,
        IStaking staking,
        uint32 protocolFeeMultiplier
    )
        public
        LimitOrdersFeature(zeroExAddress, weth, staking, protocolFeeMultiplier)
    {
        // solhint-disable no-empty-blocks
    }

    modifier onlySelf() override {
        _;
    }
}
