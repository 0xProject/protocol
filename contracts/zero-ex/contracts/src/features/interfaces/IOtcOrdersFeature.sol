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

import "../libs/LibNativeOrder.sol";
import "../libs/LibSignature.sol";


/// @dev Feature for interacting with OTC orders.
interface IOtcOrdersFeature {

    /// @dev Emitted whenever an `OtcOrder` is filled.
    /// @param orderHash The canonical hash of the order.
    /// @param maker The maker of the order.
    /// @param taker The taker of the order.
    /// @param takerTokenFilledAmount How much taker token was filled.
    /// @param makerTokenFilledAmount How much maker token was filled.
    event OtcOrderFilled(
        bytes32 orderHash,
        address maker,
        address taker,
        address makerToken,
        address takerToken,
        uint128 takerTokenFilledAmount,
        uint128 makerTokenFilledAmount
    );

    /// @dev Fill an OTC order for up to `takerTokenFillAmount` taker tokens.
    /// @param order The OTC order.
    /// @param makerSignature The order signature from the maker.
    /// @param takerTokenFillAmount Maximum taker token amount to fill this
    ///        order with.
    /// @param unwrapWeth Whether or not to unwrap bought WETH into ETH
    ///        before transferring it to the taker. Should be set to false
    /// @return takerTokenFilledAmount How much taker token was filled.
    /// @return makerTokenFilledAmount How much maker token was filled.
    function fillOtcOrder(
        LibNativeOrder.OtcOrder calldata order,
        LibSignature.Signature calldata makerSignature,
        uint128 takerTokenFillAmount,
        bool unwrapWeth
    )
        external
        returns (uint128 takerTokenFilledAmount, uint128 makerTokenFilledAmount);

    /// @dev Fill an OTC order whose taker token is WETH for up
    ///      to `msg.value`.
    /// @param order The OTC order.
    /// @param makerSignature The order signature from the maker.
    /// @return takerTokenFilledAmount How much taker token was filled.
    /// @return makerTokenFilledAmount How much maker token was filled.
    function fillOtcOrderWithEth(
        LibNativeOrder.OtcOrder calldata order,
        LibSignature.Signature calldata makerSignature
    )
        external
        payable
        returns (uint128 takerTokenFilledAmount, uint128 makerTokenFilledAmount);

    /// @dev Fully fill an OTC order. "Meta-transaction" variant,
    ///      requires order to be signed by both maker and taker.
    /// @param order The OTC order.
    /// @param makerSignature The order signature from the maker.
    /// @param takerSignature The order signature from the taker.
    /// @param unwrapWeth Whether or not to unwrap bought WETH into ETH
    ///        before transferring it to the taker. Should be set to false
    ///        if the maker token is not WETH.
    /// @return takerTokenFilledAmount How much taker token was filled.
    /// @return makerTokenFilledAmount How much maker token was filled.
    function fillTakerSignedOtcOrder(
        LibNativeOrder.OtcOrder calldata order,
        LibSignature.Signature calldata makerSignature,
        LibSignature.Signature calldata takerSignature,
        bool unwrapWeth
    )
        external
        returns (uint128 takerTokenFilledAmount, uint128 makerTokenFilledAmount);

    /// @dev Get the order info for an OTC order.
    /// @param order The OTC order.
    /// @return orderInfo Info about the order.
    function getOtcOrderInfo(LibNativeOrder.OtcOrder calldata order)
        external
        view
        returns (LibNativeOrder.OtcOrderInfo memory orderInfo);

    /// @dev Get the canonical hash of an OTC order.
    /// @param order The OTC order.
    /// @return orderHash The order hash.
    function getOtcOrderHash(LibNativeOrder.OtcOrder calldata order)
        external
        view
        returns (bytes32 orderHash);

    /// @dev Get the last nonce used for a particular
    ///      tx.origin address and nonce bucket.
    /// @param txOrigin The address.
    /// @param nonceBucket The nonce bucket index.
    /// @return lastNonce The last nonce value used.
    function lastOtcTxOriginNonce(address txOrigin, uint64 nonceBucket)
        external
        view
        returns (uint128 lastNonce);
}
