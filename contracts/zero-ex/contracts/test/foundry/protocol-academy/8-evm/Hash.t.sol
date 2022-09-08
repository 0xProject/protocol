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

contract Hash {
    bytes data = hex"42";

    function sha3() public {
        // forge debug contracts/test/foundry/protocol-academy/8-evm/Hash.sol --sig 'sha3()'

        // Follow the opcodes:
        //   how does the data get loaded
        //   which one is keccak256
        keccak256(data);
    }

    function sha2() public {
        // forge debug contracts/test/foundry/protocol-academy/8-evm/Hash.sol --sig 'sha2()'

        // Follow the opcodes:
        //   why is sha256 so different from keccak256
        sha256(data);
    }
}