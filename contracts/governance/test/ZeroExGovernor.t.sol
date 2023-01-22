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
import "../src/ZeroExTimelock.sol";
import "../src/ZeroExGovernor.sol";
import "../src/ZRXWrappedToken.sol";
import "@openzeppelin/token/ERC20/ERC20.sol";

contract ZeroExGovernorTest is BaseTest {
    IERC20 public token;
    ZRXWrappedToken public wToken;
    ZeroExTimelock public timelock;
    ZeroExGovernor public governor;

    function setUp() public {
        vm.startPrank(account1);
        token = IERC20(createZRXToken());
        token.transfer(account2, 100e18);
        token.transfer(account3, 200e18);

        wToken = new ZRXWrappedToken(token);

        address[] memory proposers = new address[](0);
        address[] memory executors = new address[](0);
        timelock = new ZeroExTimelock(7 days, proposers, executors);

        governor = new ZeroExGovernor(wToken, timelock);
        vm.stopPrank();
    }

    function testShouldReturnCorrectName() public {
        assertEq(governor.name(), "ZeroExGovernor");
    }

    function testShouldReturnCorrectVotingDelay() public {
        assertEq(governor.votingDelay(), 21600);
    }

    function testShouldReturnCorrectVotingPeriod() public {
        assertEq(governor.votingPeriod(), 50400);
    }

    function testShouldReturnCorrectProposalThreshold() public {
        assertEq(governor.proposalThreshold(), 0);
    }

    function testShouldReturnCorrectQuorum() public {
        assertEq(governor.quorumNumerator(), 10);
    }

    function testShouldReturnCorrectToken() public {
        assertEq(address(governor.token()), address(wToken));
    }

    function testShouldReturnCorrectTimelock() public {
        assertEq(address(governor.timelock()), address(timelock));
    }
}
