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

contract SamplerBase
{
    /// @dev Stored Sample values for each Sampler to pull
    uint256[] internal SAMPLE_VALUES = new uint256[](0);

    function setSampleValues(uint256[] memory sampleValues)
        public
    {
        SAMPLE_VALUES = sampleValues;
    }

    modifier resetsSampleValues
    {
        uint256[] memory sampleValues = SAMPLE_VALUES;
        _;
        SAMPLE_VALUES = sampleValues;
    }
}
