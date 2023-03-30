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

import "@openzeppelin/token/ERC20/IERC20.sol";
import "../mocks/IZeroExMock.sol";
import "../mocks/IZrxTreasuryMock.sol";
import "../mocks/IStakingMock.sol";
import "../mocks/IZrxVaultMock.sol";
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
    address internal constant MATIC_TOKEN = 0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0;
    address internal constant WCELO_TOKEN = 0xE452E6Ea2dDeB012e20dB73bf5d3863A3Ac8d77a;
    address internal constant WYV_TOKEN = 0x056017c55aE7AE32d12AeF7C679dF83A85ca75Ff;

    address internal constant EXCHANGE_PROXY = 0xDef1C0ded9bec7F1a1670819833240f027b25EfF;
    address internal constant EXCHANGE_GOVERNOR = 0x618F9C67CE7Bf1a50afa1E7e0238422601b0ff6e;
    address internal constant TREASURY = 0x0bB1810061C2f5b2088054eE184E6C79e1591101;
    address internal constant STAKING = 0xa26e80e7Dea86279c6d778D702Cc413E6CFfA777; // Holds ~$262K in WETH for rewards
    address internal constant ZRX_VAULT = 0xBa7f8b5fB1b19c1211c5d49550fcD149177A5Eaf; // Holds ~$10m in staked ZRX
    address internal constant STAKING_AND_VAULT_OWNER = 0x7D3455421BbC5Ed534a83c88FD80387dc8271392;

    address internal staker1 = 0x885c327cAD2aebb969dfaAb4c928B73CA17e3887;
    address internal staker2 = 0x03c823e96F6964076C118395F08a2D7edF0f8a8C;

    // voting power 1500000e18
    address internal voter1 = 0x292c6DAE7417B3D31d8B6e1d2EeA0258d14C4C4b;
    bytes32 internal voter1Pool = 0x0000000000000000000000000000000000000000000000000000000000000030;
    bytes32[] internal voter1_operated_poolIds = [voter1Pool];

    // voting power 1500000.5e18
    address internal voter2 = 0x4990cE223209FCEc4ec4c1ff6E0E81eebD8Cca08;
    bytes32 internal voter2Pool = 0x0000000000000000000000000000000000000000000000000000000000000031;
    bytes32[] internal voter2_operated_poolIds = [voter2Pool];

    // voting power 1500000e18
    address internal voter3 = 0x5265Bde27F57E738bE6c1F6AB3544e82cdc92a8f;
    bytes32 internal voter3Pool = 0x0000000000000000000000000000000000000000000000000000000000000032;
    bytes32[] internal voter3_operated_poolIds = [voter3Pool];

    // voting power 1500000e18
    address internal voter4 = 0xcA9F5049c1Ea8FC78574f94B7Cf5bE5fEE354C31;
    bytes32 internal voter4Pool = 0x0000000000000000000000000000000000000000000000000000000000000034;
    bytes32[] internal voter4_operated_poolIds = [voter4Pool];

    // voting power 1500000e18
    address internal voter5 = 0xDBB5664a9DBCB98F6365804880e5b277B3155422;
    bytes32 internal voter5Pool = 0x0000000000000000000000000000000000000000000000000000000000000035;
    bytes32[] internal voter5_operated_poolIds = [voter5Pool];

    // voting power 2291490.952353335e18
    address internal voter6 = 0x9a4Eb1101C0c053505Bd71d2fFa27Ed902DEaD85;
    bytes32 internal voter6Pool = 0x0000000000000000000000000000000000000000000000000000000000000029;
    bytes32[] internal voter6_operated_poolIds = [voter6Pool];

    // voting power 4575984.325e18
    address internal voter7 = 0x9564177EC8052C92752a488a71769F710aA0A41D;
    bytes32 internal voter7Pool = 0x0000000000000000000000000000000000000000000000000000000000000025;
    bytes32[] internal voter7_operated_poolIds = [voter7Pool];

    IERC20 internal token;
    IERC20 internal maticToken;
    IERC20 internal wceloToken;
    IERC20 internal wyvToken;

    IZeroExMock internal exchange;
    IZrxTreasuryMock internal treasury;
    IZrxVaultMock internal vault;
    IStakingMock internal staking;

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
        maticToken = IERC20(MATIC_TOKEN);
        wceloToken = IERC20(WCELO_TOKEN);
        wyvToken = IERC20(WYV_TOKEN);

        exchange = IZeroExMock(payable(EXCHANGE_PROXY));
        treasury = IZrxTreasuryMock(TREASURY);
        vault = IZrxVaultMock(ZRX_VAULT);
        staking = IStakingMock(STAKING);

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

    function testProtocolGovernanceMigration() public {
        // initially the zrx exchange is owned by the legacy exchange governor
        assertEq(exchange.owner(), EXCHANGE_GOVERNOR);

        // transfer ownership to new protocol governor
        vm.prank(EXCHANGE_GOVERNOR);
        exchange.transferOwnership(address(protocolGovernor));
        assertEq(exchange.owner(), address(protocolGovernor));
    }

    function testTreasuryGovernanceMigration() public {
        // Create a proposal to migrate to new governor

        uint256 currentEpoch = staking.currentEpoch();
        uint256 executionEpoch = currentEpoch + 2;

        vm.startPrank(voter3);

        IZrxTreasuryMock.ProposedAction[] memory actions = new IZrxTreasuryMock.ProposedAction[](4);

        // Transfer MATIC
        uint256 maticBalance = maticToken.balanceOf(address(treasury));
        actions[0] = IZrxTreasuryMock.ProposedAction({
            target: MATIC_TOKEN,
            data: abi.encodeCall(maticToken.transfer, (address(treasuryGovernor), maticBalance)),
            value: 0
        });

        // Transfer ZRX
        uint256 zrxBalance = token.balanceOf(address(treasury));
        actions[1] = IZrxTreasuryMock.ProposedAction({
            target: ZRX_TOKEN,
            data: abi.encodeCall(token.transfer, (address(treasuryGovernor), zrxBalance)),
            value: 0
        });

        // Transfer wCELO
        uint256 wceloBalance = wceloToken.balanceOf(address(treasury));
        actions[2] = IZrxTreasuryMock.ProposedAction({
            target: WCELO_TOKEN,
            data: abi.encodeCall(wceloToken.transfer, (address(treasuryGovernor), wceloBalance)),
            value: 0
        });

        // Transfer WYV
        uint256 wyvBalance = wyvToken.balanceOf(address(treasury));
        actions[3] = IZrxTreasuryMock.ProposedAction({
            target: WYV_TOKEN,
            data: abi.encodeCall(wyvToken.transfer, (address(treasuryGovernor), wyvBalance)),
            value: 0
        });

        uint256 proposalId = treasury.propose(
            actions,
            executionEpoch,
            "Z-5 Migrate to new treasury governor",
            voter3_operated_poolIds
        );

        // Once a proposal is created, it becomes open for voting at the epoch after next (currentEpoch + 2)
        // and is open for the voting period (currently set to 3 days).
        uint256 epochDurationInSeconds = staking.epochDurationInSeconds(); // Currently set to 604800 seconds = 7 days
        uint256 currentEpochEndTime = staking.currentEpochStartTimeInSeconds() + epochDurationInSeconds;

        vm.warp(currentEpochEndTime + 1);
        staking.endEpoch();
        vm.warp(block.timestamp + epochDurationInSeconds + 1);
        staking.endEpoch();

        vm.stopPrank();
        // quorum is 10,000,000e18 so reach that via the following votes
        vm.prank(voter1);
        treasury.castVote(proposalId, true, voter1_operated_poolIds);
        vm.stopPrank();

        vm.prank(voter2);
        treasury.castVote(proposalId, true, voter2_operated_poolIds);
        vm.stopPrank();

        vm.prank(voter3);
        treasury.castVote(proposalId, true, voter3_operated_poolIds);
        vm.stopPrank();

        vm.prank(voter4);
        treasury.castVote(proposalId, true, voter4_operated_poolIds);
        vm.stopPrank();

        vm.prank(voter5);
        treasury.castVote(proposalId, true, voter5_operated_poolIds);
        vm.stopPrank();

        vm.prank(voter6);
        treasury.castVote(proposalId, true, voter6_operated_poolIds);
        vm.stopPrank();

        vm.prank(voter7);
        treasury.castVote(proposalId, true, voter7_operated_poolIds);
        vm.stopPrank();

        vm.warp(block.timestamp + 3 days + 1);

        // Execute proposal
        treasury.execute(proposalId, actions);

        // Assert value of treasury has correctly transferred
        uint256 maticBalanceNewTreasury = maticToken.balanceOf(address(treasuryGovernor));
        assertEq(maticBalanceNewTreasury, maticBalance);

        uint256 zrxBalanceNewTreasury = token.balanceOf(address(treasuryGovernor));
        assertEq(zrxBalanceNewTreasury, zrxBalance);

        uint256 wceloBalanceNewTreasury = wceloToken.balanceOf(address(treasuryGovernor));
        assertEq(wceloBalanceNewTreasury, wceloBalance);

        uint256 wyvBalanceNewTreasury = wyvToken.balanceOf(address(treasuryGovernor));
        assertEq(wyvBalanceNewTreasury, wyvBalance);
    }

    // Test entering catastrophic failure mode on the zrx vault to decomission v3 staking
    function testCatastrophicFailureModeOnStaking() public {
        // Enter catastrophic failure mode on the zrx vault
        vm.prank(STAKING_AND_VAULT_OWNER);
        vault.enterCatastrophicFailure();
        vm.stopPrank();

        // Stakes can still be withdrawn
        // staker1 withdraws
        uint256 stake1 = vault.balanceOf(staker1);
        uint256 balance1 = token.balanceOf(staker1);
        assertGt(stake1, 0);

        vm.prank(staker1);
        vault.withdrawAllFrom(staker1);
        vm.stopPrank();

        assertEq(vault.balanceOf(staker1), 0);
        assertEq(token.balanceOf(staker1), stake1 + balance1);

        // staker2 withdraws
        uint256 stake2 = vault.balanceOf(staker2);
        uint256 balance2 = token.balanceOf(staker2);
        assertGt(stake2, 0);

        vm.prank(staker2);
        vault.withdrawAllFrom(staker2);
        vm.stopPrank();

        assertEq(vault.balanceOf(staker2), 0);
        assertEq(token.balanceOf(staker2), stake2 + balance2);
    }
}
