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

import "./AbstractBridgeAdapter.sol";
import "./BridgeProtocols.sol";
import "./mixins/MixinPlatypus.sol"; //27
import "./mixins/MixinBancorV3.sol"; //28
import "./mixins/MixinSolidly.sol"; //29
import "./mixins/MixinSynthetix.sol"; //30
import "./mixins/MixinWOOFi.sol"; //31
import "./mixins/MixinAaveV3.sol"; //32
import "./mixins/MixinKyberElastic.sol"; //33


contract BridgeAdapterGroup2 is 
  AbstractBridgeAdapter,
  MixinPlatypus,
  MixinBancorV3,
  MixinSolidly,
  MixinSynthetix,
  MixinWOOFi,
  MixinAaveV3,
  MixinKyberElastic
{
    constructor(
        IEtherToken weth
    )
        public
        MixinBancorV3(weth)
    {}

       function _trade(
        BridgeOrder memory order,
        IERC20Token sellToken,
        IERC20Token buyToken,
        uint256 sellAmount,
        bool dryRun
    ) internal override returns (uint256 boughtAmount, bool supportedSource) {
        uint128 protocolId = uint128(uint256(order.source) >> 128);
        if (protocolId == BridgeProtocols.PLATYPUS) { //27
            if (dryRun) {
                return (0, true);
            }
            boughtAmount = _tradePlatypus(buyToken, sellAmount, order.bridgeData);
        } else if (protocolId == BridgeProtocols.BANCORV3) { //28
            if (dryRun) {
                return (0, true);
            }
            boughtAmount = _tradeBancorV3(buyToken, sellAmount, order.bridgeData);
        } else if (protocolId == BridgeProtocols.SOLIDLY) { //29
            if (dryRun) {
                return (0, true);
            }
            boughtAmount = _tradeSolidly(sellToken, buyToken, sellAmount, order.bridgeData);
        } else if (protocolId == BridgeProtocols.SYNTHETIX) { //30
            if (dryRun) {
                return (0, true);
            }
            boughtAmount = _tradeSynthetix(sellAmount, order.bridgeData);
        } else if (protocolId == BridgeProtocols.WOOFI) { //31
            if (dryRun) {
                return (0, true);
            }
            boughtAmount = _tradeWOOFi(sellToken, buyToken, sellAmount, order.bridgeData);
        } else if (protocolId == BridgeProtocols.AAVEV3) { //32
            if (dryRun) {
                return (0, true);
            }
            boughtAmount = _tradeAaveV3(sellToken, buyToken, sellAmount, order.bridgeData);
        } else if (protocolId == BridgeProtocols.KYBERELASTIC) { //33
            if (dryRun) {
                return (0, true);
            }
            boughtAmount = _tradeKyberElastic(sellToken, sellAmount, order.bridgeData);

        }

        emit BridgeFill(order.source, sellToken, buyToken, sellAmount, boughtAmount);
    }
}
