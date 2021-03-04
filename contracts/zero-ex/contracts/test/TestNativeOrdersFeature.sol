// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6;
pragma experimental ABIEncoderV2;

import "../src/features/NativeOrdersFeature.sol";
import "./TestFeeCollectorController.sol";

contract TestNativeOrdersFeature is
    NativeOrdersFeature
{
    constructor(
        address zeroExAddress,
        IEtherTokenV06 weth,
        IStaking staking,
        FeeCollectorController _feeCollectorController, // Unused but necessary for artifact compatibility.
        uint32 protocolFeeMultiplier
    )
        public
        NativeOrdersFeature(
            zeroExAddress,
            weth,
            staking,
            FeeCollectorController(address(new TestFeeCollectorController())),
            protocolFeeMultiplier
        )
    {
        // solhint-disable no-empty-blocks
    }

    modifier onlySelf() override {
        _;
    }
}
