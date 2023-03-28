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
import "../mocks/IZeroExMock.sol";
import "../BaseTest.t.sol";
import "../../src/ZRXWrappedToken.sol";
import "../../src/ZeroExVotes.sol";
import "../../src/ZeroExTimelock.sol";
import "../../src/ZeroExProtocolGovernor.sol";
import "../../src/ZeroExTreasuryGovernor.sol";

contract GovernanceE2ETest is BaseTest {
    uint256 internal mainnetFork;
    string internal MAINNET_RPC_URL = vm.envString("MAINNET_RPC_URL");

    address internal constant ZRX_TOKEN = 0xE41d2489571d322189246DaFA5ebDe1F4699F498;
    address internal constant EXCHANGE_PROXY = (0xDef1C0ded9bec7F1a1670819833240f027b25EfF);
    address internal constant EXCHANGE_GOVERNOR = 0x618F9C67CE7Bf1a50afa1E7e0238422601b0ff6e;

    IERC20 internal token;
    IZeroExMock internal exchange;

    ZRXWrappedToken internal wToken;
    ZeroExVotes internal votes;
    ZeroExTimelock internal protocolTimelock;
    ZeroExTimelock internal treasuryTimelock;
    ZeroExProtocolGovernor internal protocolGovernor;
    ZeroExTreasuryGovernor internal treasuryGovernor;

    function setUp() public {
        mainnetFork = vm.createFork(MAINNET_RPC_URL);
        vm.selectFork(mainnetFork);

        token = IERC20(ZRX_TOKEN);
        exchange = IZeroExMock(payable(EXCHANGE_PROXY));

        address protocolGovernorAddress;
        address treasuryGovernorAddress;
        (
            wToken,
            votes,
            protocolTimelock,
            treasuryTimelock,
            protocolGovernorAddress,
            treasuryGovernorAddress
        ) = setupGovernance(token);

        protocolGovernor = ZeroExProtocolGovernor(payable(protocolGovernorAddress));
        treasuryGovernor = ZeroExTreasuryGovernor(payable(treasuryGovernorAddress));
    }

    // Test switching owner of protocol from multisig to new protocol governor
    function testProtocolGovernanceMigration() public {
        // initially the zrx exchange is owned by the legacy exchange governor
        assertEq(exchange.owner(), EXCHANGE_GOVERNOR);

        // transfer ownership to new protocol governor
        vm.prank(EXCHANGE_GOVERNOR);
        exchange.transferOwnership(address(protocolGovernor));
        assertEq(exchange.owner(), address(protocolGovernor));
    }
}
