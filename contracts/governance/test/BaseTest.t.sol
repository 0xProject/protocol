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
import "forge-std/console.sol";
import "@openzeppelin/token/ERC20/ERC20.sol";
import "./ZRXMock.sol";
import "../src/ZRXWrappedToken.sol";
import "../src/ZeroExVotes.sol";
import "../src/ZeroExTimelock.sol";
import "../src/ZeroExProtocolGovernor.sol";

contract BaseTest is Test {
    address payable internal account1 = payable(vm.addr(1));
    address payable internal account2 = payable(vm.addr(2));
    address payable internal account3 = payable(vm.addr(3));
    address payable internal account4 = payable(vm.addr(4));

    constructor() public {
        vm.deal(account1, 1e20);
        vm.deal(account2, 1e20);
        vm.deal(account3, 1e20);
        vm.deal(account4, 1e20);
    }

    function setupGovernance()
        internal
        returns (IERC20, ZRXWrappedToken, ZeroExVotes, ZeroExTimelock, ZeroExProtocolGovernor)
    {
        // Use this once https://linear.app/0xproject/issue/PRO-44/zrx-artifact-is-incompatible-with-foundry is resolved
        // bytes memory _bytecode = abi.encodePacked(vm.getCode("./ZRXToken.json"));
        // address _address;
        // assembly {
        //     _address := create(0, add(_bytecode, 0x20), mload(_bytecode))
        // }
        // return address(_address);

        ZRXMock mockZRX = new ZRXMock();
        ZeroExVotes votes = new ZeroExVotes();
        ZRXWrappedToken token = new ZRXWrappedToken(mockZRX, votes);
        votes.initialize(address(token));

        address[] memory proposers = new address[](0);
        address[] memory executors = new address[](0);

        ZeroExTimelock timelock = new ZeroExTimelock(7 days, proposers, executors, account1);
        ZeroExProtocolGovernor governor = new ZeroExProtocolGovernor(IVotes(address(votes)), timelock);

        timelock.grantRole(timelock.PROPOSER_ROLE(), address(governor));
        timelock.grantRole(timelock.EXECUTOR_ROLE(), address(governor));

        return (mockZRX, token, votes, timelock, governor);
    }
}
