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

pragma solidity ^0.6;
pragma experimental ABIEncoderV2;

import "@0x/contracts-utils/contracts/src/v06/LibBytesV06.sol";

contract TwoHopSampler {
    using LibBytesV06 for bytes;

    struct HopInfo {
        uint256 sourceIndex;
        bytes returnData;
    }

    function sampleTwoHopSell(
        bytes[] memory firstHopCalls,
        bytes[] memory secondHopCalls,
        uint256 numSamples
    ) public returns (HopInfo memory firstHop, HopInfo memory secondHop, uint256[] memory buyAmounts) {
        buyAmounts = new uint256[](numSamples);
        uint256[] memory intermediateAmounts = new uint256[](numSamples);
        for (uint256 i = 0; i < firstHopCalls.length; i++) {
            (bool didSucceed, bytes memory returnData) = address(this).call(firstHopCalls[i]);
            if (didSucceed) {
                uint256[] memory amounts = getAmounts(returnData, numSamples);
                // Use the amount from the largest size for comparison.
                if (amounts[numSamples - 1] > intermediateAmounts[numSamples - 1]) {
                    firstHop.sourceIndex = i;
                    firstHop.returnData = returnData;
                    for (uint256 j = 0; j < numSamples; j++) {
                        intermediateAmounts[j] = amounts[j];
                    }
                }
            }
        }

        if (intermediateAmounts[numSamples - 1] == 0) {
            return (firstHop, secondHop, buyAmounts);
        }

        for (uint256 i = 0; i < secondHopCalls.length; i++) {
            writeAmounts(secondHopCalls[i], intermediateAmounts);

            (bool didSucceed, bytes memory returnData) = address(this).call(secondHopCalls[i]);
            if (didSucceed) {
                uint256[] memory amounts = getAmounts(returnData, numSamples);
                // Use the amount from the largest size for comparison.
                if (amounts[numSamples - 1] > buyAmounts[numSamples - 1]) {
                    secondHop.sourceIndex = i;
                    secondHop.returnData = returnData;
                    for (uint256 j = 0; j < numSamples; j++) {
                        buyAmounts[j] = amounts[j];
                    }
                }
            }
        }
    }

    function sampleTwoHopBuy(
        bytes[] memory firstHopCalls,
        bytes[] memory secondHopCalls,
        uint256 numSamples
    ) public returns (HopInfo memory firstHop, HopInfo memory secondHop, uint256[] memory sellAmounts) {
        sellAmounts = new uint256[](numSamples);
        for (uint256 i = 0; i < numSamples; i++) {
            sellAmounts[i] = uint256(-1);
        }

        uint256[] memory intermediateAmounts = new uint256[](numSamples);
        for (uint256 i = 0; i < numSamples; i++) {
            intermediateAmounts[i] = uint256(-1);
        }

        for (uint256 i = 0; i < secondHopCalls.length; i++) {
            (bool didSucceed, bytes memory returnData) = address(this).call(secondHopCalls[i]);
            if (didSucceed) {
                uint256[] memory amounts = getAmounts(returnData, numSamples);
                uint256 largestAmount = amounts[numSamples - 1];

                // Use the amount from the largest size for comparison.
                if (largestAmount > 0 && largestAmount < intermediateAmounts[numSamples - 1]) {
                    secondHop.sourceIndex = i;
                    secondHop.returnData = returnData;
                    for (uint256 j = 0; j < numSamples; j++) {
                        intermediateAmounts[j] = amounts[j];
                    }
                }
            }
        }

        if (intermediateAmounts[numSamples - 1] == uint256(-1)) {
            return (firstHop, secondHop, sellAmounts);
        }

        for (uint256 i = 0; i != firstHopCalls.length; ++i) {
            writeAmounts(firstHopCalls[i], intermediateAmounts);
            (bool didSucceed, bytes memory returnData) = address(this).call(firstHopCalls[i]);
            if (didSucceed) {
                uint256[] memory amounts = getAmounts(returnData, numSamples);
                uint256 largestAmount = amounts[numSamples - 1];

                // Use the amount from the largest size for comparison.
                if (largestAmount > 0 && largestAmount < sellAmounts[numSamples - 1]) {
                    firstHop.sourceIndex = i;
                    firstHop.returnData = returnData;
                    for (uint256 j = 0; j < numSamples; j++) {
                        sellAmounts[j] = amounts[j];
                    }
                }
            }
        }
    }

    /// @dev Extract amounts from `data` by creating a copy assuming that such uint256[] array exists
    /// at the end of `data`.
    function getAmounts(bytes memory data, uint256 amountsLength) private pure returns (uint256[] memory) {
        uint256 start = data.length - (amountsLength + 2) * 32; // Copy offset and length as well.
        uint256 end = data.length;
        bytes memory amounts = data.slice(start, end);
        amounts.writeUint256(0, 0x20); // Overwrite offset.
        return abi.decode(amounts, (uint256[]));
    }

    /// @dev Writes amounts arary to the end of data assuming that there is space reserved.
    function writeAmounts(bytes memory data, uint256[] memory amounts) private pure {
        for (uint256 i = 0; i < amounts.length; i++) {
            uint256 index = data.length - 32 * (amounts.length - i - 1);
            uint256 amount = amounts[i];
            assembly {
                mstore(add(data, index), amount)
            }
        }
    }
}
