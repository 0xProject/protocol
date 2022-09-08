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

contract Memory {

    function expand() public {
      // forge debug contracts/test/foundry/protocol-academy/8-evm/Memory.sol --sig 'expand()'

      // Observe the free memory pointer increase
      // when more memory is allocated
      bytes1[3] memory data;
    }

    function mstore() public {
      // forge debug contracts/test/foundry/protocol-academy/8-evm/Memory.sol --sig 'mstore()'

      // Observe the free memory pointer increase
      // when more memory is allocated
      bytes1[3] memory data;
      // Observe each value being set in the memory
      // slots
      data[1] = 0x42;
      data[0] = 0x0a;
      data[2] = 0xff;
    }
}