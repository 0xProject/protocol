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
pragma experimental ABIEncoderV2;

import "forge-std/Test.sol";
import "../../../contracts/src/transformers/bridges/OptimismBridgeAdapter.sol";
import "../../../contracts/src/transformers/bridges/BridgeProtocols.sol";

contract OptimismBridgeAdapterTest is Test {
    address constant WETH = 0x4200000000000000000000000000000000000006;

    OptimismBridgeAdapter private adapter;

    function setUp() public {
        vm.chainId(10);
        adapter = new OptimismBridgeAdapter(IEtherToken(WETH));
    }

    function testSupportVelodromeV2() public {
        assertTrue(adapter.isSupportedSource(bytes32(uint256(BridgeProtocols.VELODROMEV2) << 128)));
    }
}
