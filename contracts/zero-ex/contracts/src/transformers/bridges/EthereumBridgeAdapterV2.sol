
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
import "./EthereumBridgeAdapterGroup1.sol";
import "./IBridgeAdapter.sol";

contract EthereumBridgeAdapterV2 is AbstractBridgeAdapter(1, "Ethereum") {
    IBridgeAdapter private immutable adapter1;
    uint256 private constant ADAPTER_1_LENGTH = 33;

    constructor(IEtherTokenV06 weth) public {
        adapter1 = EthereumBridgeAdapterGroup1(weth); 
    }

    function trade(
      BridgeOrder memory order,
      IERC20TokenV06 sellToken,
      IERC20TokenV06 buyToken,
      uint256 sellAmount
    ) public override returns (uint256 boughtAmount) {
        uint128 protocolId = uint128(uint256(order.source) >> 128);
        if (protocolId < ADAPTER_1_LENGTH) {
          return adapter1.trade(order, sellToken, buyToken, sellAmount);
        }
    }

    function isSupportedSource(bytes32 source) external returns (bool isSupported) {
        uint128 protocolId = uint128(uint256(order.source) >> 128);
        if (protocolId < ADAPTER_1_LENGTH) {
          return adapter1.isSupportedSource(source);
        }

    }
}