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

pragma solidity ^0.6;
pragma experimental ABIEncoderV2;

import "forge-std/Test.sol";
import "forge-std/Script.sol";
import "@0x/contracts-erc20/src/IERC20Token.sol";

contract DealMe is Test, Script {
    function setUp() public {}

    function run() public {
        // set approval
        vm.startBroadcast(0x6879fAb591ed0d62537A3Cac9D7cd41218445a84);

        IERC20Token(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48).approve(
            0xDef1C0ded9bec7F1a1670819833240f027b25EfF,
            type(uint256).max
        );

        vm.stopBroadcast();
    }
}
