/*

  Copyright 2020 ZeroEx Intl.

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

pragma solidity ^0.6.5;

import "@0x/contracts-zero-ex/contracts/test/TestFixinProtocolFees.sol";
import "@0x/contracts-zero-ex/contracts/src/external/FeeCollectorController.sol";


contract TestFixinProtocolFeesIntegration is TestFixinProtocolFees {
    constructor(
        IEtherTokenV06 weth,
        IStaking staking,
        uint32 protocolFeeMultiplier
    )
        public
        TestFixinProtocolFees(
            weth,
            staking,
            new FeeCollectorController(weth, staking),
            protocolFeeMultiplier
        )
    {}
}
