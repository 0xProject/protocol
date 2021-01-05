// SPDX-License-Identifier: Apache-2.0
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


/// @dev Helpers for computing `FeeCollector` contract addresses.
library LibFeeCollector {

    /// @dev Compute the CREATE2 address for a fee collector.
    /// @param controller The address of the `FeeCollectorController` contract.
    /// @param initCodeHash The init code hash of the `FeeCollector` contract.
    /// @param poolId The fee collector's pool ID.
    function getFeeCollectorAddress(address controller, bytes32 initCodeHash, bytes32 poolId)
        internal
        pure
        returns (address payable feeCollectorAddress)
    {
        // Compute the CREATE2 address for the fee collector.
        return address(uint256(keccak256(abi.encodePacked(
            byte(0xff),
            controller,
            poolId, // pool ID is salt
            initCodeHash
        ))));
    }
}
