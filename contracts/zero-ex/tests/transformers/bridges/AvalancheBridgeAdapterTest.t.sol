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
import "../../../contracts/src/transformers/bridges/AvalancheBridgeAdapter.sol";
import "../../../contracts/src/transformers/bridges/BridgeProtocols.sol";

contract AvalancheBridgeAdapterTest is Test {
    address constant WAVAX = 0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7;

    AvalancheBridgeAdapter private adapter;

    function setUp() public {
        vm.chainId(43114);
        adapter = new AvalancheBridgeAdapter(IEtherToken(WAVAX));
    }

    function testSupportsUniswapV3() public {
        assertTrue(adapter.isSupportedSource(bytes32(uint256(BridgeProtocols.UNISWAPV3) << 128)));
    }
}
