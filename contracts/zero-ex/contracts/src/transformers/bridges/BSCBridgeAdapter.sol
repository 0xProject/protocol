// SPDX-License-Identifier: Apache-2.0
/*

  Copyright 2022 ZeroEx Intl.

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
import "./mixins/MixinCurve.sol";
import "./mixins/MixinDodo.sol";
import "./mixins/MixinDodoV2.sol";
import "./mixins/MixinKyberDmm.sol";
import "./mixins/MixinMooniswap.sol";
import "./mixins/MixinNerve.sol";
import "./mixins/MixinUniswapV2.sol";
import "./mixins/MixinZeroExBridge.sol";

contract BSCBridgeAdapter is
    IBridgeAdapter,
    MixinCurve,
    MixinDodo,
    MixinDodoV2,
    MixinKyberDmm,
    MixinMooniswap,
    MixinNerve,
    MixinUniswapV2,
    MixinZeroExBridge
{
    constructor(IEtherTokenV06 weth)
        public
        MixinCurve(weth)
        MixinMooniswap(weth)
    {
        uint256 chainId;
        assembly { chainId := chainid() }
        require(chainId == 56, 'BSCBridgeAdapter.constructor: wrong chain ID');
    }

    function trade(
        BridgeOrder memory order,
        IERC20TokenV06 sellToken,
        IERC20TokenV06 buyToken,
        uint256 sellAmount
    )
        public
        override
        returns (uint256 boughtAmount)
    {
        uint128 protocolId = uint128(uint256(order.source) >> 128);
        if (protocolId == BridgeProtocols.CURVE) {
            boughtAmount = _tradeCurve(
                sellToken,
                buyToken,
                sellAmount,
                order.bridgeData
            );
        } else if (protocolId == BridgeProtocols.UNISWAPV2) {
            boughtAmount = _tradeUniswapV2(
                buyToken,
                sellAmount,
                order.bridgeData
            );
        } else if (protocolId == BridgeProtocols.MOONISWAP) {
            boughtAmount = _tradeMooniswap(
                sellToken,
                buyToken,
                sellAmount,
                order.bridgeData
            );
        } else if (protocolId == BridgeProtocols.DODO) {
            boughtAmount = _tradeDodo(
                sellToken,
                sellAmount,
                order.bridgeData
            );
        } else if (protocolId == BridgeProtocols.DODOV2) {
            boughtAmount = _tradeDodoV2(
                sellToken,
                sellAmount,
                order.bridgeData
            );
        } else if (protocolId == BridgeProtocols.NERVE) {
            boughtAmount = _tradeNerve(
                sellToken,
                sellAmount,
                order.bridgeData
            );
        } else if (protocolId == BridgeProtocols.KYBERDMM) {
            boughtAmount = _tradeKyberDmm(
                buyToken,
                sellAmount,
                order.bridgeData
            );
        } else {
            boughtAmount = _tradeZeroExBridge(
                sellToken,
                buyToken,
                sellAmount,
                order.bridgeData
            );
        }

        emit BridgeFill(
            order.source,
            sellToken,
            buyToken,
            sellAmount,
            boughtAmount
        );
    }
}
