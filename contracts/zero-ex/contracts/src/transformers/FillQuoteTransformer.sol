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

import "@0x/contracts-utils/contracts/src/v06/errors/LibRichErrorsV06.sol";
import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";
import "@0x/contracts-erc20/contracts/src/v06/LibERC20TokenV06.sol";
import "@0x/contracts-utils/contracts/src/v06/LibSafeMathV06.sol";
import "@0x/contracts-utils/contracts/src/v06/LibMathV06.sol";
import "../errors/LibTransformERC20RichErrors.sol";
import "../features/INativeOrdersFeature.sol";
import "../features/libs/LibNativeOrder.sol";
import "./bridges/IBridgeAdapter.sol";
import "./Transformer.sol";
import "./LibERC20Transformer.sol";

/// @dev A transformer that fills an ERC20 market sell/buy quote.
///      This transformer shortcuts bridge orders and fills them directly
contract FillQuoteTransformer is
    Transformer
{
    using LibERC20TokenV06 for IERC20TokenV06;
    using LibERC20Transformer for IERC20TokenV06;
    using LibSafeMathV06 for uint256;
    using LibRichErrorsV06 for bytes;

    /// @dev Whether we are performing a market sell or buy.
    enum Side {
        Sell,
        Buy
    }

    enum OrderType {
        Bridge,
        Limit,
        RFQ
    }

    /// @dev Transform data to ABI-encode and pass into `transform()`.
    struct TransformData {
        // Whether we are performing a market sell or buy.
        Side side;
        // The token being sold.
        // This should be an actual token, not the ETH pseudo-token.
        IERC20TokenV06 sellToken;
        // The token being bought.
        // This should be an actual token, not the ETH pseudo-token.
        IERC20TokenV06 buyToken;

        IBridgeAdapter.BridgeOrder[] bridgeOrders;
        LibNativeOrder.LimitOrder[] limitOrders;
        LibNativeOrder.RfqOrder[] rfqOrders;

        LibSignature.Signature[] limitOrderSignatures;
        LibSignature.Signature[] rfqOrderSignatures;

        uint8[] multiIndex;

        // Amount of `sellToken` to sell or `buyToken` to buy.
        // For sells, this may be `uint256(-1)` to sell the entire balance of
        // `sellToken`.
        uint256 fillAmount;

        // Who to transfer unused protocol fees to.
        // May be a valid address or one of:
        // `address(0)`: Stay in flash wallet.
        // `address(1)`: Send to the taker.
        // `address(2)`: Send to the sender (caller of `transformERC20()`).
        address payable refundReceiver;
    }

    struct FillOrderResults {
        // The amount of taker tokens sold, according to balance checks.
        uint256 takerTokenSoldAmount;
        // The amount of maker tokens sold, according to balance checks.
        uint256 makerTokenBoughtAmount;
        // The amount of protocol fee paid.
        uint256 protocolFeePaid;
    }

    /// @dev Intermediate state variables to get around stack limits.
    struct FillState {
        uint256 ethRemaining;
        uint256 boughtAmount;
        uint256 soldAmount;
        uint256 protocolFee;
        uint256 takerTokenBalanceRemaining;
        uint256[3] currentIndices;
        OrderType currentOrderType;
    }

    /// @dev Emitted when a trade is skipped due to a lack of funds
    ///      to pay the 0x Protocol fee.
    /// @param orderHash The hash of the order that was skipped.
    event ProtocolFeeUnfunded(bytes32 orderHash);

    /// @dev Maximum uint256 value.
    uint256 private constant MAX_UINT256 = uint256(-1);
    /// @dev If `refundReceiver` is set to this address, unpsent
    ///      protocol fees will be sent to the taker.
    address private constant REFUND_RECEIVER_TAKER = address(1);
    /// @dev If `refundReceiver` is set to this address, unpsent
    ///      protocol fees will be sent to the sender.
    address private constant REFUND_RECEIVER_SENDER = address(2);

    /// @dev The BridgeAdapter address
    IBridgeAdapter public immutable bridgeAdapter;

    INativeOrdersFeature public immutable zeroEx;

    /// @dev Create this contract.
    /// @param bridgeAdapter_ The bridge adapter contract.
    /// @param zeroEx_ The Exchange Proxy contract.
    constructor(IBridgeAdapter bridgeAdapter_, INativeOrdersFeature zeroEx_)
        public
        Transformer()
    {
        bridgeAdapter = bridgeAdapter_;
        zeroEx = zeroEx_;
    }

    /// @dev Sell this contract's entire balance of of `sellToken` in exchange
    ///      for `buyToken` by filling `orders`. Protocol fees should be attached
    ///      to this call. `buyToken` and excess ETH will be transferred back to the caller.
    /// @param context Context information.
    /// @return magicBytes The success bytes (`LibERC20Transformer.TRANSFORMER_SUCCESS`).
    function transform(TransformContext calldata context)
        external
        override
        returns (bytes4 magicBytes)
    {
        TransformData memory data = abi.decode(context.data, (TransformData));
        FillState memory state;

        // Validate data fields.
        if (data.sellToken.isTokenETH() || data.buyToken.isTokenETH()) {
            LibTransformERC20RichErrors.InvalidTransformDataError(
                LibTransformERC20RichErrors.InvalidTransformDataErrorCode.INVALID_TOKENS,
                context.data
            ).rrevert();
        }

        if (
            data.limitOrders.length != data.limitOrderSignatures.length ||
            data.rfqOrders.length != data.rfqOrderSignatures.length ||
            data.bridgeOrders.length + data.limitOrders.length + data.rfqOrders.length != data.multiIndex.length
        ) {
            LibTransformERC20RichErrors.InvalidTransformDataError(
                LibTransformERC20RichErrors.InvalidTransformDataErrorCode.INVALID_ARRAY_LENGTH,
                context.data
            ).rrevert();
        }

        state.takerTokenBalanceRemaining = data.sellToken.getTokenBalanceOf(address(this));
        if (data.side == Side.Sell && data.fillAmount == MAX_UINT256) {
            // If `sellAmount == -1 then we are selling
            // the entire balance of `sellToken`. This is useful in cases where
            // the exact sell amount is not exactly known in advance, like when
            // unwrapping Chai/cUSDC/cDAI.
            data.fillAmount = state.takerTokenBalanceRemaining;
        }

        if (data.limitOrders.length + data.rfqOrders.length != 0) {
            data.sellToken.approveIfBelow(address(zeroEx), data.fillAmount);
        }
        if (data.limitOrders.length != 0) {
            state.protocolFee = uint256(zeroEx.getProtocolFeeMultiplier()).safeMul(tx.gasprice);
        }

        state.ethRemaining = address(this).balance;

        // Fill the orders.
        for (uint256 i = 0; i < data.multiIndex.length; ++i) {
            // Check if we've hit our targets.
            if (data.side == Side.Sell) {
                // Market sell check.
                if (state.soldAmount >= data.fillAmount) {
                    break;
                }
            } else {
                // Market buy check.
                if (state.boughtAmount >= data.fillAmount) {
                    break;
                }
            }

            state.currentOrderType = OrderType(data.multiIndex[i]);
            // Fill the order.
            FillOrderResults memory results;
            if (state.currentOrderType == OrderType.Bridge) {
                IBridgeAdapter.BridgeOrder memory order =
                    data.bridgeOrders[state.currentIndices[uint256(OrderType.Bridge)]];

                uint256 takerTokenFillAmount = _takerTokenFillAmount(
                    data,
                    state,
                    order.takerTokenAmount,
                    order.makerTokenAmount,
                    0
                );

                (bool success, bytes memory resultData) = address(bridgeAdapter).delegatecall(
                    abi.encodeWithSelector(
                        IBridgeAdapter.trade.selector,
                        order,
                        data.sellToken,
                        data.buyToken,
                        takerTokenFillAmount
                    )
                );
                if (success) {
                    results.makerTokenBoughtAmount = abi.decode(resultData, (uint256));
                    results.takerTokenSoldAmount = takerTokenFillAmount;
                }
            } else if (state.currentOrderType == OrderType.Limit) {
                uint256 index = state.currentIndices[uint256(OrderType.Limit)];
                LibNativeOrder.LimitOrder memory order = data.limitOrders[index];
                LibSignature.Signature memory signature = data.limitOrderSignatures[index];

                uint256 takerTokenFillAmount = _takerTokenFillAmount(
                    data,
                    state,
                    order.takerAmount,
                    order.makerAmount,
                    order.takerTokenFeeAmount
                );

                // Emit an event if we do not have sufficient ETH to cover the protocol fee.
                if (state.ethRemaining < state.protocolFee) {
                    bytes32 orderHash = zeroEx.getLimitOrderHash(order);
                    emit ProtocolFeeUnfunded(orderHash);
                    continue;
                }

                try
                    zeroEx.fillLimitOrder
                        {value: state.protocolFee}
                        (order, signature, uint128(takerTokenFillAmount))
                    returns (uint128 takerTokenFilledAmount, uint128 makerTokenFilledAmount)
                {
                    results.takerTokenSoldAmount = takerTokenFilledAmount;
                    results.makerTokenBoughtAmount = makerTokenFilledAmount;
                    results.protocolFeePaid = state.protocolFee;
                    if (order.takerTokenFeeAmount > 0) {
                        uint256 takerTokenFeeFilledAmount = LibMathV06.getPartialAmountFloor(
                            results.takerTokenSoldAmount,
                            order.takerAmount,
                            order.takerTokenFeeAmount
                        );
                        results.takerTokenSoldAmount =
                            results.takerTokenSoldAmount.safeAdd(takerTokenFeeFilledAmount);
                    }
                } catch {
                    // Swallow failures, leaving all results as zero.
                }
            } else if (state.currentOrderType == OrderType.RFQ) {
                uint256 index = state.currentIndices[uint256(OrderType.RFQ)];
                LibNativeOrder.RfqOrder memory order = data.rfqOrders[index];
                LibSignature.Signature memory signature = data.rfqOrderSignatures[index];

                uint256 takerTokenFillAmount = _takerTokenFillAmount(
                    data,
                    state,
                    order.takerAmount,
                    order.makerAmount,
                    0
                );

                try
                    zeroEx.fillRfqOrder
                        (order, signature, uint128(takerTokenFillAmount))
                    returns (uint128 takerTokenFilledAmount, uint128 makerTokenFilledAmount)
                {
                    results.takerTokenSoldAmount = takerTokenFilledAmount;
                    results.makerTokenBoughtAmount = makerTokenFilledAmount;
                } catch {
                    // Swallow failures, leaving all results as zero.
                }
            } else {
                revert("INVALID_ORDER_TYPE");
            }

            // Accumulate totals.
            state.soldAmount = state.soldAmount.safeAdd(results.takerTokenSoldAmount);
            state.boughtAmount = state.boughtAmount.safeAdd(results.makerTokenBoughtAmount);
            state.ethRemaining = state.ethRemaining.safeSub(results.protocolFeePaid);
            state.takerTokenBalanceRemaining = state.takerTokenBalanceRemaining.safeSub(results.takerTokenSoldAmount);
            state.currentIndices[uint256(state.currentOrderType)]++;
        }

        // Ensure we hit our targets.
        if (data.side == Side.Sell) {
            // Market sell check.
            if (state.soldAmount < data.fillAmount) {
                LibTransformERC20RichErrors
                    .IncompleteFillSellQuoteError(
                        address(data.sellToken),
                        state.soldAmount,
                        data.fillAmount
                    ).rrevert();
            }
        } else {
            // Market buy check.
            if (state.boughtAmount < data.fillAmount) {
                LibTransformERC20RichErrors
                    .IncompleteFillBuyQuoteError(
                        address(data.buyToken),
                        state.boughtAmount,
                        data.fillAmount
                    ).rrevert();
            }
        }

        // Refund unspent protocol fees.
        if (state.ethRemaining > 0 && data.refundReceiver != address(0)) {
            if (data.refundReceiver == REFUND_RECEIVER_TAKER) {
                context.taker.transfer(state.ethRemaining);
            } else if (data.refundReceiver == REFUND_RECEIVER_SENDER) {
                context.sender.transfer(state.ethRemaining);
            } else {
                data.refundReceiver.transfer(state.ethRemaining);
            }
        }
        return LibERC20Transformer.TRANSFORMER_SUCCESS;
    }

    function _takerTokenFillAmount(
        TransformData memory data,
        FillState memory state,
        uint256 orderTakerAmount,
        uint256 orderMakerAmount,
        uint256 orderTakerTokenFeeAmount
    )
        private
        pure
        returns (uint256 takerTokenFillAmount)
    {
        if (data.side == Side.Sell) {
            takerTokenFillAmount = data.fillAmount.safeSub(state.soldAmount);
            if (orderTakerTokenFeeAmount != 0) {
                takerTokenFillAmount = LibMathV06.getPartialAmountCeil(
                    takerTokenFillAmount,
                    orderTakerAmount,
                    orderTakerAmount.safeAdd(orderTakerTokenFeeAmount)
                );
            }
            return LibSafeMathV06.min256(takerTokenFillAmount, orderTakerAmount);
        } else {
            takerTokenFillAmount = data.fillAmount.safeSub(state.boughtAmount);
            takerTokenFillAmount = LibMathV06.getPartialAmountCeil(
                takerTokenFillAmount,
                orderMakerAmount,
                orderTakerAmount
            );
            takerTokenFillAmount = LibSafeMathV06.min256(takerTokenFillAmount, orderTakerAmount);
            return LibSafeMathV06.min256(takerTokenFillAmount, state.takerTokenBalanceRemaining);
        }
    }
}
