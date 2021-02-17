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

import "@0x/contracts-utils/contracts/src/v06/errors/LibRichErrorsV06.sol";
import "@0x/contracts-utils/contracts/src/v06/LibSafeMathV06.sol";
import "@0x/contracts-utils/contracts/src/v06/LibMathV06.sol";
import "../errors/LibNativeOrdersRichErrors.sol";
import "../fixins/FixinCommon.sol";
import "../fixins/FixinEIP712.sol";
import "../migrations/LibMigrate.sol";
import "./interfaces/IFeature.sol";
import "./interfaces/IBatchFillNativeOrdersFeature.sol";
import "./interfaces/INativeOrdersFeature.sol";
import "./libs/LibNativeOrder.sol";
import "./libs/LibSignature.sol";


/// @dev Feature for batch/market filling limit and RFQ orders.
contract BatchFillNativeOrdersFeature is
    IFeature,
    IBatchFillNativeOrdersFeature,
    FixinCommon,
    FixinEIP712
{
    using LibSafeMathV06 for uint128;
    using LibSafeMathV06 for uint256;
    using LibRichErrorsV06 for bytes;

    /// @dev Name of this feature.
    string public constant override FEATURE_NAME = "BatchFill";
    /// @dev Version of this feature.
    uint256 public immutable override FEATURE_VERSION = _encodeVersion(1, 0, 0);

    constructor(address zeroExAddress)
        internal
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
        _registerFeatureFunction(this.batchFillLimitOrders.selector);
        _registerFeatureFunction(this.batchFillRfqOrders.selector);
        _registerFeatureFunction(this.marketSellLimitOrders.selector);
        _registerFeatureFunction(this.marketSellRfqOrders.selector);
        _registerFeatureFunction(this.marketBuyLimitOrders.selector);
        _registerFeatureFunction(this.marketBuyRfqOrders.selector);
        return LibMigrate.MIGRATE_SUCCESS;
    }

    /// @dev Fills multiple limit orders.
    /// @param orders Array of limit orders.
    /// @param signatures Array of signatures corresponding to each order.
    /// @param takerTokenFillAmounts Array of desired amounts to fill each order.
    /// @param revertIfIncomplete If true, reverts if this function fails to
    ///        fill the full fill amount for any individual order.
    /// @return takerTokenFilledAmounts Array of amounts filled, in taker token.
    /// @return makerTokenFilledAmounts Array of amounts filled, in maker token.
    function batchFillLimitOrders(
        LibNativeOrder.LimitOrder[] calldata orders,
        LibSignature.Signature[] calldata signatures,
        uint128[] calldata takerTokenFillAmounts,
        bool revertIfIncomplete
    )
        external
        payable
        override
        returns (
            uint128[] memory takerTokenFilledAmounts,
            uint128[] memory makerTokenFilledAmounts
        )
    {
        takerTokenFilledAmounts = new uint128[](orders.length);
        makerTokenFilledAmounts = new uint128[](orders.length);
        uint256 protocolFee = uint256(INativeOrdersFeature(address(this)).getProtocolFeeMultiplier())
            .safeMul(tx.gasprice);
        uint256 ethProtocolFeePaid;
        for (uint256 i = 0; i != orders.length; i++) {
            try
                INativeOrdersFeature(address(this))._fillLimitOrder
                    (
                        orders[i],
                        signatures[i],
                        takerTokenFillAmounts[i],
                        msg.sender,
                        msg.sender
                    )
                returns (uint128 takerTokenFilledAmount, uint128 makerTokenFilledAmount)
            {
                // Update amounts filled.
                (takerTokenFilledAmounts[i], makerTokenFilledAmounts[i]) =
                    (takerTokenFilledAmount, makerTokenFilledAmount);
                ethProtocolFeePaid = ethProtocolFeePaid.safeAdd(protocolFee);
            } catch {}

            if (
                revertIfIncomplete &&
                takerTokenFilledAmounts[i] < takerTokenFillAmounts[i]
            ) {
                bytes32 orderHash = _getEIP712Hash(
                    LibNativeOrder.getLimitOrderStructHash(orders[i])
                );
                // Did not fill the amount requested.
                LibNativeOrdersRichErrors.FillOrKillFailedError(
                    orderHash,
                    takerTokenFilledAmounts[i],
                    takerTokenFillAmounts[i]
                ).rrevert();
            }
        }
        _refundExcessProtocolFeeToSender(ethProtocolFeePaid);
    }

    /// @dev Fills multiple RFQ orders.
    /// @param orders Array of RFQ orders.
    /// @param signatures Array of signatures corresponding to each order.
    /// @param takerTokenFillAmounts Array of desired amounts to fill each order.
    /// @param revertIfIncomplete If true, reverts if this function fails to
    ///        fill the full fill amount for any individual order.
    /// @return takerTokenFilledAmounts Array of amounts filled, in taker token.
    /// @return makerTokenFilledAmounts Array of amounts filled, in maker token.
    function batchFillRfqOrders(
        LibNativeOrder.RfqOrder[] calldata orders,
        LibSignature.Signature[] calldata signatures,
        uint128[] calldata takerTokenFillAmounts,
        bool revertIfIncomplete
    )
        external
        override
        returns (
            uint128[] memory takerTokenFilledAmounts,
            uint128[] memory makerTokenFilledAmounts
        )
    {
        takerTokenFilledAmounts = new uint128[](orders.length);
        makerTokenFilledAmounts = new uint128[](orders.length);
        for (uint256 i = 0; i != orders.length; i++) {
            try
                INativeOrdersFeature(address(this))._fillRfqOrder
                    (
                        orders[i],
                        signatures[i],
                        takerTokenFillAmounts[i],
                        msg.sender
                    )
                returns (uint128 takerTokenFilledAmount, uint128 makerTokenFilledAmount)
            {
                // Update amounts filled.
                (takerTokenFilledAmounts[i], makerTokenFilledAmounts[i]) =
                    (takerTokenFilledAmount, makerTokenFilledAmount);
            } catch {}

            if (
                revertIfIncomplete &&
                takerTokenFilledAmounts[i] < takerTokenFillAmounts[i]
            ) {
                // Did not fill the amount requested.
                bytes32 orderHash = _getEIP712Hash(
                    LibNativeOrder.getRfqOrderStructHash(orders[i])
                );
                LibNativeOrdersRichErrors.FillOrKillFailedError(
                    orderHash,
                    takerTokenFilledAmounts[i],
                    takerTokenFillAmounts[i]
                ).rrevert();
            }
        }
    }

    /// @dev Fills the given limit orders by selling up to the given
    ///      amount of taker token.
    /// @param orders Array of limit orders.
    /// @param signatures Array of signatures corresponding to each order.
    /// @param takerTokenSellAmount The total amount of taker token to sell.
    /// @param revertIfIncomplete If true, reverts if this function fails to
    ///        fill the full sell amount.
    /// @return takerTokenSoldAmount The total amount of taker token sold.
    /// @return makerTokenBoughtAmount The total amount of maker token bought.
    function marketSellLimitOrders(
        LibNativeOrder.LimitOrder[] calldata orders,
        LibSignature.Signature[] calldata signatures,
        uint128 takerTokenSellAmount,
        bool revertIfIncomplete
    )
        external
        payable
        override
        returns (
            uint128 takerTokenSoldAmount,
            uint128 makerTokenBoughtAmount
        )
    {
        uint256 protocolFee = uint256(INativeOrdersFeature(address(this)).getProtocolFeeMultiplier())
            .safeMul(tx.gasprice);
        uint256 ethProtocolFeePaid;
        for (uint256 i = 0; i != orders.length; i++) {
            // Calculate the remaining amount of takerAsset to sell.
            uint128 remainingSellAmount =
                takerTokenSellAmount.safeSub128(takerTokenSoldAmount);
            // Attempt to sell the remaining amount of takerAsset.
            try
                INativeOrdersFeature(address(this))._fillLimitOrder
                    (
                        orders[i],
                        signatures[i],
                        remainingSellAmount,
                        msg.sender,
                        msg.sender
                    )
                returns (uint128 takerTokenFilledAmount, uint128 makerTokenFilledAmount)
            {
                // Update amounts filled.
                takerTokenSoldAmount = takerTokenSoldAmount.safeAdd128(takerTokenFilledAmount);
                makerTokenBoughtAmount = makerTokenBoughtAmount.safeAdd128(makerTokenFilledAmount);
                ethProtocolFeePaid = ethProtocolFeePaid.safeAdd(protocolFee);
            } catch {}
            // Stop execution if the entire amount has been sold.
            if (takerTokenSoldAmount >= takerTokenSellAmount) {
                break;
            }
        }
        if (
            revertIfIncomplete &&
            takerTokenSoldAmount < takerTokenSellAmount
        ) {
            // Did not fill the amount requested.
            LibNativeOrdersRichErrors.IncompleteMarketFillError(
                LibNativeOrdersRichErrors.IncompleteMarketFillErrorCode.MARKET_SELL_LIMIT_ORDERS,
                takerTokenSellAmount,
                takerTokenSoldAmount
            ).rrevert();
        }
        _refundExcessProtocolFeeToSender(ethProtocolFeePaid);
    }

    /// @dev Fills the given RFQ orders by selling up to the given
    ///      amount of taker token.
    /// @param orders Array of RFQ orders.
    /// @param signatures Array of signatures corresponding to each order.
    /// @param takerTokenSellAmount The total amount of taker token to sell.
    /// @param revertIfIncomplete If true, reverts if this function fails to
    ///        fill the full sell amount.
    /// @return takerTokenSoldAmount The total amount of taker token sold.
    /// @return makerTokenBoughtAmount The total amount of maker token bought.
    function marketSellRfqOrders(
        LibNativeOrder.RfqOrder[] calldata orders,
        LibSignature.Signature[] calldata signatures,
        uint128 takerTokenSellAmount,
        bool revertIfIncomplete
    )
        external
        override
        returns (
            uint128 takerTokenSoldAmount,
            uint128 makerTokenBoughtAmount
        )
    {
        for (uint256 i = 0; i != orders.length; i++) {
            // Calculate the remaining amount of taker token to sell.
            uint128 remainingSellAmount =
                takerTokenSellAmount.safeSub128(takerTokenSoldAmount);
            // Attempt to sell the remaining amount of taker token.
            try
                INativeOrdersFeature(address(this))._fillRfqOrder
                    (
                        orders[i],
                        signatures[i],
                        remainingSellAmount,
                        msg.sender
                    )
                returns (uint128 takerTokenFilledAmount, uint128 makerTokenFilledAmount)
            {
                // Update amounts filled.
                takerTokenSoldAmount = takerTokenSoldAmount.safeAdd128(takerTokenFilledAmount);
                makerTokenBoughtAmount = makerTokenBoughtAmount.safeAdd128(makerTokenFilledAmount);
            } catch {}
            // Stop execution if the entire amount has been sold.
            if (takerTokenSoldAmount >= takerTokenSellAmount) {
                break;
            }
        }
        if (
            revertIfIncomplete &&
            takerTokenSoldAmount < takerTokenSellAmount
        ) {
            // Did not fill the amount requested.
            LibNativeOrdersRichErrors.IncompleteMarketFillError(
                LibNativeOrdersRichErrors.IncompleteMarketFillErrorCode.MARKET_SELL_RFQ_ORDERS,
                takerTokenSellAmount,
                takerTokenSoldAmount
            ).rrevert();
        }
    }

    /// @dev Fills the given limit orders by buying up to the given
    ///      amount of maker token.
    /// @param orders Array of limit orders.
    /// @param signatures Array of signatures corresponding to each order.
    /// @param makerTokenBuyAmount The total amount of maker token to buy.
    /// @param revertIfIncomplete If true, reverts if this function fails to
    ///        fill the full buy amount.
    /// @return takerTokenSoldAmount The total amount of taker token sold.
    /// @return makerTokenBoughtAmount The total amount of maker token bought.
    function marketBuyLimitOrders(
        LibNativeOrder.LimitOrder[] calldata orders,
        LibSignature.Signature[] calldata signatures,
        uint128 makerTokenBuyAmount,
        bool revertIfIncomplete
    )
        external
        payable
        override
        returns (
            uint128 takerTokenSoldAmount,
            uint128 makerTokenBoughtAmount
        )
    {
        uint256 protocolFee = uint256(INativeOrdersFeature(address(this)).getProtocolFeeMultiplier())
            .safeMul(tx.gasprice);
        uint256 ethProtocolFeePaid;
        for (uint256 i = 0; i != orders.length; i++) {
            // Calculate the remaining amount of maker token to buy.
            uint128 remainingMakerTokenBuyAmount =
                makerTokenBuyAmount.safeSub128(makerTokenBoughtAmount);
            // Convert the remaining amount of maker token to buy into
            // remaining amount of taker token to sell.
            uint128 takerTokenFillAmount = LibMathV06.getPartialAmountCeil(
                orders[i].takerAmount,
                orders[i].makerAmount,
                remainingMakerTokenBuyAmount
            ).safeDowncastToUint128();
            // Attempt to sell the remaining amount of taker token.
            try
                INativeOrdersFeature(address(this))._fillLimitOrder
                    (
                        orders[i],
                        signatures[i],
                        takerTokenFillAmount,
                        msg.sender,
                        msg.sender
                    )
                returns (uint128 takerTokenFilledAmount, uint128 makerTokenFilledAmount)
            {
                // Update amounts filled.
                takerTokenSoldAmount = takerTokenSoldAmount.safeAdd128(takerTokenFilledAmount);
                makerTokenBoughtAmount = makerTokenBoughtAmount.safeAdd128(makerTokenFilledAmount);
                ethProtocolFeePaid = ethProtocolFeePaid.safeAdd(protocolFee);
            } catch {}
            // Stop execution if the entire amount has been bought.
            if (makerTokenBoughtAmount >= makerTokenBuyAmount) {
                break;
            }
        }
        if (
            revertIfIncomplete &&
            makerTokenBoughtAmount < makerTokenBuyAmount
        ) {
            // Did not fill the amount requested.
            LibNativeOrdersRichErrors.IncompleteMarketFillError(
                LibNativeOrdersRichErrors.IncompleteMarketFillErrorCode.MARKET_BUY_LIMIT_ORDERS,
                makerTokenBuyAmount,
                makerTokenBoughtAmount
            ).rrevert();
        }
        _refundExcessProtocolFeeToSender(ethProtocolFeePaid);
    }

    /// @dev Fills the given RFQ orders by buying up to the given
    ///      amount of maker token.
    /// @param orders Array of RFQ orders.
    /// @param signatures Array of signatures corresponding to each order.
    /// @param makerTokenBuyAmount The total amount of maker token to buy.
    /// @param revertIfIncomplete If true, reverts if this function fails to
    ///        fill the full buy amount.
    /// @return takerTokenSoldAmount The total amount of taker token sold.
    /// @return makerTokenBoughtAmount The total amount of maker token bought.
    function marketBuyRfqOrders(
        LibNativeOrder.RfqOrder[] calldata orders,
        LibSignature.Signature[] calldata signatures,
        uint128 makerTokenBuyAmount,
        bool revertIfIncomplete
    )
        external
        override
        returns (
            uint128 takerTokenSoldAmount,
            uint128 makerTokenBoughtAmount
        )
    {
        for (uint256 i = 0; i != orders.length; i++) {
            // Calculate the remaining amount of maker token to buy.
            uint128 remainingMakerTokenBuyAmount =
                makerTokenBuyAmount.safeSub128(makerTokenBoughtAmount);
            // Convert the remaining amount of maker token to buy into
            // remaining amount of taker token to sell.
            uint128 takerTokenFillAmount = LibMathV06.getPartialAmountCeil(
                orders[i].takerAmount,
                orders[i].makerAmount,
                remainingMakerTokenBuyAmount
            ).safeDowncastToUint128();
            // Attempt to sell the remaining amount of taker token.
            try
                INativeOrdersFeature(address(this))._fillRfqOrder
                    (
                        orders[i],
                        signatures[i],
                        takerTokenFillAmount,
                        msg.sender
                    )
                returns (uint128 takerTokenFilledAmount, uint128 makerTokenFilledAmount)
            {
                // Update amounts filled.
                takerTokenSoldAmount = takerTokenSoldAmount.safeAdd128(takerTokenFilledAmount);
                makerTokenBoughtAmount = makerTokenBoughtAmount.safeAdd128(makerTokenFilledAmount);
            } catch {}
            // Stop execution if the entire amount has been bought.
            if (makerTokenBoughtAmount >= makerTokenBuyAmount) {
                break;
            }
        }
        if (
            revertIfIncomplete &&
            makerTokenBoughtAmount < makerTokenBuyAmount
        ) {
            // Did not fill the amount requested.
            LibNativeOrdersRichErrors.IncompleteMarketFillError(
                LibNativeOrdersRichErrors.IncompleteMarketFillErrorCode.MARKET_BUY_RFQ_ORDERS,
                makerTokenBuyAmount,
                makerTokenBoughtAmount
            ).rrevert();
        }
    }

    /// @dev Refund any leftover protocol fees in `msg.value` to `msg.sender`.
    /// @param ethProtocolFeePaid How much ETH was paid in protocol fees.
    function _refundExcessProtocolFeeToSender(uint256 ethProtocolFeePaid)
        private
    {
        if (msg.value > ethProtocolFeePaid && msg.sender != address(this)) {
            uint256 refundAmount = msg.value.safeSub(ethProtocolFeePaid);
            (bool success,) = msg
                .sender
                .call{value: refundAmount}("");
            if (!success) {
                LibNativeOrdersRichErrors.ProtocolFeeRefundFailed(
                    msg.sender,
                    refundAmount
                ).rrevert();
            }
        }
    }
}
