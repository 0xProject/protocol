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

pragma solidity ^0.6.5;
pragma experimental ABIEncoderV2;


contract TestFeeRecipient {
    bytes4 constant private SUCCESS = this.receiveZeroExFeeCallback.selector;
    bytes4 constant private FAILURE = 0xdeadbeef;

    uint256 constant private TRIGGER_REVERT = 333;
    uint256 constant private TRIGGER_FAILURE = 666;

    event FeeReceived(
        address tokenAddress,
        uint256 amount
    );

    receive() external payable {}

    function receiveZeroExFeeCallback(
        address tokenAddress,
        uint256 amount,
        bytes calldata /* feeData */
    )
        external
        returns (bytes4 success)
    {
        emit FeeReceived(tokenAddress, amount);
        if (amount == TRIGGER_REVERT) {
            revert("TestFeeRecipient::receiveZeroExFeeCallback/REVERT");
        } else if (amount == TRIGGER_FAILURE) {
            return FAILURE;
        } else {
            return SUCCESS;
        }
    }
}
