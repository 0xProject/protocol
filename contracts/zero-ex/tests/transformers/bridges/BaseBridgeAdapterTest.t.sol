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
import "../../../contracts/src/transformers/bridges/BaseBridgeAdapter.sol";
import "../../../contracts/src/transformers/bridges/BridgeProtocols.sol";

contract BaseBridgeAdapterTest is Test {
    address constant WETH = 0x4200000000000000000000000000000000000006;

    BaseBridgeAdapter private adapter;

    function setUp() public {
        vm.chainId(8453);
        adapter = new BaseBridgeAdapter(IEtherToken(WETH));
    }

    function testSupportsUniswapV3() public {
        assertTrue(adapter.isSupportedSource(bytes32(uint256(BridgeProtocols.UNISWAPV3) << 128)));
    }

    function testSupportMaverickV1() public {
        assertTrue(adapter.isSupportedSource(bytes32(uint256(BridgeProtocols.MAVERICKV1) << 128)));
    }

    function testSupportSolidly() public {
        assertTrue(adapter.isSupportedSource(bytes32(uint256(BridgeProtocols.SOLIDLY) << 128)));
    }

    function testSupportVelodromeV2() public {
        assertTrue(adapter.isSupportedSource(bytes32(uint256(BridgeProtocols.VELODROMEV2) << 128)));
    }
}
