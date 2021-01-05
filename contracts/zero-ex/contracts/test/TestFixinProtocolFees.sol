// SPDX-License-Identifier: Apache-2.0
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
pragma experimental ABIEncoderV2;

import "../src/fixins/FixinProtocolFees.sol";

contract TestFixinProtocolFees is
    FixinProtocolFees
{
    constructor(
        IEtherTokenV06 weth,
        IStaking staking,
        FeeCollectorController feeCollectorController,
        uint32 protocolFeeMultiplier
    )
        public
        FixinProtocolFees(weth, staking, feeCollectorController, protocolFeeMultiplier)
    {
        // solhint-disalbe no-empty-blocks
    }

    function collectProtocolFee(bytes32 poolId)
        external
        payable
    {
        _collectProtocolFee(poolId);
    }

    function transferFeesForPool(bytes32 poolId)
        external
    {
        _transferFeesForPool(poolId);
    }

    function getFeeCollector(
        bytes32 poolId
    )
        external
        view
        returns (FeeCollector)
    {
        return _getFeeCollector(poolId);
    }

    function getSingleProtocolFee()
        external
        view
        returns (uint256 protocolFeeAmount)
    {
        return _getSingleProtocolFee();
    }
}
