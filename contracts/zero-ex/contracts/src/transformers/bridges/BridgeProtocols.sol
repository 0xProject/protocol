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

import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";


library BridgeProtocols {
    // A incrementally increasing, append-only list of protocol IDs.
    // We don't use an enum so solidity doesn't throw when we pass in a
    // new protocol ID that hasn't been rolled up yet.
    uint128 internal constant UNKNOWN     = 0;
    uint128 internal constant CURVE       = 1;
    uint128 internal constant UNISWAPV2   = 2;
    uint128 internal constant UNISWAP     = 3;
    uint128 internal constant BALANCER    = 4;
    uint128 internal constant KYBER       = 5;
    uint128 internal constant MOONISWAP   = 6;
    uint128 internal constant MSTABLE     = 7;
    uint128 internal constant OASIS       = 8;
    uint128 internal constant SHELL       = 9;
    uint128 internal constant DODO        = 10;
    uint128 internal constant DODOV2      = 11;
    uint128 internal constant CRYPTOCOM   = 12;
    uint128 internal constant BANCOR      = 13;
    uint128 internal constant COFIX       = 14;
}
