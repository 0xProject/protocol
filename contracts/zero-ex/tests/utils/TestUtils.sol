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

pragma solidity ^0.6;
pragma experimental ABIEncoderV2;

import "forge-std/Test.sol";

import "src/transformers/LibERC20Transformer.sol";

contract TestUtils is Test {
    function _findTransformerNonce(address transformer, address deployer) internal pure returns (uint32) {
        address current;
        for (uint32 i = 0; i < 1024; i++) {
            current = LibERC20Transformer.getDeployedAddress(deployer, i);
            if (current == transformer) {
                return i;
            }
        }
    }
}
