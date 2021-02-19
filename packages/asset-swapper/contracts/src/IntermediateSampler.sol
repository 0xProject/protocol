// SPDX-License-Identifier: Apache-2.0
/*

  Copyright 2021 ZeroEx Intl.

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


contract IntermediateSampler {
    using LibBytesV06 for bytes;

    struct IntermediaryInfo {
        bytes returnData;
        uint256[] makerTokenAmounts;
    }

    /// @dev Sample sells of an intermediate token, i.e X->Y->X. Discovers the highest output
    ///      from the first hop calls (X->Y). Then uses the highest output (Y) as an indicator
    ///      of price for the second hop calls (Y->Z).
    /// @param firstHopCalls Encoded calls for price discovery of X->Y
    /// @param secondHopCalls Encoded calls for sampling of Y->Z
    /// @param takerTokenAmounts Taker amounts for the first hop X->Y
    /// @return intermediaryInfo Z values for each Y and the final returnData for additional info
    /// @return intermediaryAmounts Amounts of Y from takerTokenAmounts exchanged at the best rate
    function sampleIntermediateSell(
        bytes[] memory firstHopCalls,
        bytes[] memory secondHopCalls,
        uint256[] memory takerTokenAmounts
    )
        public
        view
        returns (
            IntermediaryInfo[] memory intermediaryInfo,
            uint256[] memory intermediaryAmounts
        )
    {
        uint256 intermediateAssetAmount = 0;
        // Perform price discovery by finding the best exchange rate for a small
        // amount of taker token (X)
        uint256 smallTakerTokenAmount = takerTokenAmounts[0]; // x
        for (uint256 i = 0; i != firstHopCalls.length; ++i) {
            firstHopCalls[i].writeUint256(firstHopCalls[i].length - 32, smallTakerTokenAmount);
            (bool didSucceed, bytes memory returnData) = address(this).staticcall(firstHopCalls[i]);
            if (didSucceed) {
                uint256 amount = returnData.readUint256(returnData.length - 32);
                if (amount > intermediateAssetAmount) {
                    intermediateAssetAmount = amount;
                }
            }
        }
        if (intermediateAssetAmount == 0) {
            require(false, "NO ROUTE 0");
            return (intermediaryInfo, intermediaryAmounts);
        }
        // We now have a ceiling exchange rate of a small amount of X for Y
        intermediaryInfo = new IntermediaryInfo[](secondHopCalls.length);
        // We have a 1:1 taker token amount to intermediary amount
        intermediaryAmounts = new uint256[](takerTokenAmounts.length);
        // Loop through each second hop call and find the exchange rate of
        // Y->Z for every X taker amount exchange to Y using the best exchange
        // rate found previously
        for (uint256 j = 0; j != secondHopCalls.length; ++j) {
            // For every taker token amount (X) we find a maker token Z (via Y best intermediate token amount)
            intermediaryInfo[j].makerTokenAmounts = new uint256[](takerTokenAmounts.length);
            for (uint256 k = 0; k != takerTokenAmounts.length; ++k) {
                // scale Y by the ratio of takerTokenAmount[0]:takerTokenAmount[k]
                // getPartial(received, sold, next)
                uint256 scaledIntermediateAmount = _safeGetPartialAmountCeil2(
                    intermediateAssetAmount,
                    smallTakerTokenAmount,
                    takerTokenAmounts[k]
                );
                // if the last k, add a bit of a buffer to ensure we over sample
                if (k == takerTokenAmounts.length-1) {
                    scaledIntermediateAmount = _safeGetPartialAmountCeil2(
                        scaledIntermediateAmount,
                        100,
                        105
                    );
                }
                // Store the intermediate amount, we will just keep overwriting this with the same values each loop
                intermediaryAmounts[k] = scaledIntermediateAmount; // Y
                secondHopCalls[j].writeUint256(secondHopCalls[j].length - 32, scaledIntermediateAmount);
                // Y->Z
                (bool didSucceed, bytes memory returnData) = address(this).staticcall(secondHopCalls[j]);
                if (didSucceed) {
                    uint256 amount = returnData.readUint256(returnData.length - 32); // Z
                    // Store how much we bought by selling intermediaryAmounts[j]
                    intermediaryInfo[j].makerTokenAmounts[k] = amount;
                    // Store the full return data, which should remain consistent for a particular source
                    // this may contain additional info like the pool address
                    intermediaryInfo[j].returnData = returnData;
                    if (amount == 0) {
                        break;
                    }
                } else {
                    break;
                }
            }
        }
    }

    function _safeGetPartialAmountCeil2(
        uint256 numerator,
        uint256 denominator,
        uint256 target
    )
        internal
        view
        returns (uint256 partialAmount)
    {
        if (numerator == 0 || target == 0 || denominator == 0) return 0;
        uint256 c = numerator * target;
        if (c / numerator != target) return 0;
        return (c + (denominator - 1)) / denominator;
    }
}