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

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "@openzeppelin/token/ERC20/ERC20.sol";
import "@openzeppelin/proxy/ERC1967/ERC1967Proxy.sol";
import "./mocks/ZRXMock.sol";
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
    address payable internal securityCouncil = payable(vm.addr(5));
    uint256 internal quadraticThreshold = 1000000e18;

    bytes32 internal constant DELEGATION_TYPEHASH =
        keccak256("Delegation(address delegatee,uint256 nonce,uint256 expiry)");

    constructor() {
        vm.deal(account1, 1e20);
        vm.deal(account2, 1e20);
        vm.deal(account3, 1e20);
        vm.deal(account4, 1e20);
        vm.deal(securityCouncil, 1e20);
    }

    function setupGovernance(
        IERC20 zrxToken
    ) internal returns (ZRXWrappedToken, ZeroExVotes, ZeroExTimelock, ZeroExTimelock, address, address) {
        (ZRXWrappedToken token, ZeroExVotes votes) = setupZRXWrappedToken(zrxToken);

        vm.startPrank(account1);
        address[] memory proposers = new address[](0);
        address[] memory executors = new address[](0);

        ZeroExTimelock protocolTimelock = new ZeroExTimelock(3 days, proposers, executors, account1);
        ZeroExProtocolGovernor protocolGovernor = new ZeroExProtocolGovernor(
            IVotes(address(votes)),
            protocolTimelock,
            securityCouncil
        );
        protocolTimelock.grantRole(protocolTimelock.PROPOSER_ROLE(), address(protocolGovernor));
        protocolTimelock.grantRole(protocolTimelock.EXECUTOR_ROLE(), address(protocolGovernor));
        protocolTimelock.grantRole(protocolTimelock.CANCELLER_ROLE(), address(protocolGovernor));

        ZeroExTimelock treasuryTimelock = new ZeroExTimelock(2 days, proposers, executors, account1);
        ZeroExTreasuryGovernor treasuryGovernor = new ZeroExTreasuryGovernor(
            IVotes(address(votes)),
            treasuryTimelock,
            securityCouncil
        );

        treasuryTimelock.grantRole(treasuryTimelock.PROPOSER_ROLE(), address(treasuryGovernor));
        treasuryTimelock.grantRole(treasuryTimelock.EXECUTOR_ROLE(), address(treasuryGovernor));
        treasuryTimelock.grantRole(treasuryTimelock.CANCELLER_ROLE(), address(treasuryGovernor));
        vm.stopPrank();

        return (token, votes, protocolTimelock, treasuryTimelock, address(protocolGovernor), address(treasuryGovernor));
    }

    function setupZRXWrappedToken(IERC20 zrxToken) internal returns (ZRXWrappedToken, ZeroExVotes) {
        vm.startPrank(account1);
        address wTokenPrediction = predictAddress(account1, vm.getNonce(account1) + 2);
        ZeroExVotes votesImpl = new ZeroExVotes(wTokenPrediction, quadraticThreshold);
        ERC1967Proxy votesProxy = new ERC1967Proxy(address(votesImpl), abi.encodeCall(votesImpl.initialize, ()));
        ZRXWrappedToken wToken = new ZRXWrappedToken(zrxToken, ZeroExVotes(address(votesProxy)));
        vm.stopPrank();

        assert(address(wToken) == wTokenPrediction);

        return (wToken, ZeroExVotes(address(votesProxy)));
    }

    function mockZRXToken() internal returns (IERC20 zrxToken) {
        vm.startPrank(account1);
        bytes memory _bytecode = vm.getCode("./ZRXToken.json");
        assembly {
            zrxToken := create(0, add(_bytecode, 0x20), mload(_bytecode))
        }
        vm.stopPrank();
    }

    // Sourced from https://github.com/grappafinance/core/blob/master/src/test/utils/Utilities.sol
    function predictAddress(address _origin, uint256 _nonce) public pure returns (address) {
        if (_nonce == 0x00) {
            return
                address(
                    uint160(uint256(keccak256(abi.encodePacked(bytes1(0xd6), bytes1(0x94), _origin, bytes1(0x80)))))
                );
        }
        if (_nonce <= 0x7f) {
            return
                address(
                    uint160(uint256(keccak256(abi.encodePacked(bytes1(0xd6), bytes1(0x94), _origin, uint8(_nonce)))))
                );
        }
        if (_nonce <= 0xff) {
            return
                address(
                    uint160(
                        uint256(
                            keccak256(
                                abi.encodePacked(bytes1(0xd7), bytes1(0x94), _origin, bytes1(0x81), uint8(_nonce))
                            )
                        )
                    )
                );
        }
        if (_nonce <= 0xffff) {
            return
                address(
                    uint160(
                        uint256(
                            keccak256(
                                abi.encodePacked(bytes1(0xd8), bytes1(0x94), _origin, bytes1(0x82), uint16(_nonce))
                            )
                        )
                    )
                );
        }
        if (_nonce <= 0xffffff) {
            return
                address(
                    uint160(
                        uint256(
                            keccak256(
                                abi.encodePacked(bytes1(0xd9), bytes1(0x94), _origin, bytes1(0x83), uint24(_nonce))
                            )
                        )
                    )
                );
        }
        return
            address(
                uint160(
                    uint256(
                        keccak256(abi.encodePacked(bytes1(0xda), bytes1(0x94), _origin, bytes1(0x84), uint32(_nonce)))
                    )
                )
            );
    }
}
