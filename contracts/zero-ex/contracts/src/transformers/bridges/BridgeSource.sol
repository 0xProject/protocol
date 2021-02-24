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

pragma solidity ^0.6.5;
pragma experimental ABIEncoderV2;


library BridgeSource {
    uint256 constant internal BALANCER = 0;
    uint256 constant internal BANCOR = 1;
    uint256 constant internal COFIX = 2;
    uint256 constant internal CURVE = 3;
    uint256 constant internal CREAM = 4;
    uint256 constant internal CRYPTOCOM = 5;
    uint256 constant internal DODO = 6;
    uint256 constant internal KYBER = 7;
    uint256 constant internal LIQUIDITYPROVIDER = 8;
    uint256 constant internal MOONISWAP = 9;
    uint256 constant internal MSTABLE = 10;
    uint256 constant internal OASIS = 11;
    uint256 constant internal SHELL = 12;
    uint256 constant internal SNOWSWAP = 13;
    uint256 constant internal SUSHISWAP = 14;
    uint256 constant internal SWERVE = 15;
    uint256 constant internal UNISWAP = 16;
    uint256 constant internal UNISWAPV2 = 17;
    uint256 constant internal DODOV2 = 18;
    uint256 constant internal LINKSWAP = 19;
    // New sources should be APPENDED to this list, taking the next highest
    // integer value.
}
