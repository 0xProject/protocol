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

import "../src/features/interfaces/IMetaTransactionsFeature.sol";
import "../src/features/NativeOrdersFeature.sol";
import "./TestFeeCollectorController.sol";


contract TestMetaTransactionsNativeOrdersFeature is
    NativeOrdersFeature
{
    constructor()
        public
        NativeOrdersFeature(
            address(0),
            IEtherTokenV06(0),
            IStaking(0),
            FeeCollectorController(address(new TestFeeCollectorController())),
            0
        )
    {}

    event FillLimitOrderCalled(
        LibNativeOrder.LimitOrder order,
        LibSignature.SignatureType signatureType,
        uint8 v,
        bytes32 r,
        bytes32 s,
        uint128 takerTokenFillAmount,
        address taker,
        address sender
    );

    function _fillLimitOrder(
        LibNativeOrder.LimitOrder memory order,
        LibSignature.Signature memory signature,
        uint128 takerTokenFillAmount,
        address taker,
        address sender
    )
        public
        override
        payable
        returns (uint128 takerTokenFilledAmount, uint128 makerTokenFilledAmount)
    {
        emit FillLimitOrderCalled(
            order,
            signature.signatureType,
            signature.v,
            signature.r,
            signature.s,
            takerTokenFillAmount,
            taker,
            sender
        );
        return (0, 1337);
    }

    event FillRfqOrderCalled(
        LibNativeOrder.RfqOrder order,
        LibSignature.SignatureType signatureType,
        uint8 v,
        bytes32 r,
        bytes32 s,
        uint128 takerTokenFillAmount,
        address taker
    );

    function _fillRfqOrder(
        LibNativeOrder.RfqOrder memory order,
        LibSignature.Signature memory signature,
        uint128 takerTokenFillAmount,
        address taker,
        bool /* useSelfBalance */,
        address /* recipient */
    )
        public
        override
        returns (uint128 takerTokenFilledAmount, uint128 makerTokenFilledAmount)
    {
        emit FillRfqOrderCalled(
            order,
            signature.signatureType,
            signature.v,
            signature.r,
            signature.s,
            takerTokenFillAmount,
            taker
        );
        return (0, 1337);
    }
}
