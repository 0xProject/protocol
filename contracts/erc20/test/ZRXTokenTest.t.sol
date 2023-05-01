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

pragma solidity ^0.8.17;

import "forge-std/Test.sol";
import "../src/IERC20Token.sol";

contract ZRXTokenTest is Test {
    address payable internal owner = payable(vm.addr(1));
    address payable internal user = payable(vm.addr(2));
    address payable internal anotherUser = payable(vm.addr(3));
    uint256 internal totalSupply = 1_000_000_000 * 1e18;
    IERC20Token zrxToken;

    function setUp() public {
        vm.deal(owner, 1e20);
        vm.deal(user, 1e20);

        vm.prank(owner);
        bytes memory _bytecode = vm.getCode("./out/ZRXToken.sol/ZRXToken.json");
        address _address;
        assembly {
            _address := create(0, add(_bytecode, 0x20), mload(_bytecode))
        }
        zrxToken = IERC20Token(address(_address));
    }

    function testShouldHave18Decimals() public {
        assertEq(zrxToken.decimals(), 18);
    }

    function testShouldHaveTotalSupplyOf1Billion() public {
        assertEq(zrxToken.totalSupply(), totalSupply);
    }

    function testShouldInitializeOwnerBalanceToTotalSupply() public {
        assertEq(zrxToken.balanceOf(owner), totalSupply);
    }

    function testShouldTransferBalanceCorrectly() public {
        vm.prank(owner);
        zrxToken.transfer(user, 100);

        assertEq(zrxToken.balanceOf(user), 100);
        assertEq(zrxToken.balanceOf(owner), totalSupply - 100);
    }

    function testShouldReturnTrueOnAZeroValueTransfer() public {
        vm.prank(owner);
        bool success = zrxToken.transfer(user, 0);
        assertTrue(success);
    }

    function testShouldReturnTrueOnAZeroValueTransferByUserWithZeroBalance() public {
        vm.prank(anotherUser);
        bool success = zrxToken.transfer(user, 0);
        assertTrue(success);
    }

    function testShouldReturnFalseIfSenderHasInsufficientBalance() public {
        vm.prank(owner);
        zrxToken.approve(user, totalSupply + 1);

        bool success = zrxToken.transferFrom(owner, user, totalSupply + 1);
        assertEq(success, false);
    }

    function testShouldReturnFalseIfRecipientHasInsufficientAllowance() public {
        vm.prank(owner);
        zrxToken.approve(user, totalSupply - 1);

        bool success = zrxToken.transferFrom(owner, user, totalSupply);
        assertEq(success, false);
    }

    function testShouldReturnTrueOnAZeroValueApprovedTransfer() public {
        vm.prank(user);
        bool success = zrxToken.transferFrom(owner, user, 0);
        assertEq(success, true);
    }

    function testShouldNotModifySenderAllowanceIfSetToUINT256Max() public {
        vm.prank(owner);
        zrxToken.approve(user, type(uint256).max);

        zrxToken.transferFrom(owner, user, 100);
        assertEq(zrxToken.allowance(owner, user), type(uint256).max);
    }

    function testShouldTransferCorrectlyWhenSufficientAllowance() public {
        vm.prank(owner);
        zrxToken.approve(user, 1000 * 1e18);

        vm.prank(user);
        zrxToken.transferFrom(owner, user, 100 * 1e18);
        assertEq(zrxToken.allowance(owner, user), 900 * 1e18);
        assertEq(zrxToken.balanceOf(user), 100 * 1e18);
        assertEq(zrxToken.balanceOf(owner), totalSupply - 100 * 1e18);
    }
}
