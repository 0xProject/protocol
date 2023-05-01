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
import "../src/v06/WETH9V06.sol";

contract WETH9V06Test is Test {
    address payable internal owner = payable(vm.addr(1));
    address payable internal user = payable(vm.addr(2));
    WETH9V06 internal etherToken;

    function setUp() public {
        vm.deal(owner, 1e20);
        vm.deal(user, 1e20);

        etherToken = new WETH9V06();
    }

    function testShouldRevertIfCallerAttemptsToDepositMoreThanTheirBalance() public {
        vm.prank(user);
        vm.expectRevert();
        etherToken.deposit{value: 1e20 + 1}();
    }

    function testShouldConvertDepositedETHToWrappedETH() public {
        vm.prank(user);
        etherToken.deposit{value: 1e20}();

        assertEq(etherToken.balanceOf(user), 1e20);
        assertEq(address(etherToken).balance, 1e20);
    }

    function testShouldRevertIfCallerAttemptsToWithdrawMoreThanTheirBalance() public {
        vm.prank(user);
        etherToken.deposit{value: 1e20}();

        vm.expectRevert();
        etherToken.withdraw(1e20 + 1);
    }

    function testShouldConvertWithdrawWrappedETHToETH() public {
        vm.prank(user);
        etherToken.deposit{value: 1e20}();
        vm.prank(user);
        etherToken.withdraw(100);

        assertEq(etherToken.balanceOf(user), 1e20 - 100);
        assertEq(address(etherToken).balance, 1e20 - 100);
        assertEq(user.balance, 100);
    }

    function testShouldConvertSentETHToWrappedETH() public {
        vm.prank(user);
        address(etherToken).call{value: 1e20}(new bytes(0));

        assertEq(etherToken.balanceOf(user), 1e20);
        assertEq(address(etherToken).balance, 1e20);
    }
}
