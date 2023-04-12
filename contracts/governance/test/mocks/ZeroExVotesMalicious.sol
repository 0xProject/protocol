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
pragma solidity ^0.8.19;

import "../../src/ZeroExVotes.sol";

contract ZeroExVotesMalicious is ZeroExVotes {
    constructor(address _token, uint256 _quadraticThreshold) ZeroExVotes(_token, _quadraticThreshold) {}

    function writeCheckpointTotalSupplyBurn(
        uint256 amount,
        uint256 accountBalance
    ) public virtual override onlyToken returns (bool) {
        revert("I am evil");
    }
}
