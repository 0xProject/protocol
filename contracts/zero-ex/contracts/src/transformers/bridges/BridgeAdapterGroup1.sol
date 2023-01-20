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

import "./mixins/MixinZeroExBridge.sol"; //0
import "./mixins/MixinCurve.sol"; //1
import "./mixins/MixinUniswapV2.sol"; //2
import "./mixins/MixinUniswap.sol"; //3
import "./mixins/MixinBalancer.sol"; //4
import "./mixins/MixinMooniswap.sol"; //6
import "./mixins/MixinMStable.sol"; //7
import "./mixins/MixinShell.sol"; //9
import "./mixins/MixinDodo.sol"; //10
import "./mixins/MixinDodoV2.sol"; //11
import "./mixins/MixinCryptoCom.sol"; //12
import "./mixins/MixinBancor.sol"; //13
import "./mixins/MixinNerve.sol"; //15
import "./mixins/MixinMakerPSM.sol"; //16
import "./mixins/MixinUniswapV3.sol"; //18
import "./mixins/MixinKyberDmm.sol"; //19
import "./mixins/MixinCurveV2.sol"; //20
import "./mixins/MixinLido.sol"; //21
import "./mixins/MixinAaveV2.sol"; //23
import "./mixins/MixinCompound.sol"; //24
import "./mixins/MixinBalancerV2Batch.sol"; //25
import "./mixins/MixinGMX.sol"; //26

