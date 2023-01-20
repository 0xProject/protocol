
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
import "./IBridgeAdapter.sol";
import "./BridgeProtocols.sol";
import "./BridgeAdapterGroup1.sol";
import "./BridgeAdapterGroup2.sol";


contract BridgeAdapter is IBridgeAdapter {
    IBridgeAdapter private immutable adapter1;
    IBridgeAdapter private immutable adapter2;
    uint256 private constant ADAPTER_1_LAST_PROTOCOL_ID = 26;
    uint256 private constant ADAPTER_2_LAST_PROTOCOL_ID = 32;

    constructor(IEtherTokenV06 weth) public {
        adapter1 = new BridgeAdapterGroup1(weth); 
        adapter2 = new BridgeAdapterGroup2(weth);
    }

    function trade(
      BridgeOrder memory order,
      IERC20TokenV06 sellToken,
      IERC20TokenV06 buyToken,
      uint256 sellAmount
    ) public override returns (uint256 boughtAmount) {
        uint128 protocolId = uint128(uint256(order.source) >> 128);

        IBridgeAdapter adapter;
        if (protocolId <= ADAPTER_1_LAST_PROTOCOL_ID) {
          adapter = adapter1;
        } else if (protocolId <= ADAPTER_2_LAST_PROTOCOL_ID) {
          adapter = adapter2;
        } else {
          revert("unknown protocolId");
        }

        (bool success, bytes memory resultData) = address(adapter).delegatecall(abi.encodeWithSelector(
            IBridgeAdapter.trade.selector,
            order,
            sellToken,
            buyToken,
            sellAmount
          )
        );
        if (success) {
          return abi.decode(resultData, (uint256));
        } 
    }

    function isSupportedSource(bytes32 source) external override returns (bool isSupported) {
        uint128 protocolId = uint128(uint256(source) >> 128);
        if (protocolId <= ADAPTER_1_LAST_PROTOCOL_ID) {
          return adapter1.isSupportedSource(source);
        } else if (protocolId <= ADAPTER_2_LAST_PROTOCOL_ID) {
          return adapter2.isSupportedSource(source);
        } else {
          revert("unknown protocolId");
        }
    }
}