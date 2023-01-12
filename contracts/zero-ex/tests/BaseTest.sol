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

pragma solidity ^0.6.5;

import "forge-std/Test.sol";

contract BaseTest is Test {
    address payable internal account1 = payable(vm.addr(1));
    address payable internal account2 = payable(vm.addr(2));
    address payable internal account3 = payable(vm.addr(3));

    constructor() public {
        vm.deal(account1, 1e20);
        vm.deal(account2, 1e20);
        vm.deal(account3, 1e20);
    }
}