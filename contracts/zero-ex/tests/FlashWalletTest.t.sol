// SPDX-License-Identifier: Apache-2.0
/*

  Copyright 2022 ZeroEx Intl.

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

import "./BaseTest.sol";
import "../contracts/src/external/FlashWallet.sol";
import "./mocks/TestCallTarget.sol";

contract FlashWalletTest is BaseTest {
    address public owner = account1;
    FlashWallet public wallet;
    TestCallTarget public callTarget;

    function setUp() public {
        vm.startPrank(owner);

        wallet = new FlashWallet();
        callTarget = new TestCallTarget();

        vm.stopPrank();
    }

    function testOwnedByDeployer() public {
        assertEq(wallet.owner(), account1);
    }
}
