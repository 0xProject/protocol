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
import "src/features/DCAFeature.sol";
import "src/IZeroEx.sol";
import "src/ZeroEx.sol";

contract DeployDCAFeature is Test, Script {
    ZeroEx public ZERO_EX = ZeroEx(0xDef1C0ded9bec7F1a1670819833240f027b25EfF);
    IZeroEx public IZERO_EX = IZeroEx(address(ZERO_EX));

    function setUp() public {}

    function run() public {
        vm.startBroadcast(IZERO_EX.owner());

        DCAFeature feature = new DCAFeature(address(ZERO_EX));

        IZERO_EX.migrate(address(feature), abi.encodeWithSelector(DCAFeature.migrate.selector), IZERO_EX.owner());

        vm.stopBroadcast();
    }
}
