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

import "./BaseTest.sol";
import "../src/ZRXWrappedToken.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ZRXWrappedTokenTest is BaseTest {
    IERC20 public token;
    ZRXWrappedToken public wToken;
    address public voter1 = account1;

    function setUp() public {
        vm.startPrank(account1);

        token = IERC20(createZRXToken());
        token.transfer(account2, 100e18);
        token.transfer(account3, 100e18);

        wToken = new ZRXWrappedToken(token);

        vm.stopPrank(account1);
    }

    function testShouldBeAbleToWrapZRX() public {
        vm.startPrank(account2);
        token.approve(wToken.address, 1e18);
        wToken.depositFor(account2, 1e18);
    }

    function testShouldBeAbleToUnwrapToZRX() public {

    }
}
