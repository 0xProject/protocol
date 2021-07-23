// SPDX-License-Identifier: Apache-2.0
/*

  Copyright 2021 ZeroEx Intl.

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

import "./SamplerUtils.sol";

contract AaveV2Sampler is SamplerUtils {

    struct AaveInfo {
        address lendingPool;
        address aToken;
        address underlyingToken;
    }

    function sampleSellsFromAaveV2(
        AaveInfo memory aaveInfo,
        address takerToken,
        address makerToken,
        uint256[] memory takerTokenAmounts
    )
        public
        pure
        returns (uint256[] memory)
    {
        // Deposit/Withdrawal underlying <-> aToken is always 1:1
        if (takerToken == aaveInfo.aToken && makerToken == aaveInfo.underlyingToken ||
            takerToken == aaveInfo.underlyingToken && makerToken == aaveInfo.aToken) {
            return takerTokenAmounts;
        }

        // Not matching the reserve return 0 results
        uint256 numSamples = takerTokenAmounts.length;
        uint256[] memory makerTokenAmounts = new uint256[](numSamples);
        return makerTokenAmounts;
    }

    function sampleBuysFromAaveV2(
        AaveInfo memory aaveInfo,
        address takerToken,
        address makerToken,
        uint256[] memory makerTokenAmounts
    )
        public
        pure
        returns (uint256[] memory)
    {
        // Deposit/Withdrawal underlying <-> aToken is always 1:1
        if (takerToken == aaveInfo.aToken && makerToken == aaveInfo.underlyingToken ||
            takerToken == aaveInfo.underlyingToken && makerToken == aaveInfo.aToken) {
            return makerTokenAmounts;
        }

        // Not matching the reserve return 0 results
        uint256 numSamples = makerTokenAmounts.length;
        uint256[] memory takerTokenAmounts = new uint256[](numSamples);
        return takerTokenAmounts;
    }
}
