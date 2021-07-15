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


contract CallDispatcher {

    struct CallInfo {
        bytes data;
        address payable to;
        uint256 gas;
        uint256 value;
    }

    struct DispatchedCallResult {
        bytes resultData;
        bool success;
    }

    function dispatch(CallInfo[] memory calls)
        public
        payable
        returns (DispatchedCallResult[] memory callResults)
    {
        callResults = new DispatchedCallResult[](calls.length);
        for (uint256 i = 0; i != calls.length; ++i) {
            CallInfo memory c = calls[i];
            uint256 callGas = c.gas == 0 ? gasleft() : c.gas;
            (callResults[i].success, callResults[i].resultData) =
                c.to.call{ value: c.value, gas: callGas }(c.data);
        }
    }
}
