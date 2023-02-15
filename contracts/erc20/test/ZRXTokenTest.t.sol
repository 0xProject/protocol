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

pragma solidity ^0.8.17;

import "forge-std/Test.sol";
import "../src/v08/IERC20TokenV08.sol";

contract ZRXTokenTest is Test {
    address payable internal owner = payable(vm.addr(1));
    address payable internal spender = payable(vm.addr(2));
    IERC20TokenV08 zrxToken;

    function setUp() public {
        vm.deal(owner, 1e20);
        vm.deal(spender, 1e20);

        // zrxToken = new ZRXToken();
        bytes memory _bytecode = abi.encodePacked(vm.getCode("../out/ZRXToken.sol/ZRXToken.json"));
        address _address;
        assembly {
            _address := create(0, add(_bytecode, 0x20), mload(_bytecode))
        }
        zrxToken = IERC20TokenV08(address(_address));
    }

    function testShouldHave18Decimals() public {
        assertEq(zrxToken.decimals(), 18);
    }
}
