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
import "@openzeppelin/proxy/ERC1967/ERC1967Proxy.sol";
import "./ZRXMock.sol";
import "../src/ZRXWrappedToken.sol";
import "../src/ZeroExVotes.sol";
import "../src/ZeroExTimelock.sol";
import "../src/ZeroExProtocolGovernor.sol";
import "../src/ZeroExTreasuryGovernor.sol";

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
        returns (IERC20, ZRXWrappedToken, ZeroExVotes, ZeroExTimelock, ZeroExProtocolGovernor, ZeroExTreasuryGovernor)
    {
        bytes memory _bytecode = vm.getCode("./ZRXToken.json");
        address _address;
        assembly {
            _address := create(0, add(_bytecode, 0x20), mload(_bytecode))
        }

        ZeroExVotes votes = new ZeroExVotes();
        ERC1967Proxy votesProxy = new ERC1967Proxy(address(votes), new bytes(0));
        votes = ZeroExVotes(address(votesProxy));

        ZRXWrappedToken token = new ZRXWrappedToken(IERC20(address(_address)), IZeroExVotes(address(votesProxy)));
        votes.initialize(address(token));

        address[] memory proposers = new address[](0);
        address[] memory executors = new address[](0);

        ZeroExTimelock protocolTimelock = new ZeroExTimelock(2 days, proposers, executors, account1);
        ZeroExProtocolGovernor protocolGovernor = new ZeroExProtocolGovernor(
            IVotes(address(votesProxy)),
            protocolTimelock
        );

        protocolTimelock.grantRole(protocolTimelock.PROPOSER_ROLE(), address(protocolGovernor));
        protocolTimelock.grantRole(protocolTimelock.EXECUTOR_ROLE(), address(protocolGovernor));

        ZeroExTreasuryGovernor treasuryGovernor = new ZeroExTreasuryGovernor(IVotes(address(votes)));
        return (IERC20(address(_address)), token, votes, protocolTimelock, protocolGovernor, treasuryGovernor);
    }
}
