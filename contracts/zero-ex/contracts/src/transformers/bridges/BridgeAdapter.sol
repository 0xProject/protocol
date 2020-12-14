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

import "./IBridgeAdapter.sol";
import "./mixins/MixinBalancer.sol";
import "./mixins/MixinCurve.sol";
import "./mixins/MixinCryptoCom.sol";
import "./mixins/MixinDodo.sol";
import "./mixins/MixinKyber.sol";
import "./mixins/MixinMooniswap.sol";
import "./mixins/MixinMStable.sol";
import "./mixins/MixinOasis.sol";
import "./mixins/MixinShell.sol";
import "./mixins/MixinSushiswap.sol";
import "./mixins/MixinUniswap.sol";
import "./mixins/MixinUniswapV2.sol";
import "./mixins/MixinZeroExBridge.sol";

contract BridgeAdapter is
    IBridgeAdapter,
    MixinBalancer,
    MixinCurve,
    MixinCryptoCom,
    MixinDodo,
    MixinKyber,
    MixinMooniswap,
    MixinMStable,
    MixinOasis,
    MixinShell,
    MixinSushiswap,
    MixinUniswap,
    MixinUniswapV2,
    MixinZeroExBridge
{

    constructor(IBridgeAdapter.Addresses memory addresses)
        public
        MixinBalancer()
        MixinCurve()
        MixinCryptoCom(addresses)
        MixinDodo(addresses)
        MixinKyber(addresses)
        MixinMooniswap(addresses)
        MixinMStable(addresses)
        MixinOasis(addresses)
        MixinShell()
        MixinSushiswap(addresses)
        MixinUniswap(addresses)
        MixinUniswapV2(addresses)
        MixinZeroExBridge()
    {}

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
        if (order.source == BridgeSource.Curve ||
            order.source == BridgeSource.Swerve ||
            order.source == BridgeSource.Snowswap) {
            boughtAmount = _tradeCurve(
                order.sourceAddress,
                sellToken,
                buyToken,
                sellAmount,
                order.bridgeData
            );
        } else if (order.source == BridgeSource.Sushiswap) {
            boughtAmount = _tradeSushiswap(
                buyToken,
                sellAmount,
                order.bridgeData
            );
        } else if (order.source == BridgeSource.UniswapV2) {
            boughtAmount = _tradeUniswapV2(
                buyToken,
                sellAmount,
                order.bridgeData
            );
        } else if (order.source == BridgeSource.Uniswap) {
            boughtAmount = _tradeUniswap(
                sellToken,
                buyToken,
                sellAmount
            );
        } else if (order.source == BridgeSource.Balancer ||
                   order.source == BridgeSource.Cream) {
            boughtAmount = _tradeBalancer(
                order.sourceAddress,
                sellToken,
                buyToken,
                sellAmount
            );
        } else if (order.source == BridgeSource.Kyber) {
            boughtAmount = _tradeKyber(
                sellToken,
                buyToken,
                sellAmount,
                order.bridgeData
            );
        } else if (order.source == BridgeSource.Mooniswap) {
            boughtAmount = _tradeMooniswap(
                order.sourceAddress,
                sellToken,
                buyToken,
                sellAmount
            );
        } else if (order.source == BridgeSource.MStable) {
            boughtAmount = _tradeMStable(
                sellToken,
                buyToken,
                sellAmount
            );
        } else if (order.source == BridgeSource.Oasis) {
            boughtAmount = _tradeOasis(
                sellToken,
                buyToken,
                sellAmount
            );
        } else if (order.source == BridgeSource.Shell) {
            boughtAmount = _tradeShell(
                order.sourceAddress,
                sellToken,
                buyToken,
                sellAmount
            );
        } else if (order.source == BridgeSource.Dodo) {
            boughtAmount = _tradeDodo(
                order.sourceAddress,
                sellToken,
                sellAmount,
                order.bridgeData
            );
        } else if (order.source == BridgeSource.CryptoCom) {
            boughtAmount = _tradeCryptoCom(
                buyToken,
                sellAmount,
                order.bridgeData
            );
        } else {
            boughtAmount = _tradeZeroExBridge(
                order,
                sellToken,
                buyToken,
                sellAmount
            );
            // Old bridge contracts should emit an `ERC20BridgeTransfer` themselves,
            // otherwise an event will be emitted from `_tradeZeroExBridge`.
            return boughtAmount;
        }

        emit ERC20BridgeTransfer(
            sellToken,
            buyToken,
            sellAmount,
            boughtAmount,
            order.source,
            address(this)
        );
    }
}
