// SPDX-License-Identifier: Apache-2.0
/*

  Copyright 2022 ZeroEx Intl.

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

import "./mixins/MixinAaveV2.sol";
import "./mixins/MixinBalancer.sol";
import "./mixins/MixinBalancerV2.sol";
import "./mixins/MixinBalancerV2Batch.sol";
import "./mixins/MixinBancor.sol";
import "./mixins/MixinCompound.sol";
import "./mixins/MixinCurve.sol";
import "./mixins/MixinCurveV2.sol";

contract EthereumSubAdapter1 is
    MixinAaveV2,
    MixinBalancer,
    MixinBalancerV2,
    MixinBalancerV2Batch,
    MixinBancor,
    MixinCompound,
    MixinCurve,
    MixinCurveV2
{
    constructor(IEtherTokenV06 weth)
        public
        MixinBancor(weth)
        MixinCompound(weth)
        MixinCurve(weth)
    {
        uint256 chainId;
        assembly { chainId := chainid() }
        require(chainId == 1, 'EthereumSubAdapter1.constructor: wrong chain ID');
    }
}
