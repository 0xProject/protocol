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
        address to;
        bytes data;
    }

    struct TwoHopResult {
        uint256 outputAmount;
        uint256 firstHopIndex;
        bytes firstHopResult;
        uint256 secondHopIndex;
        bytes secondHopResult;
    }

    function sampleTwoHopSell(
        HopInfo[] memory firstHopCalls,
        HopInfo[] memory secondHopCalls,
        uint256 sellAmount
    )
        public
        returns (TwoHopResult memory result)
    {
        uint256 intermediateAssetAmount = 0;
        for (uint256 i = 0; i != firstHopCalls.length; ++i) {
            bytes memory data = firstHopCalls[i].data;
            data.writeUint256(data.length - 32, sellAmount);
            (bool didSucceed, bytes memory returnData) = address(firstHopCalls[i].to).call(data);
            if (didSucceed) {
                uint256 amount = returnData.readUint256(returnData.length - 32);
                if (amount > intermediateAssetAmount) {
                    intermediateAssetAmount = amount;
                    result.firstHopIndex = i;
                    result.firstHopResult = returnData;
                }
            }
        }
        if (intermediateAssetAmount == 0) {
            return result;
        }
        for (uint256 i = 0; i != secondHopCalls.length; ++i) {
            bytes memory data = secondHopCalls[i].data;
            data.writeUint256(data.length - 32, intermediateAssetAmount);
            (bool didSucceed, bytes memory returnData) = address(secondHopCalls[i].to).call(data);
            if (didSucceed) {
                uint256 amount = returnData.readUint256(returnData.length - 32);
                if (amount > result.outputAmount) {
                    result.outputAmount = amount;
                    result.secondHopIndex = i;
                    result.secondHopResult = returnData;
                }
            }
        }
    }

    function sampleTwoHopBuy(
        HopInfo[] memory firstHopCalls,
        HopInfo[] memory secondHopCalls,
        uint256 buyAmount
    )
        public
        returns (TwoHopResult memory result)
    {
        result.outputAmount = uint256(-1);
        uint256 intermediateAssetAmount = uint256(-1);
        for (uint256 i = 0; i != secondHopCalls.length; ++i) {
            bytes memory data = secondHopCalls[i].data;
            data.writeUint256(data.length - 32, buyAmount);
            (bool didSucceed, bytes memory returnData) = address(secondHopCalls[i].to).call(data);
            if (didSucceed) {
                uint256 amount = returnData.readUint256(returnData.length - 32);
                if (
                    amount > 0 &&
                    amount < intermediateAssetAmount
                ) {
                    intermediateAssetAmount = amount;
                    result.secondHopIndex= i;
                    result.secondHopResult = returnData;
                }
            }
        }
        if (intermediateAssetAmount == uint256(-1)) {
            return result;
        }
        for (uint256 i = 0; i != firstHopCalls.length; ++i) {
            bytes memory data = firstHopCalls[i].data;
            data.writeUint256(data.length - 32, intermediateAssetAmount);
            (bool didSucceed, bytes memory returnData) = address(this).call(data);
            if (didSucceed) {
                uint256 amount = returnData.readUint256(returnData.length - 32);
                if (
                    amount > 0 &&
                    amount < result.outputAmount
                ) {
                    result.outputAmount = amount;
                    result.firstHopIndex = i;
                    result.firstHopResult = returnData;
                }
            }
        }
    }
}
