// SPDX-License-Identifier: Apache-2.0
/*
  Copyright 2023 ZeroEx Intl.
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

pragma solidity ^0.6;
pragma experimental ABIEncoderV2;

import "../src/features/NativeOrdersFeature.sol";
import "./TestFeeCollectorController.sol";

contract TestNativeOrdersFeature is NativeOrdersFeature {
    constructor(
        address zeroExAddress,
        IEtherToken weth,
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
    {}

    modifier onlySelf() override {
        _;
    }
}
