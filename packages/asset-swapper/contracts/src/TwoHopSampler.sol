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
        uint256 gas;
    }

    struct HopResult {
        uint256 outputAmount;
        bytes resultData;
    }

    function sampleTwoHopSell(
        HopInfo[] memory firstHopCalls,
        HopInfo[] memory secondHopCalls,
        uint256 sellAmount
    )
        public
        returns (HopResult[] memory firstHopResults, HopResult[] memory secondHopResults)
    {
        uint256 intermediateAmount = 0;
        firstHopResults = new HopResult[](firstHopCalls.length);
        for (uint256 i = 0; i != firstHopCalls.length; ++i) {
            bytes memory data = firstHopCalls[i].data;
            data.writeUint256(data.length - 32, sellAmount);

            (bool didSucceed, bytes memory resultData) =
                address(firstHopCalls[i].to).call{gas: firstHopCalls[i].gas}(data);

            if (didSucceed) {
                firstHopResults[i].resultData = resultData;
                uint256 amount = firstHopResults[i].outputAmount =
                    resultData.readUint256(resultData.length - 32);
                if (amount > intermediateAmount) {
                    intermediateAmount = amount;
                }
            }
        }

        if (intermediateAmount == 0) {
            return (firstHopResults, secondHopResults);
        }

        secondHopResults = new HopResult[](secondHopCalls.length);
        for (uint256 i = 0; i != secondHopCalls.length; ++i) {
            bytes memory data = secondHopCalls[i].data;
            data.writeUint256(data.length - 32, intermediateAmount);

            (bool didSucceed, bytes memory resultData) =
                address(secondHopCalls[i].to).call{gas: secondHopCalls[i].gas}(data);

            if (didSucceed) {
                secondHopResults[i].resultData = resultData;
                secondHopResults[i].outputAmount =
                    resultData.readUint256(resultData.length - 32);
            }
        }
    }

    function sampleTwoHopBuy(
        HopInfo[] memory firstHopCalls,
        HopInfo[] memory secondHopCalls,
        uint256 buyAmount
    )
        public
        returns (HopResult[] memory firstHopResults, HopResult[] memory secondHopResults)
    {
        uint256 intermediateAmount = uint256(-1);
        secondHopResults = new HopResult[](secondHopCalls.length);
        for (uint256 i = 0; i != secondHopCalls.length; ++i) {
            bytes memory data = secondHopCalls[i].data;
            data.writeUint256(data.length - 32, buyAmount);

            (bool didSucceed, bytes memory resultData) =
                address(secondHopCalls[i].to).call{gas: secondHopCalls[i].gas}(data);

            if (didSucceed) {
                secondHopResults[i].resultData = resultData;
                uint256 amount = secondHopResults[i].outputAmount =
                    resultData.readUint256(resultData.length - 32);
                if (amount > 0 && amount < intermediateAmount) {
                    intermediateAmount = amount;
                }
            }
        }

        if (intermediateAmount == uint256(-1)) {
            return (firstHopResults, secondHopResults);
        }

        firstHopResults = new HopResult[](firstHopCalls.length);
        for (uint256 i = 0; i != firstHopCalls.length; ++i) {
            bytes memory data = firstHopCalls[i].data;
            data.writeUint256(data.length - 32, intermediateAmount);

            (bool didSucceed, bytes memory resultData) =
                address(firstHopCalls[i].to).call{gas: firstHopCalls[i].gas}(data);

            if (didSucceed) {
                firstHopResults[i].resultData = resultData;
                firstHopResults[i].outputAmount =
                    resultData.readUint256(resultData.length - 32);
            }
        }
    }
}
