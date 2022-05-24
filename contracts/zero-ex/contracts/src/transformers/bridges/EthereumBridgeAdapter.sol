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

import "@0x/contracts-utils/contracts/src/v06/errors/LibRichErrorsV06.sol";
import "./IBridgeAdapter.sol";
import "./BridgeProtocols.sol";
import "./mixins/MixinCryptoCom.sol";
import "./mixins/MixinDodo.sol";
import "./mixins/MixinDodoV2.sol";
import "./mixins/MixinKyberDmm.sol";
import "./mixins/MixinLido.sol";
import "./mixins/MixinMakerPSM.sol";
import "./mixins/MixinMooniswap.sol";
import "./mixins/MixinMStable.sol";
import "./mixins/MixinShell.sol";
import "./mixins/MixinUniswap.sol";
import "./mixins/MixinUniswapV2.sol";
import "./mixins/MixinUniswapV3.sol";
import "./mixins/MixinZeroExBridge.sol";
import "./EthereumSubAdapter1.sol";

contract EthereumBridgeAdapter is
    IBridgeAdapter,
    MixinCryptoCom,
    MixinDodo,
    MixinDodoV2,
    MixinKyberDmm,
    MixinLido,
    MixinMakerPSM,
    MixinMooniswap,
    MixinMStable,
    MixinShell,
    MixinUniswap,
    MixinUniswapV2,
    MixinUniswapV3,
    MixinZeroExBridge
{
    using LibRichErrorsV06 for bytes; 
    
    EthereumSubAdapter1 private immutable _subadapter1;

    constructor(IEtherTokenV06 weth, EthereumSubAdapter1 subadapter1)
        public
        MixinLido(weth)
        MixinMooniswap(weth)
        MixinUniswap(weth)
    {
        uint256 chainId;
        assembly { chainId := chainid() }
        // Allow Ganache for testing
        require(chainId == 1 || chainId == 1337 , 'EthereumBridgeAdapter.constructor: wrong chain ID');

        _subadapter1 = subadapter1;
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
            boughtAmount = _delegateCallSubAdapter(address(_subadapter1), abi.encodeWithSelector(
                _subadapter1._tradeCurve.selector,
                sellToken,
                buyToken,
                sellAmount,
                order.bridgeData
            ));
        } else if (protocolId == BridgeProtocols.CURVEV2) {
            boughtAmount = _delegateCallSubAdapter(address(_subadapter1), abi.encodeWithSelector(
                _subadapter1._tradeCurveV2.selector,
                sellToken,
                buyToken,
                sellAmount,
                order.bridgeData
            ));
        } else if (protocolId == BridgeProtocols.UNISWAPV3) {
            boughtAmount = _tradeUniswapV3(
                sellToken,
                sellAmount,
                order.bridgeData
            );
        } else if (protocolId == BridgeProtocols.UNISWAPV2) {
            boughtAmount = _tradeUniswapV2(
                buyToken,
                sellAmount,
                order.bridgeData
            );
        } else if (protocolId == BridgeProtocols.UNISWAP) {
            boughtAmount = _tradeUniswap(
                sellToken,
                buyToken,
                sellAmount,
                order.bridgeData
            );
        } else if (protocolId == BridgeProtocols.BALANCER) {
            boughtAmount = _delegateCallSubAdapter(address(_subadapter1), abi.encodeWithSelector(
                _subadapter1._tradeBalancer.selector,
                sellToken,
                buyToken,
                sellAmount,
                order.bridgeData
            ));
        } else if (protocolId == BridgeProtocols.BALANCERV2) {
            boughtAmount = _delegateCallSubAdapter(address(_subadapter1), abi.encodeWithSelector(
                _subadapter1._tradeBalancerV2.selector,
                sellToken,
                buyToken,
                sellAmount,
                order.bridgeData
            ));
        } else if (protocolId == BridgeProtocols.BALANCERV2BATCH) {
            boughtAmount = _delegateCallSubAdapter(address(_subadapter1), abi.encodeWithSelector(
                _subadapter1._tradeBalancerV2Batch.selector,
                sellAmount,
                order.bridgeData
            ));
        } else if (protocolId == BridgeProtocols.MAKERPSM) {
            boughtAmount = _tradeMakerPsm(
                sellToken,
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
        } else if (protocolId == BridgeProtocols.MSTABLE) {
            boughtAmount = _tradeMStable(
                sellToken,
                buyToken,
                sellAmount,
                order.bridgeData
            );
        } else if (protocolId == BridgeProtocols.SHELL) {
            boughtAmount = _tradeShell(
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
        } else if (protocolId == BridgeProtocols.CRYPTOCOM) {
            boughtAmount = _tradeCryptoCom(
                buyToken,
                sellAmount,
                order.bridgeData
            );
        } else if (protocolId == BridgeProtocols.BANCOR) {
            boughtAmount = _delegateCallSubAdapter(address(_subadapter1), abi.encodeWithSelector(
                _subadapter1._tradeBancor.selector,
                buyToken,
                sellAmount,
                order.bridgeData
            ));
        } else if (protocolId == BridgeProtocols.KYBERDMM) {
            boughtAmount = _tradeKyberDmm(
                buyToken,
                sellAmount,
                order.bridgeData
            );
        } else if (protocolId == BridgeProtocols.LIDO) {
            boughtAmount = _tradeLido(
                sellToken,
                buyToken,
                sellAmount,
                order.bridgeData
            );
        } else if (protocolId == BridgeProtocols.AAVEV2) {
            boughtAmount = _delegateCallSubAdapter(address(_subadapter1), abi.encodeWithSelector(
                _subadapter1._tradeAaveV2.selector,
                sellToken,
                buyToken,
                sellAmount,
                order.bridgeData
            ));
        } else if (protocolId == BridgeProtocols.COMPOUND) {
            boughtAmount = _delegateCallSubAdapter(address(_subadapter1), abi.encodeWithSelector(
                _subadapter1._tradeCompound.selector,
                sellToken,
                buyToken,
                sellAmount,
                order.bridgeData
            ));
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

    function _delegateCallSubAdapter(address subadapter, bytes memory encodedCall)
        private
        returns (uint256 boughtAmount)
    {
        (bool success, bytes memory resultData) = address(subadapter)
            .delegatecall(encodedCall);
        if (!success) {
            resultData.rrevert();
        } else {
            boughtAmount = abi.decode(resultData, (uint256));
        }
    }
}
