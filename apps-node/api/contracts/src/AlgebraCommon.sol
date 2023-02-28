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

import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";

import "./interfaces/IAlgebra.sol";

contract AlgebraCommon {
    function toAlgebraPath(IERC20TokenV06[] memory tokenPath) internal pure returns (bytes memory algebraPath) {
        require(tokenPath.length >= 2, "AlgebraCommon/invalid path lengths");

        // Algebra paths are tightly packed as
        // [token0, token1, token2, ... ]
        algebraPath = new bytes(tokenPath.length * 20);
        uint256 o;
        assembly {
            o := add(algebraPath, 32)
        }
        for (uint256 i = 0; i < tokenPath.length; ++i) {
            IERC20TokenV06 token = tokenPath[i];
            assembly {
                mstore(o, shl(96, token))
                o := add(o, 20)
            }
        }
    }

    function reverseTokenPath(
        IERC20TokenV06[] memory tokenPath
    ) internal pure returns (IERC20TokenV06[] memory reversed) {
        reversed = new IERC20TokenV06[](tokenPath.length);
        for (uint256 i = 0; i < tokenPath.length; ++i) {
            reversed[i] = tokenPath[tokenPath.length - i - 1];
        }
    }

    function catchMultiSwapResult(
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
