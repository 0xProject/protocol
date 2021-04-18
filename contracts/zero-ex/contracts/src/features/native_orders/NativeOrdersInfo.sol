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

import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";
import "@0x/contracts-utils/contracts/src/v06/LibSafeMathV06.sol";
import "@0x/contracts-utils/contracts/src/v06/LibMathV06.sol";
import "../../fixins/FixinEIP712.sol";
import "../../fixins/FixinTokenSpender.sol";
import "../../storage/LibNativeOrdersStorage.sol";
import "../libs/LibSignature.sol";
import "../libs/LibNativeOrder.sol";


/// @dev Feature for getting info about limit and RFQ orders.
abstract contract NativeOrdersInfo is
    FixinEIP712,
    FixinTokenSpender
{
    using LibSafeMathV06 for uint256;
    using LibRichErrorsV06 for bytes;

    // @dev Params for `_getActualFillableTakerTokenAmount()`.
    struct GetActualFillableTakerTokenAmountParams {
        address maker;
        IERC20TokenV06 makerToken;
        uint128 orderMakerAmount;
        uint128 orderTakerAmount;
        LibNativeOrder.OrderInfo orderInfo;
    }

    // @dev Params for `_getTakerSignedOrderActualFillability()`.
    struct GetTakerSignedOrderActualFillabilityParams {
        address maker;
        address taker;
        IERC20TokenV06 makerToken;
        IERC20TokenV06 takerToken;
        uint128 orderMakerAmount;
        uint128 orderTakerAmount;
        LibNativeOrder.TakerSignedOrderInfo takerSignedOrderInfo;
    }

    /// @dev Highest bit of a uint256, used to flag cancelled orders.
    uint256 private constant HIGH_BIT = 1 << 255;

    constructor(
        address zeroExAddress
    )
        internal
        FixinEIP712(zeroExAddress)
    {
        // solhint-disable no-empty-blocks
    }

    /// @dev Get the order info for a limit order.
    /// @param order The limit order.
    /// @return orderInfo Info about the order.
    function getLimitOrderInfo(LibNativeOrder.LimitOrder memory order)
        public
        view
        returns (LibNativeOrder.OrderInfo memory orderInfo)
    {
        // Recover maker and compute order hash.
        orderInfo.orderHash = getLimitOrderHash(order);
        uint256 minValidSalt = LibNativeOrdersStorage.getStorage()
            .limitOrdersMakerToMakerTokenToTakerTokenToMinValidOrderSalt
                [order.maker]
                [address(order.makerToken)]
                [address(order.takerToken)];
        _populateCommonOrderInfoFields(
            orderInfo,
            order.takerAmount,
            order.expiry,
            order.salt,
            minValidSalt
        );
    }

    /// @dev Get the order info for an RFQ order.
    /// @param order The RFQ order.
    /// @return orderInfo Info about the order.
    function getRfqOrderInfo(LibNativeOrder.RfqOrder memory order)
        public
        view
        returns (LibNativeOrder.OrderInfo memory orderInfo)
    {
        // Recover maker and compute order hash.
        orderInfo.orderHash = getRfqOrderHash(order);
        uint256 minValidSalt = LibNativeOrdersStorage.getStorage()
            .rfqOrdersMakerToMakerTokenToTakerTokenToMinValidOrderSalt
                [order.maker]
                [address(order.makerToken)]
                [address(order.takerToken)];
        _populateCommonOrderInfoFields(
            orderInfo,
            order.takerAmount,
            order.expiry,
            order.salt,
            minValidSalt
        );

        // Check for missing txOrigin.
        if (order.txOrigin == address(0)) {
            orderInfo.status = LibNativeOrder.OrderStatus.INVALID;
        }
    }

    /// @dev Get the order info for a Taker Signed RFQ order.
    /// @param order The RFQ order.
    /// @return takerSignedOrderInfo Info about the order.
    function getTakerSignedRfqOrderInfo(LibNativeOrder.TakerSignedRfqOrder memory order)
        public
        view
        returns (LibNativeOrder.TakerSignedOrderInfo memory takerSignedOrderInfo)
    {
        // Recover maker and compute order hash.
        takerSignedOrderInfo.orderHash = getTakerSignedRfqOrderHash(order);
        _populateTakerSignedOrderInfoFields(
            takerSignedOrderInfo,
            order.expiry
        );

        // Check for missing taker.
        if (order.taker == address(0)) {
            takerSignedOrderInfo.status = LibNativeOrder.OrderStatus.INVALID;
        }
        // Check for missing txOrigin.
        if (order.txOrigin == address(0)) {
            takerSignedOrderInfo.status = LibNativeOrder.OrderStatus.INVALID;
        }
    }

    /// @dev Get the canonical hash of a limit order.
    /// @param order The limit order.
    /// @return orderHash The order hash.
    function getLimitOrderHash(LibNativeOrder.LimitOrder memory order)
        public
        view
        returns (bytes32 orderHash)
    {
        return _getEIP712Hash(
            LibNativeOrder.getLimitOrderStructHash(order)
        );
    }

    /// @dev Get the canonical hash of an RFQ order.
    /// @param order The RFQ order.
    /// @return orderHash The order hash.
    function getRfqOrderHash(LibNativeOrder.RfqOrder memory order)
        public
        view
        returns (bytes32 orderHash)
    {
        return _getEIP712Hash(
            LibNativeOrder.getRfqOrderStructHash(order)
        );
    }

    /// @dev Get the canonical hash of a Taker Signed RFQ order.
    /// @param order The taker signed RFQ order.
    /// @return orderHash The order hash.
    function getTakerSignedRfqOrderHash(LibNativeOrder.TakerSignedRfqOrder memory order)
        public
        view
        returns (bytes32 orderHash)
    {
        return _getEIP712Hash(
            LibNativeOrder.getTakerSignedRfqOrderStructHash(order)
        );
    }

    /// @dev Get order info, fillable amount, and signature validity for a limit order.
    ///      Fillable amount is determined using balances and allowances of the maker.
    /// @param order The limit order.
    /// @param signature The order signature.
    /// @return orderInfo Info about the order.
    /// @return actualFillableTakerTokenAmount How much of the order is fillable
    ///         based on maker funds, in taker tokens.
    /// @return isSignatureValid Whether the signature is valid.
    function getLimitOrderRelevantState(
        LibNativeOrder.LimitOrder memory order,
        LibSignature.Signature calldata signature
    )
        public
        view
        returns (
            LibNativeOrder.OrderInfo memory orderInfo,
            uint128 actualFillableTakerTokenAmount,
            bool isSignatureValid
        )
    {
        orderInfo = getLimitOrderInfo(order);
        actualFillableTakerTokenAmount = _getActualFillableTakerTokenAmount(
            GetActualFillableTakerTokenAmountParams({
                maker: order.maker,
                makerToken: order.makerToken,
                orderMakerAmount: order.makerAmount,
                orderTakerAmount: order.takerAmount,
                orderInfo: orderInfo
            })
        );
        isSignatureValid = order.maker ==
            LibSignature.getSignerOfHash(orderInfo.orderHash, signature);
    }

    /// @dev Get order info, fillable amount, and signature validity for an RFQ order.
    ///      Fillable amount is determined using balances and allowances of the maker.
    /// @param order The RFQ order.
    /// @param signature The order signature.
    /// @return orderInfo Info about the order.
    /// @return actualFillableTakerTokenAmount How much of the order is fillable
    ///         based on maker funds, in taker tokens.
    /// @return isSignatureValid Whether the signature is valid.
    function getRfqOrderRelevantState(
        LibNativeOrder.RfqOrder memory order,
        LibSignature.Signature memory signature
    )
        public
        view
        returns (
            LibNativeOrder.OrderInfo memory orderInfo,
            uint128 actualFillableTakerTokenAmount,
            bool isSignatureValid
        )
    {
        orderInfo = getRfqOrderInfo(order);
        actualFillableTakerTokenAmount = _getActualFillableTakerTokenAmount(
            GetActualFillableTakerTokenAmountParams({
                maker: order.maker,
                makerToken: order.makerToken,
                orderMakerAmount: order.makerAmount,
                orderTakerAmount: order.takerAmount,
                orderInfo: orderInfo
            })
        );
        isSignatureValid = order.maker ==
            LibSignature.getSignerOfHash(orderInfo.orderHash, signature);
    }

    /// @dev Get order fillability and signature validity for a Taker Signed RFQ order.
    ///      Fillable amount is determined using balances and allowances of the maker.
    /// @param order The RFQ order.
    /// @param makerSignature The order signature from the maker.
    /// @param takerSignature The order signature from the taker.
    /// @return takerSignedOrderInfo Info about the order.
    /// @return fillable Bool
    /// @return isMakerSignatureValid Whether the maker signature is valid.
    /// @return isTakerSignatureValid Whether the taker signature is valid.
    function getTakerSignedRfqOrderRelevantState(
        LibNativeOrder.TakerSignedRfqOrder memory order,
        LibSignature.Signature memory makerSignature,
        LibSignature.Signature memory takerSignature
    )
        public
        view
        returns (
            LibNativeOrder.TakerSignedOrderInfo memory takerSignedOrderInfo,
            bool fillable,
            bool isMakerSignatureValid,
            bool isTakerSignatureValid
        )
    {
        takerSignedOrderInfo = getTakerSignedRfqOrderInfo(order);
        fillable = _getTakerSignedOrderActualFillability(
            GetTakerSignedOrderActualFillabilityParams({
                maker: order.maker,
                taker: order.maker,
                makerToken: order.makerToken,
                takerToken: order.takerToken,
                orderMakerAmount: order.makerAmount,
                orderTakerAmount: order.takerAmount,
                takerSignedOrderInfo: takerSignedOrderInfo
            })
        );
        isMakerSignatureValid = order.maker ==
            LibSignature.getSignerOfHash(takerSignedOrderInfo.orderHash, makerSignature);
        isTakerSignatureValid = order.taker ==
            LibSignature.getSignerOfHash(takerSignedOrderInfo.orderHash, takerSignature);
    }

    /// @dev Batch version of `getLimitOrderRelevantState()`, without reverting.
    ///      Orders that would normally cause `getLimitOrderRelevantState()`
    ///      to revert will have empty results.
    /// @param orders The limit orders.
    /// @param signatures The order signatures.
    /// @return orderInfos Info about the orders.
    /// @return actualFillableTakerTokenAmounts How much of each order is fillable
    ///         based on maker funds, in taker tokens.
    /// @return isSignatureValids Whether each signature is valid for the order.
    function batchGetLimitOrderRelevantStates(
        LibNativeOrder.LimitOrder[] calldata orders,
        LibSignature.Signature[] calldata signatures
    )
        external
        view
        returns (
            LibNativeOrder.OrderInfo[] memory orderInfos,
            uint128[] memory actualFillableTakerTokenAmounts,
            bool[] memory isSignatureValids
        )
    {
        require(
            orders.length == signatures.length,
            "NativeOrdersFeature/MISMATCHED_ARRAY_LENGTHS"
        );
        orderInfos = new LibNativeOrder.OrderInfo[](orders.length);
        actualFillableTakerTokenAmounts = new uint128[](orders.length);
        isSignatureValids = new bool[](orders.length);
        for (uint256 i = 0; i < orders.length; ++i) {
            try
                this.getLimitOrderRelevantState(orders[i], signatures[i])
                    returns (
                        LibNativeOrder.OrderInfo memory orderInfo,
                        uint128 actualFillableTakerTokenAmount,
                        bool isSignatureValid
                    )
            {
                orderInfos[i] = orderInfo;
                actualFillableTakerTokenAmounts[i] = actualFillableTakerTokenAmount;
                isSignatureValids[i] = isSignatureValid;
            }
            catch {}
        }
    }

    /// @dev Batch version of `getRfqOrderRelevantState()`, without reverting.
    ///      Orders that would normally cause `getRfqOrderRelevantState()`
    ///      to revert will have empty results.
    /// @param orders The RFQ orders.
    /// @param signatures The order signatures.
    /// @return orderInfos Info about the orders.
    /// @return actualFillableTakerTokenAmounts How much of each order is fillable
    ///         based on maker funds, in taker tokens.
    /// @return isSignatureValids Whether each signature is valid for the order.
    function batchGetRfqOrderRelevantStates(
        LibNativeOrder.RfqOrder[] calldata orders,
        LibSignature.Signature[] calldata signatures
    )
        external
        view
        returns (
            LibNativeOrder.OrderInfo[] memory orderInfos,
            uint128[] memory actualFillableTakerTokenAmounts,
            bool[] memory isSignatureValids
        )
    {
        require(
            orders.length == signatures.length,
            "NativeOrdersFeature/MISMATCHED_ARRAY_LENGTHS"
        );
        orderInfos = new LibNativeOrder.OrderInfo[](orders.length);
        actualFillableTakerTokenAmounts = new uint128[](orders.length);
        isSignatureValids = new bool[](orders.length);
        for (uint256 i = 0; i < orders.length; ++i) {
            try
                this.getRfqOrderRelevantState(orders[i], signatures[i])
                    returns (
                        LibNativeOrder.OrderInfo memory orderInfo,
                        uint128 actualFillableTakerTokenAmount,
                        bool isSignatureValid
                    )
            {
                orderInfos[i] = orderInfo;
                actualFillableTakerTokenAmounts[i] = actualFillableTakerTokenAmount;
                isSignatureValids[i] = isSignatureValid;
            }
            catch {}
        }
    }

    /// @dev Populate `status` and `takerTokenFilledAmount` fields in
    ///      `orderInfo`, which use the same code path for both limit and
    ///      RFQ orders.
    /// @param orderInfo `OrderInfo` with `orderHash` and `maker` filled.
    /// @param takerAmount The order's taker token amount..
    /// @param expiry The order's expiry.
    /// @param salt The order's salt.
    /// @param salt The minimum valid salt for the maker and pair combination.
    function _populateCommonOrderInfoFields(
        LibNativeOrder.OrderInfo memory orderInfo,
        uint128 takerAmount,
        uint64 expiry,
        uint256 salt,
        uint256 minValidSalt
    )
        private
        view
    {
        LibNativeOrdersStorage.Storage storage stor =
            LibNativeOrdersStorage.getStorage();

        // Get the filled and direct cancel state.
        {
            // The high bit of the raw taker token filled amount will be set
            // if the order was cancelled.
            uint256 rawTakerTokenFilledAmount =
                stor.orderHashToTakerTokenFilledAmount[orderInfo.orderHash];
            orderInfo.takerTokenFilledAmount = uint128(rawTakerTokenFilledAmount);
            if (orderInfo.takerTokenFilledAmount >= takerAmount) {
                orderInfo.status = LibNativeOrder.OrderStatus.FILLED;
                return;
            }
            if (rawTakerTokenFilledAmount & HIGH_BIT != 0) {
                orderInfo.status = LibNativeOrder.OrderStatus.CANCELLED;
                return;
            }
        }

        // Check for expiration.
        if (expiry <= uint64(block.timestamp)) {
            orderInfo.status = LibNativeOrder.OrderStatus.EXPIRED;
            return;
        }

        // Check if the order was cancelled by salt.
        if (minValidSalt > salt) {
            orderInfo.status = LibNativeOrder.OrderStatus.CANCELLED;
            return;
        }
        orderInfo.status = LibNativeOrder.OrderStatus.FILLABLE;
    }

    /// @dev Populate `status` and `takerTokenFilledAmount` fields in
    ///      `orderInfo`.
    /// @param takerSignedOrderInfo `OrderInfo` with `orderHash` and `maker` filled.
    /// @param expiry The order's expiry.
    function _populateTakerSignedOrderInfoFields(
        LibNativeOrder.TakerSignedOrderInfo memory takerSignedOrderInfo,
        uint64 expiry
    )
        private
        view
    {
        LibNativeOrdersStorage.Storage storage stor =
            LibNativeOrdersStorage.getStorage();

        // Get the filled state.
        if (stor.orderHashToFilledBool[takerSignedOrderInfo.orderHash]) {
            takerSignedOrderInfo.status = LibNativeOrder.OrderStatus.FILLED;
            return;
        }

        // Check for expiration.
        if (expiry <= uint64(block.timestamp)) {
            takerSignedOrderInfo.status = LibNativeOrder.OrderStatus.EXPIRED;
            return;
        }

        takerSignedOrderInfo.status = LibNativeOrder.OrderStatus.FILLABLE;
    }

    /// @dev Calculate the actual fillable taker token amount of an order
    ///      based on maker allowance and balances.
    function _getActualFillableTakerTokenAmount(
        GetActualFillableTakerTokenAmountParams memory params
    )
        private
        view
        returns (uint128 actualFillableTakerTokenAmount)
    {
        if (params.orderMakerAmount == 0 || params.orderTakerAmount == 0) {
            // Empty order.
            return 0;
        }
        if (params.orderInfo.status != LibNativeOrder.OrderStatus.FILLABLE) {
            // Not fillable.
            return 0;
        }

        // Get the fillable maker amount based on the order quantities and
        // previously filled amount
        uint256 fillableMakerTokenAmount = LibMathV06.getPartialAmountFloor(
            uint256(
                params.orderTakerAmount
                - params.orderInfo.takerTokenFilledAmount
            ),
            uint256(params.orderTakerAmount),
            uint256(params.orderMakerAmount)
        );
        // Clamp it to the amount of maker tokens we can spend on behalf of the
        // maker.
        fillableMakerTokenAmount = LibSafeMathV06.min256(
            fillableMakerTokenAmount,
            _getSpendableERC20BalanceOf(params.makerToken, params.maker)
        );
        // Convert to taker token amount.
        return LibMathV06.getPartialAmountCeil(
            fillableMakerTokenAmount,
            uint256(params.orderMakerAmount),
            uint256(params.orderTakerAmount)
        ).safeDowncastToUint128();
    }

    /// @dev Calculate fillability based on actual maker/taker allowance
    ///      and balances.
    function _getTakerSignedOrderActualFillability(
        GetTakerSignedOrderActualFillabilityParams memory params
    )
        private
        view
        returns (bool fillable)
    {
        if (params.orderMakerAmount == 0 || params.orderTakerAmount == 0) {
            // Empty order.
            return false;
        }
        if (params.takerSignedOrderInfo.status != LibNativeOrder.OrderStatus.FILLABLE) {
            // Not fillable.
            return false;
        }

        uint256 makerSpendableAmount = _getSpendableERC20BalanceOf(params.makerToken, params.maker);
        uint256 takerSpendableAmount = _getSpendableERC20BalanceOf(params.takerToken, params.taker);
        return (makerSpendableAmount >= params.orderMakerAmount && takerSpendableAmount >= params.orderTakerAmount);
    } 
}
