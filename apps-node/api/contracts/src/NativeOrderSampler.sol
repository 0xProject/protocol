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

pragma solidity ^0.6;
pragma experimental ABIEncoderV2;

import "@0x/contracts-erc20/contracts/src/v06/LibERC20TokenV06.sol";
import "@0x/contracts-utils/contracts/src/v06/LibMathV06.sol";
import "@0x/contracts-utils/contracts/src/v06/LibBytesV06.sol";
import "@0x/contracts-utils/contracts/src/v06/LibSafeMathV06.sol";

interface IExchange {
    enum OrderStatus {
        INVALID,
        FILLABLE,
        FILLED,
        CANCELLED,
        EXPIRED
    }

    /// @dev A standard OTC or OO limit order.
    struct LimitOrder {
        IERC20TokenV06 makerToken;
        IERC20TokenV06 takerToken;
        uint128 makerAmount;
        uint128 takerAmount;
        uint128 takerTokenFeeAmount;
        address maker;
        address taker;
        address sender;
        address feeRecipient;
        bytes32 pool;
        uint64 expiry;
        uint256 salt;
    }

    /// @dev An RFQ limit order.
    struct RfqOrder {
        IERC20TokenV06 makerToken;
        IERC20TokenV06 takerToken;
        uint128 makerAmount;
        uint128 takerAmount;
        address maker;
        address taker;
        address txOrigin;
        bytes32 pool;
        uint64 expiry;
        uint256 salt;
    }

    /// @dev Info on a limit or RFQ order.
    struct OrderInfo {
        bytes32 orderHash;
        OrderStatus status;
        uint128 takerTokenFilledAmount;
    }

    /// @dev Allowed signature types.
    enum SignatureType {
        ILLEGAL,
        INVALID,
        EIP712,
        ETHSIGN
    }

    /// @dev Encoded EC signature.
    struct Signature {
        // How to validate the signature.
        SignatureType signatureType;
        // EC Signature data.
        uint8 v;
        // EC Signature data.
        bytes32 r;
        // EC Signature data.
        bytes32 s;
    }

    /// @dev Get the order info for a limit order.
    /// @param order The limit order.
    /// @return orderInfo Info about the order.
    function getLimitOrderInfo(LimitOrder memory order) external view returns (OrderInfo memory orderInfo);

    /// @dev Get order info, fillable amount, and signature validity for a limit order.
    ///      Fillable amount is determined using balances and allowances of the maker.
    /// @param order The limit order.
    /// @param signature The order signature.
    /// @return orderInfo Info about the order.
    /// @return actualFillableTakerTokenAmount How much of the order is fillable
    ///         based on maker funds, in taker tokens.
    /// @return isSignatureValid Whether the signature is valid.
    function getLimitOrderRelevantState(
        LimitOrder memory order,
        Signature calldata signature
    ) external view returns (OrderInfo memory orderInfo, uint128 actualFillableTakerTokenAmount, bool isSignatureValid);
}

contract NativeOrderSampler {
    using LibSafeMathV06 for uint256;
    using LibBytesV06 for bytes;

    /// @dev Gas limit for calls to `getOrderFillableTakerAmount()`.
    uint256 internal constant DEFAULT_CALL_GAS = 200e3; // 200k

    /// @dev Queries the fillable taker asset amounts of native orders.
    ///      Effectively ignores orders that have empty signatures or
    ///      maker/taker asset amounts (returning 0).
    /// @param orders Native limit orders to query.
    /// @param orderSignatures Signatures for each respective order in `orders`.
    /// @param exchange The V4 exchange.
    /// @return orderFillableTakerAssetAmounts How much taker asset can be filled
    ///         by each order in `orders`.
    function getLimitOrderFillableTakerAssetAmounts(
        IExchange.LimitOrder[] memory orders,
        IExchange.Signature[] memory orderSignatures,
        IExchange exchange
    ) public view returns (uint256[] memory orderFillableTakerAssetAmounts) {
        orderFillableTakerAssetAmounts = new uint256[](orders.length);
        for (uint256 i = 0; i != orders.length; i++) {
            try
                this.getLimitOrderFillableTakerAmount{gas: DEFAULT_CALL_GAS}(orders[i], orderSignatures[i], exchange)
            returns (uint256 amount) {
                orderFillableTakerAssetAmounts[i] = amount;
            } catch (bytes memory) {
                // Swallow failures, leaving all results as zero.
                orderFillableTakerAssetAmounts[i] = 0;
            }
        }
    }

    /// @dev Queries the fillable taker asset amounts of native orders.
    ///      Effectively ignores orders that have empty signatures or
    /// @param orders Native orders to query.
    /// @param orderSignatures Signatures for each respective order in `orders`.
    /// @param exchange The V4 exchange.
    /// @return orderFillableMakerAssetAmounts How much maker asset can be filled
    ///         by each order in `orders`.
    function getLimitOrderFillableMakerAssetAmounts(
        IExchange.LimitOrder[] memory orders,
        IExchange.Signature[] memory orderSignatures,
        IExchange exchange
    ) public view returns (uint256[] memory orderFillableMakerAssetAmounts) {
        orderFillableMakerAssetAmounts = getLimitOrderFillableTakerAssetAmounts(orders, orderSignatures, exchange);
        // `orderFillableMakerAssetAmounts` now holds taker asset amounts, so
        // convert them to maker asset amounts.
        for (uint256 i = 0; i < orders.length; ++i) {
            if (orderFillableMakerAssetAmounts[i] != 0) {
                orderFillableMakerAssetAmounts[i] = LibMathV06.getPartialAmountCeil(
                    orderFillableMakerAssetAmounts[i],
                    orders[i].takerAmount,
                    orders[i].makerAmount
                );
            }
        }
    }

    /// @dev Get the fillable taker amount of an order, taking into account
    ///      order state, maker fees, and maker balances.
    function getLimitOrderFillableTakerAmount(
        IExchange.LimitOrder memory order,
        IExchange.Signature memory signature,
        IExchange exchange
    ) public view virtual returns (uint256 fillableTakerAmount) {
        if (
            signature.signatureType == IExchange.SignatureType.ILLEGAL ||
            signature.signatureType == IExchange.SignatureType.INVALID ||
            order.makerAmount == 0 ||
            order.takerAmount == 0
        ) {
            return 0;
        }

        (IExchange.OrderInfo memory orderInfo, uint128 remainingFillableTakerAmount, bool isSignatureValid) = exchange
            .getLimitOrderRelevantState(order, signature);

        if (
            orderInfo.status != IExchange.OrderStatus.FILLABLE ||
            !isSignatureValid ||
            order.makerToken == IERC20TokenV06(0)
        ) {
            return 0;
        }

        fillableTakerAmount = uint256(remainingFillableTakerAmount);
    }
}
