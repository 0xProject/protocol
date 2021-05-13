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

import "@0x/contracts-utils/contracts/src/v06/LibSafeMathV06.sol";
import "@0x/contracts-utils/contracts/src/v06/LibMathV06.sol";
import "../errors/LibNativeOrdersRichErrors.sol";
import "../fixins/FixinCommon.sol";
import "../fixins/FixinEIP712.sol";
import "../fixins/FixinTokenSpender.sol";
import "../migrations/LibMigrate.sol";
import "../storage/LibNativeOrdersStorage.sol";
import "../storage/LibOtcOrdersStorage.sol";
import "./interfaces/IFeature.sol";
import "./interfaces/IOtcOrdersFeature.sol";
import "./libs/LibNativeOrder.sol";
import "./libs/LibSignature.sol";


/// @dev Feature for interacting with OTC orders.
contract OtcOrdersFeature is
    IFeature,
    IOtcOrdersFeature,
    FixinCommon,
    FixinEIP712,
    FixinTokenSpender
{
    /// @dev Emitted whenever an `OtcOrder` is filled.
    /// @param orderHash The canonical hash of the order.
    /// @param maker The maker of the order.
    /// @param taker The taker of the order.
    /// @param takerTokenFilledAmount How much taker token was filled.
    /// @param makerTokenFilledAmount How much maker token was filled.
    /// @param pool The fee pool associated with this order.
    event OtcOrderFilled(
        bytes32 orderHash,
        address maker,
        address taker,
        address makerToken,
        address takerToken,
        uint128 takerTokenFilledAmount,
        uint128 makerTokenFilledAmount,
        bytes32 pool
    );

    /// @dev Name of this feature.
    string public constant override FEATURE_NAME = "OtcOrders";
    /// @dev Version of this feature.
    uint256 public immutable override FEATURE_VERSION = _encodeVersion(1, 0, 0);

    constructor(address zeroExAddress)
        public
        FixinEIP712(zeroExAddress)
    {
        // solhint-disable no-empty-blocks
    }

    /// @dev Initialize and register this feature.
    ///      Should be delegatecalled by `Migrate.migrate()`.
    /// @return success `LibMigrate.SUCCESS` on success.
    function migrate()
        external
        returns (bytes4 success)
    {
        _registerFeatureFunction(this.fillOtcOrder.selector);
        _registerFeatureFunction(this.fillTakerSignedOtcOrder.selector);
        _registerFeatureFunction(this.getOtcOrderInfo.selector);
        _registerFeatureFunction(this.getOtcOrderHash.selector);
        return LibMigrate.MIGRATE_SUCCESS;
    }

    /// @dev Fill a OTC order for up to `takerTokenFillAmount` taker tokens.
    /// @param order The OTC order.
    /// @param makerSignature The order signature from the maker.
    /// @param takerTokenFillAmount Maximum taker token amount to fill this
    ///        order with.
    /// @return takerTokenFilledAmount How much taker token was filled.
    /// @return makerTokenFilledAmount How much maker token was filled.
    function fillOtcOrder(
        LibNativeOrder.OtcOrder memory order,
        LibSignature.Signature memory makerSignature,
        uint128 takerTokenFillAmount
    )
        public
        override
        returns (uint128 takerTokenFilledAmount, uint128 makerTokenFilledAmount)
    {
        if (order.taker != address(0) && order.taker != msg.sender) {
            bytes32 orderHash = getOtcOrderHash(order);
            LibNativeOrdersRichErrors.OrderNotFillableByTakerError(
                orderHash,
                msg.sender,
                order.taker
            ).rrevert();
        }
        LibSignature.Signature memory nullSignature;
        return _fillOtcOrderPrivate(
            order,
            makerSignature,
            nullSignature,
            takerTokenFillAmount
        );
    }

    /// @dev Fill a OTC order for up to `takerTokenFillAmount` taker tokens.
    ///      "Meta-transaction" variant, requires order to be signed by both
    ///      maker and taker.
    /// @param order The OTC order.
    /// @param makerSignature The order signature from the maker.
    /// @param takerSignature The order signature from the taker.
    /// @param takerTokenFillAmount Maximum taker token amount to fill this
    ///        order with.
    /// @return takerTokenFilledAmount How much taker token was filled.
    /// @return makerTokenFilledAmount How much maker token was filled.
    function fillTakerSignedOtcOrder(
        LibNativeOrder.OtcOrder memory order,
        LibSignature.Signature memory makerSignature,
        LibSignature.Signature memory takerSignature,
        uint128 takerTokenFillAmount
    )
        public
        override
        returns (uint128 takerTokenFilledAmount, uint128 makerTokenFilledAmount)
    {
        return _fillOtcOrderPrivate(
            order,
            makerSignature,
            takerSignature,
            takerTokenFillAmount
        );
    }

    /// @dev Fill an OTC order. Private variant.
    /// @param order The OTC order.
    /// @param makerSignature The order signature from the maker.
    /// @param takerSignature The order signature from the taker.
    ///        Ignored if msg.sender == order.taker.
    /// @param takerTokenFillAmount Maximum taker token amount to
    ///        fill this order with.
    /// @return takerTokenFilledAmount How much maker token was filled.
    /// @return makerTokenFilledAmount How much maker token was filled.
    function _fillOtcOrderPrivate(
        LibNativeOrder.OtcOrder memory order,
        LibSignature.Signature memory makerSignature,
        LibSignature.Signature memory takerSignature,
        uint128 takerTokenFillAmount
    )
        private
        returns (uint128 takerTokenFilledAmount, uint128 makerTokenFilledAmount)
    {
        LibNativeOrder.OtcOrderInfo memory orderInfo = getOtcOrderInfo(order);

        // Must be fillable.
        if (orderInfo.status != LibNativeOrder.OrderStatus.FILLABLE) {
            LibNativeOrdersRichErrors.OrderNotFillableError(
                orderInfo.orderHash,
                uint8(orderInfo.status)
            ).rrevert();
        }

        {
            LibNativeOrdersStorage.Storage storage stor =
                LibNativeOrdersStorage.getStorage();

            // Must be fillable by the tx.origin.
            if (
                order.txOrigin != tx.origin &&
                !stor.originRegistry[order.txOrigin][tx.origin]
            ) {
                LibNativeOrdersRichErrors.OrderNotFillableByOriginError(
                    orderInfo.orderHash,
                    tx.origin,
                    order.txOrigin
                ).rrevert();
            }

            // Maker signature must be valid for the order.
            address makerSigner = LibSignature.getSignerOfHash(orderInfo.orderHash, makerSignature);
            if (
                makerSigner != order.maker &&
                !stor.orderSignerRegistry[order.maker][makerSigner]
            ) {
                LibNativeOrdersRichErrors.OrderNotSignedByMakerError(
                    orderInfo.orderHash,
                    makerSigner,
                    order.maker
                ).rrevert();
            }
        }

        address taker = msg.sender;
        // If msg.sender is not the taker, validate the taker signature.
        if (order.taker != address(0) && order.taker != msg.sender) {
            address takerSigner = LibSignature.getSignerOfHash(orderInfo.orderHash, takerSignature);
            if (takerSigner != order.taker) {
                LibNativeOrdersRichErrors.OrderNotSignedByTakerError(
                    orderInfo.orderHash,
                    takerSigner,
                    order.taker
                ).rrevert();
            }
            taker = order.taker;
        }

        // Settle between the maker and taker.
        (takerTokenFilledAmount, makerTokenFilledAmount) = _settleOtcOrder(
            order,
            taker,
            takerTokenFillAmount
        );

        emit OtcOrderFilled(
            orderInfo.orderHash,
            order.maker,
            taker,
            address(order.makerToken),
            address(order.takerToken),
            takerTokenFilledAmount,
            makerTokenFilledAmount,
            order.pool
        );
    }

    /// @dev Settle the trade between an OTC order's maker and taker.
    /// @param order The OTC order.
    /// @param takerTokenFillAmount Maximum taker token amount to fill this
    ///        order with.
    /// @return takerTokenFilledAmount How much taker token was filled.
    /// @return makerTokenFilledAmount How much maker token was filled.
    function _settleOtcOrder(
        LibNativeOrder.OtcOrder memory order,
        address taker,
        uint128 takerTokenFillAmount
    )
        private
        returns (uint128 takerTokenFilledAmount, uint128 makerTokenFilledAmount)
    {
        // Update tx origin nonce for the order.
        LibOtcOrdersStorage.getStorage().txOriginNonces
            [order.txOrigin][order.txOriginNonceBucket] = order.txOriginNonce;

        // Clamp the taker token fill amount to the fillable amount.
        takerTokenFilledAmount = LibSafeMathV06.min128(
            takerTokenFillAmount,
            order.takerAmount
        );
        // Compute the maker token amount.
        // This should never overflow because the values are all clamped to
        // (2^128-1).
        makerTokenFilledAmount = uint128(LibMathV06.getPartialAmountFloor(
            uint256(takerTokenFilledAmount),
            uint256(order.takerAmount),
            uint256(order.makerAmount)
        ));

        // Transfer taker -> maker.
        _transferERC20Tokens(
            order.takerToken,
            taker,
            order.maker,
            takerTokenFilledAmount
        );

        // Transfer maker -> taker.
        _transferERC20Tokens(
            order.makerToken,
            order.maker,
            taker,
            makerTokenFilledAmount
        );
    }

    /// @dev Get the order info for a OTC order.
    /// @param order The OTC order.
    /// @return orderInfo Info about the order.
    function getOtcOrderInfo(LibNativeOrder.OtcOrder memory order)
        public
        override
        view
        returns (LibNativeOrder.OtcOrderInfo memory orderInfo)
    {
        // compute order hash.
        orderInfo.orderHash = getOtcOrderHash(order);

        LibOtcOrdersStorage.Storage storage stor =
            LibOtcOrdersStorage.getStorage();

        // check tx origin nonce
        uint256 minNonce = stor.txOriginNonces
            [order.txOrigin]
            [order.txOriginNonceBucket];

        if (order.txOriginNonce <= minNonce) {
            orderInfo.status = LibNativeOrder.OrderStatus.INVALID;
            return orderInfo;
        }

        // Check for expiration.
        if (order.expiry <= uint64(block.timestamp)) {
            orderInfo.status = LibNativeOrder.OrderStatus.EXPIRED;
            return orderInfo;
        }

        orderInfo.status = LibNativeOrder.OrderStatus.FILLABLE;
        return orderInfo;
    }

    /// @dev Get the canonical hash of an OTC order.
    /// @param order The OTC order.
    /// @return orderHash The order hash.
    function getOtcOrderHash(LibNativeOrder.OtcOrder memory order)
        public
        override
        view
        returns (bytes32 orderHash)
    {
        return _getEIP712Hash(
            LibNativeOrder.getOtcOrderStructHash(order)
        );
    }
}
