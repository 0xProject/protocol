/*

  Copyright 2020 ZeroEx Intl.

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

import "./features/BootstrapFeature.sol";
import "./storage/LibProxyStorage.sol";

/// @dev An extensible proxy contract that serves as a universal entry point for
///      interacting with the 0x protocol.
contract ZeroEx {
    uint256 immutable private IMMUTABLE_IMPLS_SLOT;

    /// @dev Construct this contract and register the `BootstrapFeature` feature.
    ///      After constructing this contract, `bootstrap()` should be called
    ///      by `bootstrap()` to seed the initial feature set.
    /// @param bootstrapper Who can call `bootstrap()`.
    constructor(address bootstrapper) public {
        // Temporarily create and register the bootstrap feature.
        // It will deregister itself after `bootstrap()` has been called.
        BootstrapFeature bootstrap = new BootstrapFeature(bootstrapper);
        mapping(bytes4 => address) storage impls =
            LibProxyStorage.getStorage().impls;
        impls[bootstrap.bootstrap.selector] = address(bootstrap);

        // Store the slot for impls so it's accessible as a constant in Yul.
        // Yul can't directly access immutables, so we have to go through a
        // local.
        uint256 implsSlot;
        assembly { implsSlot := impls_slot }
        IMMUTABLE_IMPLS_SLOT = implsSlot;
    }


    // solhint-disable state-visibility

    /// @dev Forwards calls to the appropriate implementation contract.
    fallback() external payable {
        // Yul can't directly access immutables.
        uint256 implsSlot = IMMUTABLE_IMPLS_SLOT;

        assembly {
            let cdlen := calldatasize()

            // equivalent of receive() external payable {}
            if iszero(cdlen) {
                return(0, 0)
            }

            // Store at 0x40, to leave 0x00-0x3F for slot calculation below.
            calldatacopy(0x40, 0, cdlen)
            let selector := and(mload(0x40), 0xFFFFFFFF00000000000000000000000000000000000000000000000000000000)

            // Slot for impls[selector] is keccak256(selector . impls_slot).
            mstore(0, selector)
            mstore(0x20, implsSlot)
            let slot := keccak256(0, 0x40)

            let delegate := sload(slot)
            if iszero(delegate) {
                // Revert with:
                // abi.encodeWithSelector(
                //   bytes4(keccak256("NotImplementedError(bytes4)")),
                //   selector)
                mstore(0, 0x734e6e1c00000000000000000000000000000000000000000000000000000000)
                mstore(4, selector)
                revert(0, 0x24)
            }

            let success := delegatecall(
                gas(),
                delegate,
                0x40, cdlen,
                0, 0
            )
            let rdlen := returndatasize()
            returndatacopy(0, 0, rdlen)
            if success {
                return(0, rdlen)
            }
            revert(0, rdlen)
        }
    }
}
