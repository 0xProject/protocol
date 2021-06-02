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

import "@0x/contracts-erc20/contracts/src/v06/IEtherTokenV06.sol";
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
    using LibSafeMathV06 for uint256;
    using LibSafeMathV06 for uint128;

    /// @dev Options for handling ETH/WETH conversion
    /// @param LeaveAsWeth Neither unwrap nor wrap.
    /// @param WrapEth Wrap attached ETH.
    /// @param UnwrapWeth Unwrap WETH before transferring
    ///        to taker.
    enum WethOptions {
        LeaveAsWeth,
        WrapEth,
        UnwrapWeth
    }

    /// @dev Name of this feature.
    string public constant override FEATURE_NAME = "OtcOrders";
    /// @dev Version of this feature.
    uint256 public immutable override FEATURE_VERSION = _encodeVersion(1, 0, 0);
    /// @dev The WETH token contract.
    IEtherTokenV06 private immutable WETH;

    constructor(address zeroExAddress, IEtherTokenV06 weth)
        public
        FixinEIP712(zeroExAddress)
    {
        WETH = weth;
    }

    /// @dev Initialize and register this feature.
    ///      Should be delegatecalled by `Migrate.migrate()`.
    /// @return success `LibMigrate.SUCCESS` on success.
    function migrate()
        external
        returns (bytes4 success)
    {
        _registerFeatureFunction(this.fillOtcOrder.selector);
        _registerFeatureFunction(this.fillOtcOrderWithEth.selector);
        _registerFeatureFunction(this.fillTakerSignedOtcOrder.selector);
        _registerFeatureFunction(this.getOtcOrderInfo.selector);
        _registerFeatureFunction(this.getOtcOrderHash.selector);
        _registerFeatureFunction(this.lastOtcTxOriginNonce.selector);
        return LibMigrate.MIGRATE_SUCCESS;
    }

    /// @dev Fill an OTC order for up to `takerTokenFillAmount` taker tokens.
    /// @param order The OTC order.
    /// @param makerSignature The order signature from the maker.
    /// @param takerTokenFillAmount Maximum taker token amount to fill this
    ///        order with.
    /// @param unwrapWeth Whether or not to unwrap bought WETH into ETH
    ///        before transferring it to the taker. Should be set to false
    ///        if the maker token is not WETH.
    /// @return takerTokenFilledAmount How much taker token was filled.
    /// @return makerTokenFilledAmount How much maker token was filled.
    function fillOtcOrder(
        LibNativeOrder.OtcOrder memory order,
        LibSignature.Signature memory makerSignature,
        uint128 takerTokenFillAmount,
        bool unwrapWeth
    )
        public
        override
        returns (uint128 takerTokenFilledAmount, uint128 makerTokenFilledAmount)
    {
        if (!_isSenderValidTaker(order.taker)) {
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
            takerTokenFillAmount,
            unwrapWeth ? WethOptions.UnwrapWeth : WethOptions.LeaveAsWeth
        );
    }

    /// @dev Fill an OTC order whose taker token is WETH for up
    ///      to `msg.value`.
    /// @param order The OTC order.
    /// @param makerSignature The order signature from the maker.
    /// @return takerTokenFilledAmount How much taker token was filled.
    /// @return makerTokenFilledAmount How much maker token was filled.
    function fillOtcOrderWithEth(
        LibNativeOrder.OtcOrder memory order,
        LibSignature.Signature memory makerSignature
    )
        public
        override
        payable
        returns (uint128 takerTokenFilledAmount, uint128 makerTokenFilledAmount)
    {
        if (!_isSenderValidTaker(order.taker)) {
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
            msg.value.safeDowncastToUint128(),
            WethOptions.WrapEth
        );
    }

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
        LibNativeOrder.OtcOrder memory order,
        LibSignature.Signature memory makerSignature,
        LibSignature.Signature memory takerSignature,
        bool unwrapWeth
    )
        public
        override
        returns (uint128 takerTokenFilledAmount, uint128 makerTokenFilledAmount)
    {
        return _fillOtcOrderPrivate(
            order,
            makerSignature,
            takerSignature,
            order.takerAmount,
            unwrapWeth ? WethOptions.UnwrapWeth : WethOptions.LeaveAsWeth
        );
    }

    /// @dev Fill an OTC order. Private variant.
    /// @param order The OTC order.
    /// @param makerSignature The order signature from the maker.
    /// @param takerSignature The order signature from the taker.
    ///        Ignored if msg.sender == order.taker.
    /// @param takerTokenFillAmount Maximum taker token amount to
    ///        fill this order with.
    /// @return takerTokenFilledAmount How much taker token was filled.
    /// @return makerTokenFilledAmount How much maker token was filled.
    function _fillOtcOrderPrivate(
        LibNativeOrder.OtcOrder memory order,
        LibSignature.Signature memory makerSignature,
        LibSignature.Signature memory takerSignature,
        uint128 takerTokenFillAmount,
        WethOptions wethOptions
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

        address taker = msg.sender;
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

            // If msg.sender is not the taker, validate the taker signature.
            if (!_isSenderValidTaker(order.taker)) {
                address takerSigner = LibSignature.getSignerOfHash(orderInfo.orderHash, takerSignature);
                if (
                    takerSigner != order.taker &&
                    !stor.orderSignerRegistry[order.taker][takerSigner]
                ) {
                    LibNativeOrdersRichErrors.OrderNotSignedByTakerError(
                        orderInfo.orderHash,
                        takerSigner,
                        order.taker
                    ).rrevert();
                }
                taker = order.taker;
            }
        }

        // Settle between the maker and taker.
        (takerTokenFilledAmount, makerTokenFilledAmount) = _settleOtcOrder(
            order,
            taker,
            takerTokenFillAmount,
            wethOptions
        );

        emit OtcOrderFilled(
            orderInfo.orderHash,
            order.maker,
            taker,
            address(order.makerToken),
            address(order.takerToken),
            takerTokenFilledAmount,
            makerTokenFilledAmount
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
        uint128 takerTokenFillAmount,
        WethOptions wethOptions
    )
        private
        returns (uint128 takerTokenFilledAmount, uint128 makerTokenFilledAmount)
    {
        {
            // Unpack nonce fields
            uint64 nonceBucket = uint64(order.expiryAndNonce >> 128);
            uint128 nonce = uint128(order.expiryAndNonce);
            // Update tx origin nonce for the order
            LibOtcOrdersStorage.getStorage().txOriginNonces
                [order.txOrigin][nonceBucket] = nonce;
        }

        if (takerTokenFillAmount == order.takerAmount) {
            takerTokenFilledAmount = order.takerAmount;
            makerTokenFilledAmount = order.makerAmount;
        } else {
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
        }

        if (wethOptions == WethOptions.WrapEth) {
            require(
                order.takerToken == WETH,
                "OtcOrdersFeature/INVALID_WRAP_ETH"
            );
            // Wrap ETH
            WETH.deposit{value: takerTokenFilledAmount}();
            // Transfer WETH to maker
            WETH.transfer(order.maker, takerTokenFilledAmount);
            if (takerTokenFilledAmount < msg.value) {
                // Refund unused ETH
                _transferEth(
                    msg.sender,
                    msg.value - uint256(takerTokenFilledAmount)
                );
            }
        } else {
            // Transfer taker -> maker
            _transferERC20TokensFrom(
                order.takerToken,
                taker,
                order.maker,
                takerTokenFilledAmount
            );
        }

        if (wethOptions == WethOptions.UnwrapWeth) {
            require(
                order.makerToken == WETH,
                "OtcOrdersFeature/INVALID_UNWRAP_WETH"
            );
            // Transfer maker tokens in
            _transferERC20TokensFrom(
                order.makerToken,
                order.maker,
                address(this),
                makerTokenFilledAmount
            );
            // Unwrap WETH
            WETH.withdraw(makerTokenFilledAmount);
            // Transfer ETH to taker
            _transferEth(taker, makerTokenFilledAmount);
        } else {
            // Transfer maker -> taker.
            _transferERC20TokensFrom(
                order.makerToken,
                order.maker,
                taker,
                makerTokenFilledAmount
            );
        }
    }

    /// @dev Get the order info for an OTC order.
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

        // Unpack expiry and nonce fields
        uint64 expiry = uint64(order.expiryAndNonce >> 192);
        uint64 nonceBucket = uint64(order.expiryAndNonce >> 128);
        uint128 nonce = uint128(order.expiryAndNonce);

        // check tx origin nonce
        uint128 lastNonce = stor.txOriginNonces
            [order.txOrigin]
            [nonceBucket];
        if (nonce <= lastNonce) {
            orderInfo.status = LibNativeOrder.OrderStatus.INVALID;
            return orderInfo;
        }

        // Check for expiration.
        if (expiry <= uint64(block.timestamp)) {
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

    /// @dev Get the last nonce used for a particular
    ///      tx.origin address and nonce bucket.
    /// @param txOrigin The address.
    /// @param nonceBucket The nonce bucket index.
    /// @return lastNonce The last nonce value used.
    function lastOtcTxOriginNonce(address txOrigin, uint64 nonceBucket)
        public
        override
        view
        returns (uint128 lastNonce)
    {
        LibOtcOrdersStorage.Storage storage stor =
            LibOtcOrdersStorage.getStorage();
        return stor.txOriginNonces
            [txOrigin]
            [nonceBucket];
    }

    function _transferEth(address recipient, uint256 amount)
        private
    {
        // Transfer ETH to recipient
        (bool success, bytes memory revertData) =
            recipient.call{value: amount}("");
        // Revert on failure
        if (!success) {
            revertData.rrevert();
        }
    }

    function _isSenderValidTaker(address orderTaker)
        private
        view
        returns (bool)
    {
        return orderTaker == address(0) || orderTaker == msg.sender;
    }
}
