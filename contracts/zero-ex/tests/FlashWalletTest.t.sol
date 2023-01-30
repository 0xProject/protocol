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

import "utils/BaseTest.sol";
import "../contracts/src/external/FlashWallet.sol";
import "./mocks/TestCallTarget.sol";

contract FlashWalletTest is BaseTest {
    address public owner = account1;
    FlashWallet public wallet;
    TestCallTarget public callTarget;

    bytes public constant MAGIC_BYTES = hex"1234567800000000000000000000000000000000000000000000000000000000";
    bytes public constant REVERTING_DATA = hex"1337";

    event CallTargetCalled(address sender, bytes data, uint256 value);

    function setUp() public {
        vm.startPrank(owner);

        wallet = new FlashWallet();
        callTarget = new TestCallTarget();

        vm.stopPrank();
    }

    function test_OwnedByDeployer() public {
        assertEq(wallet.owner(), account1);
    }

    function test_executeCall_nonOwnerCannotExecute() public {
        vm.expectRevert(LibOwnableRichErrorsV06.OnlyOwnerError(account2, owner));
        vm.startPrank(account2);
        wallet.executeCall(address(callTarget), "0x1", 123);
    }

    function test_executeCall_ownerCanCallWithZeroValue() public {
        vm.expectEmit(true, true, true, true);
        emit CallTargetCalled(address(wallet), "0x1", 0);
        vm.startPrank(owner);
        wallet.executeCall(address(callTarget), "0x1", 0);
    }

    function test_executeCall_ownerCanCallWithNonZeroValue() public {
        vm.expectEmit(true, true, true, true);
        emit CallTargetCalled(address(wallet), "0x1", 1);
        vm.startPrank(owner);
        wallet.executeCall{value: 1}(address(callTarget), "0x1", 1);
    }

    function test_executeCall_ownerCanTransferLessETHThanAttached() public {
        vm.expectEmit(true, true, true, true);
        emit CallTargetCalled(address(wallet), "0x1", 1);
        vm.startPrank(owner);
        // Send value 2 but execute call with 1
        wallet.executeCall{value: 2}(address(callTarget), "0x1", 1);
    }

    function test_executeCall_walletReturnsCallResult() public {
        vm.startPrank(owner);
        bytes memory result = wallet.executeCall(address(callTarget), "0x1", 0);
        assertEq0(result, MAGIC_BYTES);
    }

    function test_executeCall_walletWrapsCallRevert() public {
        (, bytes memory resultData) = address(callTarget).call(REVERTING_DATA);
        bytes memory error = LibWalletRichErrors.WalletExecuteCallFailedError(
            address(wallet),
            address(callTarget),
            REVERTING_DATA,
            0,
            resultData
        );

        vm.expectRevert(error);

        vm.startPrank(owner);
        wallet.executeCall(address(callTarget), REVERTING_DATA, 0);
    }

    function test_executeCall_walletCanReceiveETH() public {
        vm.startPrank(owner);
        (bool sent, ) = address(wallet).call{value: 1}("");
        assertTrue(sent, "Failed to send ETH to wallet");
        assertEq(address(wallet).balance, 1);
    }

    function test_executeDelegateCall_nonOwnerCannotExecute() public {
        vm.expectRevert(LibOwnableRichErrorsV06.OnlyOwnerError(account2, owner));
        vm.startPrank(account2);
        wallet.executeDelegateCall(address(callTarget), "0x1");
    }

    function test_executeDelegateCall_ownerCanExecute() public {
        vm.expectEmit(true, true, true, true);
        emit CallTargetCalled(owner, "0x1", 0);
        vm.startPrank(owner);
        wallet.executeDelegateCall(address(callTarget), "0x1");
    }

    function test_executeDelegateCall_ownerCanExecuteWithValue() public {
        vm.expectEmit(true, true, true, true);
        emit CallTargetCalled(owner, "0x1", 1);
        vm.startPrank(owner);
        wallet.executeDelegateCall{value: 1}(address(callTarget), "0x1");
    }

    function test_executeDelegateCall_walletReturnsCallResult() public {
        vm.startPrank(owner);
        bytes memory result = wallet.executeDelegateCall(address(callTarget), "0x1");
        assertEq0(result, MAGIC_BYTES);
    }

    function test_executeDelegateCall_walletWrapsCallRevert() public {
        (, bytes memory resultData) = address(callTarget).call(REVERTING_DATA);
        bytes memory error = LibWalletRichErrors.WalletExecuteDelegateCallFailedError(
            address(wallet),
            address(callTarget),
            REVERTING_DATA,
            resultData
        );

        vm.expectRevert(error);

        vm.startPrank(owner);
        wallet.executeDelegateCall(address(callTarget), REVERTING_DATA);
    }
}