contract BridgeAdapterGroup1 is 
    AbstractBridgeAdapter,
    MixinZeroExBridge,
    MixinCurve,
    MixinUniswapV2,
    MixinUniswap,
    MixinBalancer,
    MixinMooniswap,
    MixinMStable,
    MixinShell,
    MixinDodo,
    MixinDodoV2,
    MixinCryptoCom,
    MixinBancor,
    MixinNerve,
    MixinMakerPSM,
    MixinUniswapV3,
    MixinKyberDmm,
    MixinCurveV2,
    MixinLido,
    MixinAaveV2,
    MixinCompound,
    MixinBalancerV2Batch,
    MixinGMX
{
    constructor(
        IEtherTokenV06 weth
    )
        public
        MixinBancor(weth)
        MixinCurve(weth)
        MixinLido(weth)
        MixinUniswap(weth)
        MixinMooniswap(weth)
        MixinCompound(weth)
    { }

    function _trade(
        BridgeOrder memory order,
        IERC20TokenV06 sellToken,
        IERC20TokenV06 buyToken,
        uint256 sellAmount,
        bool dryRun
    ) internal override returns (uint256 boughtAmount, bool supportedSource) {
        uint128 protocolId = uint128(uint256(order.source) >> 128);
        if (protocolId == BridgeProtocols.UNKNOWN) {
            if (dryRun) {
                return (0, true);
            }
            boughtAmount = _tradeZeroExBridge(sellToken, buyToken, sellAmount, order.bridgeData);
        } else if (protocolId == BridgeProtocols.CURVE) { //1 
            if (dryRun) {
                return (0, true);
            }
            boughtAmount = _tradeCurve(sellToken, buyToken, sellAmount, order.bridgeData);
        } else if (protocolId == BridgeProtocols.UNISWAPV2) { //2
            if (dryRun) {
                return (0, true);
            }
            boughtAmount = _tradeUniswapV2(buyToken, sellAmount, order.bridgeData);
        } else if (protocolId == BridgeProtocols.UNISWAP) { //3
            if (dryRun) {
                return (0, true);
            }
            boughtAmount = _tradeUniswap(sellToken, buyToken, sellAmount, order.bridgeData);
        } else if (protocolId == BridgeProtocols.BALANCER) { //4 
            if (dryRun) {
                return (0, true);
            }
            boughtAmount = _tradeBalancer(sellToken, buyToken, sellAmount, order.bridgeData);
        } else if (protocolId == BridgeProtocols.MOONISWAP) { //6
            if (dryRun) {
                return (0, true);
            }
            boughtAmount = _tradeMooniswap(sellToken, buyToken, sellAmount, order.bridgeData);
        } else if (protocolId == BridgeProtocols.MSTABLE) { //7
            if (dryRun) {
                return (0, true);
            }
            boughtAmount = _tradeMStable(sellToken, buyToken, sellAmount, order.bridgeData);
        } else if (protocolId == BridgeProtocols.SHELL) { //9
            if (dryRun) {
                return (0, true);
            }
            boughtAmount = _tradeShell(sellToken, buyToken, sellAmount, order.bridgeData);
        } else if (protocolId == BridgeProtocols.DODO) { //10
            if (dryRun) {
                return (0, true);
            }
            boughtAmount = _tradeDodo(sellToken, sellAmount, order.bridgeData);
        } else if (protocolId == BridgeProtocols.DODOV2) { //11
            if (dryRun) {
                return (0, true);
            }
            boughtAmount = _tradeDodoV2(sellToken, sellAmount, order.bridgeData);
        } else if (protocolId == BridgeProtocols.CRYPTOCOM) { //12
            if (dryRun) {
                return (0, true);
            }
            boughtAmount = _tradeCryptoCom(buyToken, sellAmount, order.bridgeData);
        } else if (protocolId == BridgeProtocols.BANCOR) { //13
            if (dryRun) {
                return (0, true);
            }
            boughtAmount = _tradeBancor(buyToken, sellAmount, order.bridgeData);
        } else if (protocolId == BridgeProtocols.NERVE) { //15
            if (dryRun) {
                return (0, true);
            }
            boughtAmount = _tradeNerve(sellToken, sellAmount, order.bridgeData);
        } else if (protocolId == BridgeProtocols.MAKERPSM) { //16
            if (dryRun) {
                return (0, true);
            }
            boughtAmount = _tradeMakerPsm(sellToken, buyToken, sellAmount, order.bridgeData);
        } else if (protocolId == BridgeProtocols.UNISWAPV3) { //18
            if (dryRun) {
                return (0, true);
            }
            boughtAmount = _tradeUniswapV3(sellToken, sellAmount, order.bridgeData);
        } else if (protocolId == BridgeProtocols.KYBERDMM) { //19
            if (dryRun) {
                return (0, true);
            }
            boughtAmount = _tradeKyberDmm(buyToken, sellAmount, order.bridgeData);
        } else if (protocolId == BridgeProtocols.CURVEV2) { //20
            if (dryRun) {
                return (0, true);
            }
            boughtAmount = _tradeCurveV2(sellToken, buyToken, sellAmount, order.bridgeData);
        } else if (protocolId == BridgeProtocols.LIDO) { //21
            if (dryRun) {
                return (0, true);
            }
            boughtAmount = _tradeLido(sellToken, buyToken, sellAmount, order.bridgeData);
        } else if (protocolId == BridgeProtocols.AAVEV2) { //23
            if (dryRun) {
                return (0, true);
            }
            boughtAmount = _tradeAaveV2(sellToken, buyToken, sellAmount, order.bridgeData);
        } else if (protocolId == BridgeProtocols.COMPOUND) { //24
            if (dryRun) {
                return (0, true);
            }
            boughtAmount = _tradeCompound(sellToken, buyToken, sellAmount, order.bridgeData);
        } else if (protocolId == BridgeProtocols.BALANCERV2BATCH) { //25
            if (dryRun) {
                return (0, true);
            }
            boughtAmount = _tradeBalancerV2Batch(sellAmount, order.bridgeData);
        } else if (protocolId == BridgeProtocols.GMX) { //26
            if (dryRun) {
                return (0, true);
            }
            boughtAmount = _tradeGMX(buyToken, sellAmount, order.bridgeData);
        }

        emit BridgeFill(order.source, sellToken, buyToken, sellAmount, boughtAmount);
    }
}
