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

import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";
import "@0x/contracts-erc20/contracts/src/v06/IEtherTokenV06.sol";
import "@0x/contracts-erc20/contracts/src/v06/LibERC20TokenV06.sol";
import "@0x/contracts-utils/contracts/src/v06/errors/LibRichErrorsV06.sol";
import "@0x/contracts-utils/contracts/src/v06/LibSafeMathV06.sol";
import "@0x/contracts-utils/contracts/src/v06/LibMathV06.sol";
import "../fixins/FixinCommon.sol";
import "../fixins/FixinProtocolFees.sol";
import "../fixins/FixinEIP712.sol";
import "../errors/LibLimitOrdersRichErrors.sol";
import "../migrations/LibMigrate.sol";
import "../storage/LibLimitOrdersStorage.sol";
import "../vendor/v3/IStaking.sol";
import "./libs/LibTokenSpender.sol";
import "./libs/LibSignature.sol";
import "./libs/LibLimitOrder.sol";
import "./ILimitOrdersFeature.sol";
import "./IFeature.sol";


/// @dev Feature for interacting with limit orders.
contract LimitOrdersFeature is
    IFeature,
    ILimitOrdersFeature,
    FixinCommon,
    FixinProtocolFees,
    FixinEIP712
{
    using LibSafeMathV06 for uint256;
    using LibSafeMathV06 for uint128;
    using LibRichErrorsV06 for bytes;

    /// @dev Params for `_settleOrder()`.
    struct SettleOrderInfo {
        // Order hash.
        bytes32 orderHash;
        // Maker of the order.
        address maker;
        // Taker of the order.
        address taker;
        // Maker token.
        IERC20TokenV06 makerToken;
        // Taker token.
        IERC20TokenV06 takerToken;
        // Maker token amount.
        uint128 makerAmount;
        // Taker token amount.
        uint128 takerAmount;
        // Maximum taker token amount to fill.
        uint128 takerTokenFillAmount;
        // How much taker token amount has already been filled in this order.
        uint128 takerTokenFilledAmount;
    }

    /// @dev Params for `_fillLimitOrderPrivate()`
    struct FillLimitOrderPrivateParams {
        // The limit order.
        LibLimitOrder.LimitOrder order;
        // The order signature.
        LibSignature.Signature signature;
        // Maximum taker token to fill this order with.
        uint128 takerTokenFillAmount;
        // The order taker.
        address taker;
        // The order sender.
        address sender;
    }

    /// @dev Name of this feature.
    string public constant override FEATURE_NAME = "LimitOrders";
    /// @dev Version of this feature.
    uint256 public immutable override FEATURE_VERSION = _encodeVersion(1, 0, 0);
    /// @dev Highest bit of a uint256, used to flag cancelled orders.
    uint256 private constant HIGH_BIT = 1 << 255;

    constructor(
        address zeroExAddress,
        IEtherTokenV06 weth,
        IStaking staking,
        uint32 protocolFeeMultiplier
    )
        public
        FixinEIP712(zeroExAddress)
        FixinProtocolFees(weth, staking, protocolFeeMultiplier)
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
        _registerFeatureFunction(this.fillLimitOrder.selector);
        _registerFeatureFunction(this.fillRfqOrder.selector);
        _registerFeatureFunction(this.fillOrKillLimitOrder.selector);
        _registerFeatureFunction(this.fillOrKillRfqOrder.selector);
        _registerFeatureFunction(this._fillLimitOrder.selector);
        _registerFeatureFunction(this._fillRfqOrder.selector);
        _registerFeatureFunction(this.cancelLimitOrder.selector);
        _registerFeatureFunction(this.cancelRfqOrder.selector);
        _registerFeatureFunction(this.batchCancelLimitOrders.selector);
        _registerFeatureFunction(this.batchCancelRfqOrders.selector);
        _registerFeatureFunction(this.cancelPairOrdersUpTo.selector);
        _registerFeatureFunction(this.batchCancelPairOrdersUpTo.selector);
        _registerFeatureFunction(this.getLimitOrderInfo.selector);
        _registerFeatureFunction(this.getRfqOrderInfo.selector);
        _registerFeatureFunction(this.getLimitOrderHash.selector);
        _registerFeatureFunction(this.getRfqOrderHash.selector);
        return LibMigrate.MIGRATE_SUCCESS;
    }

    /// @dev Fill a limit order. The taker and sender will be the caller.
    /// @param order The limit order. ETH protocol fees can be
    ///      attached to this call. Any unspent ETH will be refunded to
    ///      the caller.
    /// @param signature The order signature.
    /// @param takerTokenFillAmount Maximum taker token amount to fill this order with.
    /// @return takerTokenFilledAmount How much maker token was filled.
    /// @return makerTokenFilledAmount How much maker token was filled.
    function fillLimitOrder(
        LibLimitOrder.LimitOrder memory order,
        LibSignature.Signature memory signature,
        uint128 takerTokenFillAmount
    )
        public
        override
        payable
        returns (uint128 takerTokenFilledAmount, uint128 makerTokenFilledAmount)
    {
        uint256 ethProtocolFeePaid;
        (ethProtocolFeePaid, takerTokenFilledAmount, makerTokenFilledAmount) =
            _fillLimitOrderPrivate(FillLimitOrderPrivateParams({
                order: order,
                signature: signature,
                takerTokenFillAmount: takerTokenFillAmount,
                taker: msg.sender,
                sender: msg.sender
            }));
        _refundProtocolFeeToSender(ethProtocolFeePaid);
    }

    /// @dev Fill an RFQ order for up to `takerTokenFillAmount` taker tokens.
    ///      The taker will be the caller. ETH should be attached to pay the
    ///      protocol fee.
    /// @param order The RFQ order.
    /// @param signature The order signature.
    /// @param takerTokenFillAmount Maximum taker token amount to fill this order with.
    /// @return takerTokenFilledAmount How much maker token was filled.
    /// @return makerTokenFilledAmount How much maker token was filled.
    function fillRfqOrder(
        LibLimitOrder.RfqOrder memory order,
        LibSignature.Signature memory signature,
        uint128 takerTokenFillAmount
    )
        public
        override
        payable
        returns (uint128 takerTokenFilledAmount, uint128 makerTokenFilledAmount)
    {
        uint256 ethProtocolFeePaid;
        (ethProtocolFeePaid, takerTokenFilledAmount, makerTokenFilledAmount) =
            _fillRfqOrderPrivate(
                order,
                signature,
                takerTokenFillAmount,
                msg.sender
            );
        _refundProtocolFeeToSender(ethProtocolFeePaid);
    }

    /// @dev Fill an RFQ order for exactly `takerTokenFillAmount` taker tokens.
    ///      The taker will be the caller. ETH protocol fees can be
    ///      attached to this call. Any unspent ETH will be refunded to
    ///      the caller.
    /// @param order The limit order.
    /// @param signature The order signature.
    /// @param takerTokenFillAmount How much taker token to fill this order with.
    /// @return makerTokenFilledAmount How much maker token was filled.
    function fillOrKillLimitOrder(
        LibLimitOrder.LimitOrder memory order,
        LibSignature.Signature memory signature,
        uint128 takerTokenFillAmount
    )
        public
        override
        payable
        returns (uint128 makerTokenFilledAmount)
    {
        uint256 ethProtocolFeePaid;
        uint256 takerTokenFilledAmount;
        (ethProtocolFeePaid, takerTokenFilledAmount, makerTokenFilledAmount) =
            _fillLimitOrderPrivate(FillLimitOrderPrivateParams({
                order: order,
                signature: signature,
                takerTokenFillAmount: takerTokenFillAmount,
                taker: msg.sender,
                sender: msg.sender
            }));
        // Must have filled exactly the amount requested.
        if (takerTokenFilledAmount < takerTokenFillAmount) {
            LibLimitOrdersRichErrors.FillOrKillFailedError(
                getLimitOrderHash(order),
                takerTokenFilledAmount,
                takerTokenFillAmount
            ).rrevert();
        }
        _refundProtocolFeeToSender(ethProtocolFeePaid);
    }

    /// @dev Fill an RFQ order for exactly `takerTokenFillAmount` taker tokens.
    ///      The taker will be the caller. ETH protocol fees can be
    ///      attached to this call. Any unspent ETH will be refunded to
    ///      the caller.
    /// @param order The RFQ order.
    /// @param signature The order signature.
    /// @param takerTokenFillAmount How much taker token to fill this order with.
    /// @return makerTokenFilledAmount How much maker token was filled.
    function fillOrKillRfqOrder(
        LibLimitOrder.RfqOrder memory order,
        LibSignature.Signature memory signature,
        uint128 takerTokenFillAmount
    )
        public
        override
        payable
        returns (uint128 makerTokenFilledAmount)
    {
        uint256 ethProtocolFeePaid;
        uint256 takerTokenFilledAmount;
        (ethProtocolFeePaid, takerTokenFilledAmount, makerTokenFilledAmount) =
            _fillRfqOrderPrivate(
                order,
                signature,
                takerTokenFillAmount,
                msg.sender
            );
        // Must have filled exactly the amount requested.
        if (takerTokenFilledAmount < takerTokenFillAmount) {
            LibLimitOrdersRichErrors.FillOrKillFailedError(
                getRfqOrderHash(order),
                takerTokenFilledAmount,
                takerTokenFillAmount
            ).rrevert();
        }
        _refundProtocolFeeToSender(ethProtocolFeePaid);
    }

    /// @dev Fill a limit order. Internal variant. ETH protocol fees can be
    ///      attached to this call. Any unspent ETH will be refunded to
    ///      `msg.sender` (not `sender`).
    /// @param order The limit order.
    /// @param signature The order signature.
    /// @param takerTokenFillAmount Maximum taker token to fill this order with.
    /// @param taker The order taker.
    /// @param sender The order sender.
    /// @return takerTokenFilledAmount How much maker token was filled.
    /// @return makerTokenFilledAmount How much maker token was filled.
    function _fillLimitOrder(
        LibLimitOrder.LimitOrder memory order,
        LibSignature.Signature memory signature,
        uint128 takerTokenFillAmount,
        address taker,
        address sender
    )
        public
        override
        payable
        onlySelf
        returns (uint128 takerTokenFilledAmount, uint128 makerTokenFilledAmount)
    {
        uint256 ethProtocolFeePaid;
        (ethProtocolFeePaid, takerTokenFilledAmount, makerTokenFilledAmount) =
            _fillLimitOrderPrivate(FillLimitOrderPrivateParams({
                order: order,
                signature: signature,
                takerTokenFillAmount: takerTokenFillAmount,
                taker: taker,
                sender: sender
            }));
        _refundProtocolFeeToSender(ethProtocolFeePaid);
    }

    /// @dev Fill an RFQ order. Internal variant. ETH protocol fees can be
    ///      attached to this call. Any unspent ETH will be refunded to
    ///      `msg.sender` (not `sender`).
    /// @param order The RFQ order.
    /// @param signature The order signature.
    /// @param takerTokenFillAmount Maximum taker token to fill this order with.
    /// @param taker The order taker.
    /// @return takerTokenFilledAmount How much maker token was filled.
    /// @return makerTokenFilledAmount How much maker token was filled.
    function _fillRfqOrder(
        LibLimitOrder.RfqOrder memory order,
        LibSignature.Signature memory signature,
        uint128 takerTokenFillAmount,
        address taker
    )
        public
        override
        payable
        onlySelf
        returns (uint128 takerTokenFilledAmount, uint128 makerTokenFilledAmount)
    {
        uint256 ethProtocolFeePaid;
        (ethProtocolFeePaid, takerTokenFilledAmount, makerTokenFilledAmount) =
            _fillRfqOrderPrivate(
                order,
                signature,
                takerTokenFillAmount,
                taker
            );
        _refundProtocolFeeToSender(ethProtocolFeePaid);
    }


    /// @dev Cancel a single limit order. The caller must be the maker.
    ///      Silently succeeds if the order has already been cancelled.
    /// @param order The limit order.
    function cancelLimitOrder(LibLimitOrder.LimitOrder memory order)
        public
        override
    {
        bytes32 orderHash = getLimitOrderHash(order);
        if (msg.sender != order.maker) {
            LibLimitOrdersRichErrors.OnlyOrderMakerAllowed(
                orderHash,
                msg.sender,
                order.maker
            ).rrevert();
        }
        _cancelOrderHash(orderHash);
    }

    /// @dev Cancel a single RFQ order. The caller must be the maker.
    ///      Silently succeeds if the order has already been cancelled.
    /// @param order The RFQ order.
    function cancelRfqOrder(LibLimitOrder.RfqOrder memory order)
        public
        override
    {
        bytes32 orderHash = getRfqOrderHash(order);
        if (msg.sender != order.maker) {
            LibLimitOrdersRichErrors.OnlyOrderMakerAllowed(
                orderHash,
                msg.sender,
                order.maker
            ).rrevert();
        }
        _cancelOrderHash(orderHash);
    }

    /// @dev Cancel multiple limit orders. The caller must be the maker.
    ///      Silently succeeds if the order has already been cancelled.
    /// @param orders The limit orders.
    function batchCancelLimitOrders(LibLimitOrder.LimitOrder[] memory orders)
        public
        override
    {
        for (uint256 i = 0; i < orders.length; ++i) {
            cancelLimitOrder(orders[i]);
        }
    }

    /// @dev Cancel multiple RFQ orders. The caller must be the maker.
    ///      Silently succeeds if the order has already been cancelled.
    /// @param orders The RFQ orders.
    function batchCancelRfqOrders(LibLimitOrder.RfqOrder[] memory orders)
        public
        override
    {
        for (uint256 i = 0; i < orders.length; ++i) {
            cancelRfqOrder(orders[i]);
        }
    }

    /// @dev Cancel all orders for a given maker and pair with a salt less
    ///      than the value provided. The caller must be the maker. Subsequent
    ///      calls to this function with the same caller and pair require the
    ///      new salt to be >= the old salt.
    /// @param makerToken The maker token.
    /// @param takerToken The taker token.
    /// @param minValidSalt The new minimum valid salt.
    function cancelPairOrdersUpTo(
        IERC20TokenV06 makerToken,
        IERC20TokenV06 takerToken,
        uint256 minValidSalt
    )
        public
        override
    {
        LibLimitOrdersStorage.Storage storage stor =
            LibLimitOrdersStorage.getStorage();

        uint256 oldMinValidSalt =
            stor.makerToMakerTokenToTakerTokenToMinValidOrderSalt
                [msg.sender]
                [address(makerToken)]
                [address(takerToken)];

        // New min salt must >= the old one.
        if (oldMinValidSalt > minValidSalt) {
            LibLimitOrdersRichErrors.
                CancelSaltTooLowError(minValidSalt, oldMinValidSalt)
                    .rrevert();
        }

        stor.makerToMakerTokenToTakerTokenToMinValidOrderSalt
            [msg.sender]
            [address(makerToken)]
            [address(takerToken)] = minValidSalt;

        emit PairOrdersUpToCancelled(
            msg.sender,
            address(makerToken),
            address(takerToken),
            minValidSalt
        );
    }

    /// @dev Cancel all limit orders for a given maker and pair with a salt less
    ///      than the value provided. The caller must be the maker. Subsequent
    ///      calls to this function with the same caller and pair require the
    ///      new salt to be >= the old salt.
    /// @param makerTokens The maker tokens.
    /// @param takerTokens The taker tokens.
    /// @param minValidSalts The new minimum valid salts.
    function batchCancelPairOrdersUpTo(
        IERC20TokenV06[] memory makerTokens,
        IERC20TokenV06[] memory takerTokens,
        uint256[] memory minValidSalts
    )
        public
        override
    {
        require(
            makerTokens.length == takerTokens.length &&
            makerTokens.length == minValidSalts.length,
            "LimitOrdersFeature/MISMATCHED_PAIR_ORDERS_ARRAY_LENGTHS"
        );

        for (uint256 i = 0; i < makerTokens.length; ++i) {
            cancelPairOrdersUpTo(
                makerTokens[i],
                takerTokens[i],
                minValidSalts[i]
            );
        }
    }

    /// @dev Get the order info for a limit order.
    /// @param order The limit order.
    /// @return orderInfo Info about the order.
    function getLimitOrderInfo(LibLimitOrder.LimitOrder memory order)
        public
        override
        view
        returns (LibLimitOrder.OrderInfo memory orderInfo)
    {
        // Recover maker and compute order hash.
        orderInfo.orderHash = getLimitOrderHash(order);
        _populateCommonOrderInfoFields(
            orderInfo,
            order.maker,
            order.makerToken,
            order.takerToken,
            order.takerAmount,
            order.expiry,
            order.salt
        );
    }

    /// @dev Get the order info for an RFQ order.
    /// @param order The RFQ order.
    /// @return orderInfo Info about the order.
    function getRfqOrderInfo(LibLimitOrder.RfqOrder memory order)
        public
        override
        view
        returns (LibLimitOrder.OrderInfo memory orderInfo)
    {
        // Recover maker and compute order hash.
        orderInfo.orderHash = getRfqOrderHash(order);
        _populateCommonOrderInfoFields(
            orderInfo,
            order.maker,
            order.makerToken,
            order.takerToken,
            order.takerAmount,
            order.expiry,
            order.salt
        );
    }

    /// @dev Get the canonical hash of a limit order.
    /// @param order The limit order.
    /// @return orderHash The order hash.
    function getLimitOrderHash(LibLimitOrder.LimitOrder memory order)
        public
        override
        view
        returns (bytes32 orderHash)
    {
        return _getEIP712Hash(
            LibLimitOrder.getLimitOrderStructHash(order)
        );
    }

    /// @dev Get the canonical hash of an RFQ order.
    /// @param order The RFQ order.
    /// @return orderHash The order hash.
    function getRfqOrderHash(LibLimitOrder.RfqOrder memory order)
        public
        override
        view
        returns (bytes32 orderHash)
    {
        return _getEIP712Hash(
            LibLimitOrder.getRfqOrderStructHash(order)
        );
    }

    /// @dev Populate `status` and `takerTokenFilledAmount` fields in
    ///      `orderInfo`, which use the same code path for both limit and
    ///      RFQ orders.
    /// @param orderInfo `OrderInfo` with `orderHash` and `maker` filled.
    /// @param maker The order's maker.
    /// @param makerToken The order's maker token.
    /// @param takerToken The order's taker token.
    /// @param takerAmount The order's taker token amount..
    /// @param expiry The order's expiry.
    /// @param salt The order's salt.
    function _populateCommonOrderInfoFields(
        LibLimitOrder.OrderInfo memory orderInfo,
        address maker,
        IERC20TokenV06 makerToken,
        IERC20TokenV06 takerToken,
        uint128 takerAmount,
        uint64 expiry,
        uint256 salt
    )
        private
        view
    {
        LibLimitOrdersStorage.Storage storage stor =
            LibLimitOrdersStorage.getStorage();

        // Get the filled and direct cancel state.
        {
            // The high bit of the raw taker token filled amount will be set
            // if the order was cancelled.
            uint256 rawTakerTokenFilledAmount =
                stor.orderHashToTakerTokenFilledAmount[orderInfo.orderHash];
            orderInfo.takerTokenFilledAmount = uint128(rawTakerTokenFilledAmount);
            if (orderInfo.takerTokenFilledAmount >= takerAmount) {
                orderInfo.status = LibLimitOrder.OrderStatus.FILLED;
                return;
            }
            if (rawTakerTokenFilledAmount & HIGH_BIT != 0) {
                orderInfo.status = LibLimitOrder.OrderStatus.CANCELLED;
                return;
            }
        }

        // Check for expiration.
        if (expiry <= uint64(block.timestamp)) {
            orderInfo.status = LibLimitOrder.OrderStatus.EXPIRED;
            return;
        }

        // Check if the order was cancelled by salt.
        if (stor.makerToMakerTokenToTakerTokenToMinValidOrderSalt
                [maker]
                [address(makerToken)]
                [address(takerToken)] > salt)
        {
            orderInfo.status = LibLimitOrder.OrderStatus.CANCELLED;
            return;
        }
        orderInfo.status = LibLimitOrder.OrderStatus.FILLABLE;
    }

    /// @dev Cancel a limit or RFQ order directly by its order hash.
    /// @param orderHash The order's order hash.
    function _cancelOrderHash(bytes32 orderHash)
        private
    {
        LibLimitOrdersStorage.Storage storage stor =
            LibLimitOrdersStorage.getStorage();
        // Set the high bit on the raw taker token fill amount to indicate
        // a cancel. It's OK to cancel twice.
        stor.orderHashToTakerTokenFilledAmount[orderHash] |= HIGH_BIT;

        emit OrderCancelled(orderHash);
    }

    /// @dev Fill a limit order. Private variant. Does not refund protocol fees.
    /// @param params Function params.
    /// @return ethProtocolFeePaid How much protocol fee was paid.
    /// @return takerTokenFilledAmount How much maker token was filled.
    /// @return makerTokenFilledAmount How much maker token was filled.
    function _fillLimitOrderPrivate(FillLimitOrderPrivateParams memory params)
        private
        returns (
            uint256 ethProtocolFeePaid,
            uint128 takerTokenFilledAmount,
            uint128 makerTokenFilledAmount
        )
    {
        LibLimitOrder.OrderInfo memory orderInfo = getLimitOrderInfo(params.order);

        // Must be fillable.
        if (orderInfo.status != LibLimitOrder.OrderStatus.FILLABLE) {
            LibLimitOrdersRichErrors.OrderNotFillableError(
                orderInfo.orderHash,
                uint8(orderInfo.status)
            ).rrevert();
        }

        // Must be fillable by the taker.
        if (params.order.taker != address(0) && params.order.taker != params.taker) {
            LibLimitOrdersRichErrors.OrderNotFillableByTakerError(
                orderInfo.orderHash,
                params.taker,
                params.order.taker
            ).rrevert();
        }

        // Must be fillable by the sender.
        if (params.order.sender != address(0) && params.order.sender != params.sender) {
            LibLimitOrdersRichErrors.OrderNotFillableBySenderError(
                orderInfo.orderHash,
                params.sender,
                params.order.sender
            ).rrevert();
        }

        // Signature must be valid for the order.
        {
            address signer = LibSignature.getSignerOfHash(
                orderInfo.orderHash,
                params.signature
            );
            if (signer != params.order.maker) {
                LibLimitOrdersRichErrors.OrderNotSignedByMakerError(
                    orderInfo.orderHash,
                    signer,
                    params.order.maker
                ).rrevert();
            }
        }

        // Pay the protocol fee.
        ethProtocolFeePaid = _collectProtocolFee(params.order.pool, params.taker);

        // Settle between the maker and taker.
        (takerTokenFilledAmount, makerTokenFilledAmount) = _settleOrder(
            SettleOrderInfo({
                orderHash: orderInfo.orderHash,
                maker: params.order.maker,
                taker: params.taker,
                makerToken: IERC20TokenV06(params.order.makerToken),
                takerToken: IERC20TokenV06(params.order.takerToken),
                makerAmount: params.order.makerAmount,
                takerAmount: params.order.takerAmount,
                takerTokenFillAmount: params.takerTokenFillAmount,
                takerTokenFilledAmount: orderInfo.takerTokenFilledAmount
            })
        );

        // Pay the fee recipient.
        uint128 takerTokenFeeFilledAmount;
        if (params.order.takerTokenFeeAmount > 0) {
            takerTokenFeeFilledAmount = uint128(LibMathV06.getPartialAmountFloor(
                takerTokenFilledAmount,
                params.order.takerAmount,
                params.order.takerTokenFeeAmount
            ));
            LibTokenSpender.spendERC20Tokens(
                params.order.takerToken,
                params.taker,
                params.order.feeRecipient,
                uint256(takerTokenFeeFilledAmount)
            );
        }

        emit LimitOrderFilled(
            orderInfo.orderHash,
            params.order.maker,
            params.taker,
            params.order.feeRecipient,
            address(params.order.makerToken),
            address(params.order.takerToken),
            takerTokenFilledAmount,
            makerTokenFilledAmount,
            takerTokenFeeFilledAmount,
            params.order.pool
        );
    }

    /// @dev Fill an RFQ order. Private variant. Does not refund protocol fees.
    /// @param order The RFQ order.
    /// @param signature The order signature.
    /// @param takerTokenFillAmount Maximum taker token to fill this order with.
    /// @param taker The order taker.
    /// @return ethProtocolFeePaid How much protocol fee was paid.
    /// @return takerTokenFilledAmount How much maker token was filled.
    /// @return makerTokenFilledAmount How much maker token was filled.
    function _fillRfqOrderPrivate(
        LibLimitOrder.RfqOrder memory order,
        LibSignature.Signature memory signature,
        uint128 takerTokenFillAmount,
        address taker
    )
        private
        returns (
            uint256 ethProtocolFeePaid,
            uint128 takerTokenFilledAmount,
            uint128 makerTokenFilledAmount
        )
    {
        LibLimitOrder.OrderInfo memory orderInfo = getRfqOrderInfo(order);

        // Must be fillable.
        if (orderInfo.status != LibLimitOrder.OrderStatus.FILLABLE) {
            LibLimitOrdersRichErrors.OrderNotFillableError(
                orderInfo.orderHash,
                uint8(orderInfo.status)
            ).rrevert();
        }

        // Must be fillable by the tx.origin.
        if (order.txOrigin != address(0) && order.txOrigin != tx.origin) {
            LibLimitOrdersRichErrors.OrderNotFillableByOriginError(
                orderInfo.orderHash,
                tx.origin,
                order.txOrigin
            ).rrevert();
        }

        // Signature must be valid for the order.
        {
            address signer = LibSignature.getSignerOfHash(orderInfo.orderHash, signature);
            if (signer != order.maker) {
                LibLimitOrdersRichErrors.OrderNotSignedByMakerError(
                    orderInfo.orderHash,
                    signer,
                    order.maker
                ).rrevert();
            }
        }

        // Pay the protocol fee.
        ethProtocolFeePaid = _collectProtocolFee(order.pool, taker);

        // Settle between the maker and taker.
        (takerTokenFilledAmount, makerTokenFilledAmount) = _settleOrder(
            SettleOrderInfo({
                orderHash: orderInfo.orderHash,
                maker: order.maker,
                taker: taker,
                makerToken: IERC20TokenV06(order.makerToken),
                takerToken: IERC20TokenV06(order.takerToken),
                makerAmount: order.makerAmount,
                takerAmount: order.takerAmount,
                takerTokenFillAmount: takerTokenFillAmount,
                takerTokenFilledAmount: orderInfo.takerTokenFilledAmount
            })
        );

        emit RfqOrderFilled(
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

    /// @dev Settle the trade between an order's maker and taker.
    /// @param settleInfo Information needed to execute the settlement.
    /// @return takerTokenFilledAmount How much taker token was filled.
    /// @return makerTokenFilledAmount How much maker token was filled.
    function _settleOrder(SettleOrderInfo memory settleInfo)
        private
        returns (uint128 takerTokenFilledAmount, uint128 makerTokenFilledAmount)
    {
        // Clamp the taker token fill amount to the fillable amount.
        takerTokenFilledAmount = LibSafeMathV06.min128(
            settleInfo.takerTokenFillAmount,
            settleInfo.takerAmount.safeSub128(settleInfo.takerTokenFilledAmount)
        );
        // Compute the maker token amount.
        // This should never overflow because the values are all clamped to
        // (2^128-1).
        makerTokenFilledAmount = uint128(
            uint256(takerTokenFilledAmount)
            * uint256(settleInfo.makerAmount)
            / uint256(settleInfo.takerAmount)
        );

        if (takerTokenFilledAmount == 0 || makerTokenFilledAmount == 0) {
            // Nothing to do.
            return (0, 0);
        }

        // Update filled state for the order.
        LibLimitOrdersStorage
            .getStorage()
            .orderHashToTakerTokenFilledAmount[settleInfo.orderHash] =
            // OK to overwrite the whole word because we shouldn't get to this
            // function if the order is cancelled.
                settleInfo.takerTokenFilledAmount + takerTokenFilledAmount;

        // Transfer taker -> maker.
        LibTokenSpender.spendERC20Tokens(
            settleInfo.takerToken,
            settleInfo.taker,
            settleInfo.maker,
            takerTokenFilledAmount
        );

        // Transfer maker -> taker.
        LibTokenSpender.spendERC20Tokens(
            settleInfo.makerToken,
            settleInfo.maker,
            settleInfo.taker,
            makerTokenFilledAmount
        );
    }

    /// @dev Refund any leftover protocol fees in `msg.value` to `msg.sender`.
    /// @param ethProtocolFeePaid How much ETH was paid in protocol fees.
    function _refundProtocolFeeToSender(uint256 ethProtocolFeePaid)
        private
    {
        if (msg.value > ethProtocolFeePaid && msg.sender != address(this)) {
            uint256 refundAmount = msg.value.safeSub(ethProtocolFeePaid);
            (bool success,) = msg
                .sender
                .call{value: refundAmount}("");
            if (!success) {
                LibLimitOrdersRichErrors.ProtocolFeeRefundFailed(
                    msg.sender,
                    refundAmount
                ).rrevert();
            }
        }
    }
}
