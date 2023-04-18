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
import "../mocks/ZeroExVotesMalicious.sol";
import "../mocks/ZeroExVotesMigration.sol";
import "../../src/ZRXWrappedToken.sol";
import "../../src/ZeroExVotes.sol";

contract ZeroExVotesTest is BaseTest {
    IERC20 internal token;
    ZRXWrappedToken internal wToken;
    ZeroExVotes internal votes;

    function setUp() public {
        token = mockZRXToken();
        (wToken, votes) = setupZRXWrappedToken(token);
        vm.startPrank(account1);
        token.transfer(account2, 1700000e18);
        token.transfer(account3, 1600000e18);
        token.transfer(account4, 1000000e18);
        vm.stopPrank();
    }

    function testShouldCorrectlyInitialiseToken() public {
        assertEq(votes.token(), address(wToken));
    }

    function testShouldNotBeAbleToReinitialise() public {
        vm.expectRevert("Initializable: contract is already initialized");
        votes.initialize();
    }

    function testShouldBeAbleToMigrate() public {
        vm.roll(block.number + 1);

        vm.startPrank(account2);
        token.approve(address(wToken), 100e18);
        wToken.depositFor(account2, 100e18);
        wToken.delegate(account3);
        vm.stopPrank();

        vm.startPrank(account3);
        token.approve(address(wToken), 200e18);
        wToken.depositFor(account3, 200e18);
        wToken.delegate(account3);
        vm.stopPrank();

        assertEq(votes.getVotes(account3), 300e18);
        assertEq(votes.getQuadraticVotes(account3), 300e18);

        vm.roll(block.number + 1);

        ZeroExVotesMigration newImpl = new ZeroExVotesMigration(address(wToken), quadraticThreshold);
        assertFalse(
            address(
                uint160(
                    uint256(vm.load(address(votes), 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc))
                )
            ) == address(newImpl)
        );
        vm.prank(account1);
        votes.upgradeToAndCall(address(newImpl), abi.encodeWithSignature("initialize()"));
        assertEq(
            address(
                uint160(
                    uint256(vm.load(address(votes), 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc))
                )
            ),
            address(newImpl)
        );

        ZeroExVotesMigration upgradedVotes = ZeroExVotesMigration(address(votes));

        assertEq(upgradedVotes.getVotes(account3), 300e18);
        assertEq(upgradedVotes.getQuadraticVotes(account3), 300e18);

        vm.roll(block.number + 1);

        vm.prank(account2);
        wToken.transfer(address(this), 50e18);

        assertEq(upgradedVotes.getVotes(account3), 250e18);
        assertEq(upgradedVotes.getQuadraticVotes(account3), 250e18);
        assertEq(upgradedVotes.getMigratedVotes(account3), CubeRoot.cbrt(50e18));

        vm.prank(account3);
        wToken.transfer(address(this), 100e18);
        assertEq(upgradedVotes.getVotes(account3), 150e18);
        assertEq(upgradedVotes.getQuadraticVotes(account3), 150e18);
        assertEq(upgradedVotes.getMigratedVotes(account3), CubeRoot.cbrt(50e18) + CubeRoot.cbrt(100e18));
    }

    function testShouldNotBeAbleToStopBurn() public {
        // wrap some token
        vm.startPrank(account2);
        token.approve(address(wToken), 1700000e18);
        wToken.depositFor(account2, 1700000e18);
        vm.stopPrank();
        assertEq(token.balanceOf(account2), 0);
        assertEq(wToken.balanceOf(account2), 1700000e18);

        // malicious upgrade
        vm.startPrank(account1);
        IZeroExVotes maliciousImpl = new ZeroExVotesMalicious(votes.token(), votes.quadraticThreshold());
        votes.upgradeTo(address(maliciousImpl));
        vm.stopPrank();

        // try to withdraw withdraw
        vm.prank(account2);
        wToken.withdrawTo(account2, 1700000e18);
        assertEq(token.balanceOf(account2), 1700000e18);
        assertEq(wToken.balanceOf(account2), 0);
    }

    function testShouldBeAbleToReadCheckpoints() public {
        // Account 2 wraps ZRX and delegates voting power to account3
        vm.startPrank(account2);
        token.approve(address(wToken), 1700000e18);
        wToken.depositFor(account2, 1700000e18);
        vm.roll(2);
        wToken.delegate(account3);

        assertEq(votes.numCheckpoints(account3), 1);

        IZeroExVotes.Checkpoint memory checkpoint = votes.checkpoints(account3, 0);
        assertEq(checkpoint.fromBlock, 2);
        assertEq(checkpoint.votes, 1700000e18);
        assertEq(checkpoint.quadraticVotes, quadraticThreshold + Math.sqrt((1700000e18 - quadraticThreshold) * 1e18));
    }

    function testShouldBeAbleToSelfDelegateVotingPower() public {
        // Check voting power initially is 0
        assertEq(votes.getVotes(account2), 0);
        assertEq(votes.getQuadraticVotes(account2), 0);

        // Wrap ZRX and delegate voting power to themselves
        vm.startPrank(account2);
        token.approve(address(wToken), 1700000e18);
        wToken.depositFor(account2, 1700000e18);
        wToken.delegate(account2);

        // Check voting power
        assertEq(votes.getVotes(account2), 1700000e18);
        assertEq(
            votes.getQuadraticVotes(account2),
            quadraticThreshold + Math.sqrt((1700000e18 - quadraticThreshold) * 1e18)
        );
    }

    function testShouldBeAbleToDelegateVotingPowerToAnotherAccount() public {
        // Check voting power initially is 0
        assertEq(votes.getVotes(account3), 0);
        assertEq(votes.getQuadraticVotes(account3), 0);

        // Account 2 wraps ZRX and delegates voting power to account3
        vm.startPrank(account2);
        token.approve(address(wToken), 1700000e18);
        wToken.depositFor(account2, 1700000e18);
        wToken.delegate(account3);

        // Check voting power
        assertEq(votes.getVotes(account3), 1700000e18);
        assertEq(
            votes.getQuadraticVotes(account3),
            quadraticThreshold + Math.sqrt((1700000e18 - quadraticThreshold) * 1e18)
        );
    }

    function testShouldBeAbleToDelegateVotingPowerToAnotherAccountWithSignature() public {
        uint256 nonce = 0;
        uint256 expiry = type(uint256).max;
        uint256 privateKey = 2;

        // Account 2 wraps ZRX and delegates voting power to account3
        vm.startPrank(account2);
        token.approve(address(wToken), 1700000e18);
        wToken.depositFor(account2, 1700000e18);
        vm.stopPrank();

        assertEq(wToken.delegates(account2), address(0));
        assertEq(votes.getVotes(account3), 0);
        assertEq(votes.getQuadraticVotes(account3), 0);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            privateKey,
            keccak256(
                abi.encodePacked(
                    "\x19\x01",
                    wToken.DOMAIN_SEPARATOR(),
                    keccak256(abi.encode(DELEGATION_TYPEHASH, account3, nonce, expiry))
                )
            )
        );
        wToken.delegateBySig(account3, nonce, expiry, v, r, s);

        assertEq(wToken.delegates(account2), account3);
        assertEq(votes.getVotes(account3), 1700000e18);
        assertEq(
            votes.getQuadraticVotes(account3),
            quadraticThreshold + Math.sqrt((1700000e18 - quadraticThreshold) * 1e18)
        );
    }

    function testShouldNotBeAbleToDelegateWithSignatureAfterExpiry() public {
        uint256 nonce = 0;
        uint256 expiry = block.timestamp - 1;
        uint256 privateKey = 2;

        // Account 2 wraps ZRX and delegates voting power to account3
        vm.startPrank(account2);
        token.approve(address(wToken), 1700000e18);
        wToken.depositFor(account2, 1700000e18);
        vm.stopPrank();

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            privateKey,
            keccak256(
                abi.encodePacked(
                    "\x19\x01",
                    wToken.DOMAIN_SEPARATOR(),
                    keccak256(abi.encode(DELEGATION_TYPEHASH, account3, nonce, expiry))
                )
            )
        );

        vm.expectRevert("ERC20Votes: signature expired");
        wToken.delegateBySig(account3, nonce, expiry, v, r, s);
    }

    function testMultipleAccountsShouldBeAbleToDelegateVotingPowerToAccountWithNoTokensOnSameBlock() public {
        // Check account4 voting power initially is 0
        assertEq(votes.getVotes(account4), 0);
        assertEq(votes.getQuadraticVotes(account4), 0);

        // Account 2 wraps ZRX and delegates voting power to account4
        vm.startPrank(account2);
        token.approve(address(wToken), 1700000e18);
        wToken.depositFor(account2, 1700000e18);
        wToken.delegate(account4);
        vm.stopPrank();

        // Account 3 also wraps ZRX and delegates voting power to account4
        vm.startPrank(account3);
        token.approve(address(wToken), 1600000e18);
        wToken.depositFor(account3, 1600000e18);
        wToken.delegate(account4);
        vm.stopPrank();

        // Check voting power
        assertEq(votes.getVotes(account4), 3300000e18);
        assertEq(
            votes.getQuadraticVotes(account4),
            quadraticThreshold *
                2 +
                Math.sqrt((1700000e18 - quadraticThreshold) * 1e18) +
                Math.sqrt((1600000e18 - quadraticThreshold) * 1e18)
        );
    }

    function testMultipleAccountsShouldBeAbleToDelegateVotingPowerToAccountWithNoTokensOnDifferentBlock() public {
        // Check account4 voting power initially is 0
        assertEq(votes.getVotes(account4), 0);
        assertEq(votes.getQuadraticVotes(account4), 0);

        // Account 2 wraps ZRX and delegates voting power to account4
        vm.startPrank(account2);
        token.approve(address(wToken), 1700000e18);
        wToken.depositFor(account2, 1700000e18);
        wToken.delegate(account4);
        vm.stopPrank();

        // Different block height
        vm.roll(2);
        // Account 3 also wraps ZRX and delegates voting power to account4
        vm.startPrank(account3);
        token.approve(address(wToken), 1600000e18);
        wToken.depositFor(account3, 1600000e18);
        wToken.delegate(account4);
        vm.stopPrank();

        // Check voting power
        assertEq(votes.getVotes(account4), 3300000e18);
        assertEq(
            votes.getQuadraticVotes(account4),
            quadraticThreshold *
                2 +
                Math.sqrt((1700000e18 - quadraticThreshold) * 1e18) +
                Math.sqrt((1600000e18 - quadraticThreshold) * 1e18)
        );
    }

    function testComplexDelegationScenario() public {
        // Account 2 wraps ZRX and delegates to itself
        vm.startPrank(account2);
        token.approve(address(wToken), 1700000e18);
        wToken.depositFor(account2, 1000000e18);
        wToken.delegate(account2);
        vm.stopPrank();

        assertEq(votes.getVotes(account2), 1000000e18);
        assertEq(votes.getQuadraticVotes(account2), 1000000e18);

        // Account 3 wraps ZRX and delegates to account4
        vm.startPrank(account3);
        token.approve(address(wToken), 500000e18);
        wToken.depositFor(account3, 500000e18);
        wToken.delegate(account4);
        vm.stopPrank();

        assertEq(votes.getVotes(account4), 500000e18);
        assertEq(votes.getQuadraticVotes(account4), 500000e18);

        // Voting power distribution now is as follows
        // account2 -> account2 1000000e18 | 1000000e18
        // account3 -> account4 500000e18  | 500000e18

        // Account 2 deposits the remaining 700000e18 and delegates to account3
        vm.startPrank(account2);
        wToken.depositFor(account2, 700000e18);
        wToken.delegate(account3);
        vm.stopPrank();

        assertEq(votes.getVotes(account3), 1700000e18);
        assertEq(
            votes.getQuadraticVotes(account3),
            quadraticThreshold + Math.sqrt((1700000e18 - quadraticThreshold) * 1e18)
        );

        // Voting power distribution now is as follows
        // account2 -> account3 1700000e18 | 1000000e18 + Math.sqrt((1700000e18 - 1000000e18) * 1e18)
        // account3 -> account4  500000e18 | 500000e18

        // Account 3 delegates to itself
        vm.startPrank(account3);
        wToken.delegate(account3);
        vm.stopPrank();

        assertEq(votes.getVotes(account3), 2200000e18);
        assertEq(
            votes.getQuadraticVotes(account3),
            quadraticThreshold + Math.sqrt((1700000e18 - quadraticThreshold) * 1e18) + 500000e18
        );

        // Voting power distribution now is as follows
        // account2, account3 -> account3 2200000e18 | 1000000e18 + Math.sqrt((2200000e18-1000000e18) *1e18) + 500000e18

        // Check account2 and account4 no longer have voting power
        assertEq(votes.getVotes(account2), 0);
        assertEq(votes.getQuadraticVotes(account2), 0);
        assertEq(votes.getVotes(account4), 0);
        assertEq(votes.getQuadraticVotes(account4), 0);
    }

    function testCheckpointIsCorrectlyUpdatedOnTheSameBlock() public {
        // Account 2 wraps ZRX and delegates 20e18 to itself
        vm.startPrank(account2);
        token.approve(address(wToken), 20e18);
        wToken.depositFor(account2, 20e18);
        wToken.delegate(account2);
        vm.stopPrank();

        assertEq(votes.numCheckpoints(account2), 1);
        IZeroExVotes.Checkpoint memory checkpoint1Account2 = votes.checkpoints(account2, 0);
        assertEq(checkpoint1Account2.fromBlock, 1);
        assertEq(checkpoint1Account2.votes, 20e18);
        assertEq(checkpoint1Account2.quadraticVotes, 20e18);

        // Account 3 wraps ZRX and delegates 10e18 to account2
        vm.startPrank(account3);
        token.approve(address(wToken), 10e18);
        wToken.depositFor(account3, 10e18);
        wToken.delegate(account2);
        vm.stopPrank();

        assertEq(votes.numCheckpoints(account2), 1);
        checkpoint1Account2 = votes.checkpoints(account2, 0);
        assertEq(checkpoint1Account2.fromBlock, 1);
        assertEq(checkpoint1Account2.votes, 30e18);
        assertEq(checkpoint1Account2.quadraticVotes, 20e18 + 10e18);
    }

    function testCheckpointIsCorrectlyUpdatedOnDifferentBlocks() public {
        // Account 2 wraps ZRX and delegates 20e18 to itself
        vm.startPrank(account2);
        token.approve(address(wToken), 20e18);
        wToken.depositFor(account2, 20e18);
        wToken.delegate(account2);
        vm.stopPrank();

        assertEq(votes.numCheckpoints(account2), 1);
        IZeroExVotes.Checkpoint memory checkpoint1Account2 = votes.checkpoints(account2, 0);
        assertEq(checkpoint1Account2.fromBlock, 1);
        assertEq(checkpoint1Account2.votes, 20e18);
        assertEq(checkpoint1Account2.quadraticVotes, 20e18);

        vm.roll(2);
        // Account 3 wraps ZRX and delegates 10e18 to account2
        vm.startPrank(account3);
        token.approve(address(wToken), 10e18);
        wToken.depositFor(account3, 10e18);
        wToken.delegate(account2);
        vm.stopPrank();

        assertEq(votes.numCheckpoints(account2), 2);
        IZeroExVotes.Checkpoint memory checkpoint2Account2 = votes.checkpoints(account2, 1);
        assertEq(checkpoint2Account2.fromBlock, 2);
        assertEq(checkpoint2Account2.votes, 30e18);
        assertEq(checkpoint2Account2.quadraticVotes, 20e18 + 10e18);

        // Check the old checkpoint hasn't changed
        checkpoint1Account2 = votes.checkpoints(account2, 0);
        assertEq(checkpoint1Account2.fromBlock, 1);
        assertEq(checkpoint1Account2.votes, 20e18);
        assertEq(checkpoint1Account2.quadraticVotes, 20e18);
    }
}
