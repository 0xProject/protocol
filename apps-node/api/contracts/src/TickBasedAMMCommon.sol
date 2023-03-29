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

pragma solidity >=0.6;
pragma experimental ABIEncoderV2;

/// @title Provides common utility functions for Tick Based AMM sampling
contract TickBasedAMMCommon {
    /// @dev return a reversed address path
    function reverseAddressPath(address[] memory path) internal pure returns (address[] memory reversedPath) {
        reversedPath = new address[](path.length);
        for (uint256 i = 0; i < path.length; ++i) {
            reversedPath[i] = path[path.length - i - 1];
        }
    }

    function isValidPoolPath(address[] memory poolPath) internal pure returns (bool) {
        for (uint256 i = 0; i < poolPath.length; i++) {
            if (poolPath[i] == address(0)) {
                return false;
            }
        }
        return true;
    }

    /// @dev decode a MultiSwap revert reason into individual constituents of the MultiSwap result.
    /// @param revertReason the encoded revert reason caught from MultiSwap call
    /// @return success whether or not the revertReason was able to be successfully decoded
    /// @return amounts the MultiSwap quoted amounts
    /// @return gasEstimates the MultiSwap gas estimates corresponding to each of the quoted amounts
    function decodeMultiSwapRevert(
        bytes memory revertReason
    ) internal pure returns (bool success, uint256[] memory amounts, uint256[] memory gasEstimates) {
        bytes4 selector;
        assembly {
            selector := mload(add(revertReason, 32))
        }

        if (selector != bytes4(keccak256("result(uint256[],uint256[])"))) {
            return (false, amounts, gasEstimates);
        }

        assembly {
            let length := sub(mload(revertReason), 4)
            revertReason := add(revertReason, 4)
            mstore(revertReason, length)
        }
        (amounts, gasEstimates) = abi.decode(revertReason, (uint256[], uint256[]));
        return (true, amounts, gasEstimates);
    }
}
