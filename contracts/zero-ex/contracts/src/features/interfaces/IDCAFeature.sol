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

pragma solidity ^0.6.5;
pragma experimental ABIEncoderV2;

import "@0x/contracts-erc20/src/IERC20Token.sol";
import "../libs/LibSignature.sol";

/// @dev DCA feature.
interface IDCAFeature {
    struct DCAData {
        // The token to buy.
        IERC20Token buyToken;
        // The token to sell.
        IERC20Token sellToken;
        // The amount of sellToken to sell.
        uint256 sellAmount;
        // The amount of time between each fill in seconds.
        uint256 interval;
        // The number of fills to execute.
        uint256 numFills;
        // The start time of the DCA order in Unix epoch seconds.
        uint256 startTime;
        // Signer of the DCA. On whose behalf to execute the DCA.
        address payable signer;
    }

    function fillDCATransaction(
        DCAData calldata dcaData,
        LibSignature.Signature calldata signature,
        bytes calldata swapCallData
    ) external returns (bytes memory returnResult);

    function getDCAHash(DCAData calldata dcaData) external view returns (bytes32 dcaHash);
}
