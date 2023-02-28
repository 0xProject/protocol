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

pragma solidity >=0.6;

library Multiswap {
    // the result of multiswap
    struct Result {
        // the gas estimate for each of swap amounts
        uint256[] gasEstimates;
        // the token0 delta for each swap amount, positive indicates sent and negative indicates receipt
        int256[] amounts0;
        // the token1 delta for each swap amount, positive indicates sent and negative indicates receipt
        int256[] amounts1;
    }
}
