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

pragma solidity ^0.8.19;

import "@openzeppelin/token/ERC20/ERC20.sol";
import "../BaseTest.t.sol";
import "../../src/ZRXWrappedToken.sol";
import "../../src/ZeroExVotes.sol";
import "../../src/ZeroExTimelock.sol";
import "../../src/ZeroExProtocolGovernor.sol";
import "../../src/ZeroExTreasuryGovernor.sol";

contract GovernanceE2ETest is BaseTest {
    uint256 internal mainnetFork;
    string internal MAINNET_RPC_URL = vm.envString("MAINNET_RPC_URL");

    IERC20 internal token;
    ZRXWrappedToken internal wToken;
    ZeroExVotes internal votes;
    ZeroExTimelock internal protocolTimelock;
    ZeroExTimelock internal treasuryTimelock;
    //IZeroExGovernor internal governor;
    ZeroExProtocolGovernor internal protocolGovernor;
    ZeroExTreasuryGovernor internal treasuryGovernor;

    function setUp() public {
        mainnetFork = vm.createFork(MAINNET_RPC_URL);
        vm.selectFork(mainnetFork);

        //vm.rollFork(1_337_000);
        //assertEq(block.number, 1_337_000);
    }

    function testCanMigrateProtocolGovernance() public {}
}
