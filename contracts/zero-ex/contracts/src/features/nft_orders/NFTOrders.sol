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
import "@0x/contracts-erc20/contracts/src/v06/IEtherTokenV06.sol";
import "@0x/contracts-utils/contracts/src/v06/LibMathV06.sol";
import "@0x/contracts-utils/contracts/src/v06/LibSafeMathV06.sol";
import "../../errors/LibNFTOrdersRichErrors.sol";
import "../../fixins/FixinCommon.sol";
import "../../fixins/FixinEIP712.sol";
import "../../fixins/FixinTokenSpender.sol";
import "../../migrations/LibMigrate.sol";
import "../../vendor/IFeeRecipient.sol";
import "../../vendor/ITakerCallback.sol";
import "../libs/LibSignature.sol";
import "../libs/LibNFTOrder.sol";


/// @dev Abstract base contract inherited by ERC721OrdersFeature and NFTOrders
abstract contract NFTOrders is
    FixinCommon,
    FixinEIP712,
    FixinTokenSpender
{
    using LibSafeMathV06 for uint256;

    /// @dev Native token pseudo-address.
    address constant internal NATIVE_TOKEN_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    /// @dev The WETH token contract.
    IEtherTokenV06 internal immutable WETH;

    /// @dev The magic return value indicating the success of a `receiveZeroExFeeCallback`.
    bytes4 private constant FEE_CALLBACK_MAGIC_BYTES = IFeeRecipient.receiveZeroExFeeCallback.selector;
    /// @dev The magic return value indicating the success of a `zeroExTakerCallback`.
    bytes4 private constant TAKER_CALLBACK_MAGIC_BYTES = ITakerCallback.zeroExTakerCallback.selector;

    constructor(address zeroExAddress, IEtherTokenV06 weth)
        public
        FixinEIP712(zeroExAddress)
    {
        WETH = weth;
    }

    struct SellParams {
        uint128 sellAmount;
        uint256 tokenId;
        bool unwrapNativeToken;
        address taker;
        address currentNftOwner;
        bytes takerCallbackData;
    }

    struct BuyParams {
        uint128 buyAmount;
        uint256 ethAvailable;
        bytes takerCallbackData;
    }

    // Core settlement logic for selling an NFT asset.
    function _sellNFT(
        LibNFTOrder.NFTOrder memory buyOrder,
        uint128 orderAmount,
        LibSignature.Signature memory signature,
        SellParams memory params
    )
        internal
    {
        LibNFTOrder.OrderInfo memory orderInfo = _getOrderInfo(buyOrder, orderAmount);
        // Check that the order can be filled.
        _validateBuyOrder(
            buyOrder,
            signature,
            orderInfo,
            params.taker,
            params.tokenId
        );

        if (params.sellAmount > orderInfo.remainingAmount) {
            LibNFTOrdersRichErrors.ExceedsRemainingOrderAmount(
                orderInfo.remainingAmount,
                params.sellAmount
            ).rrevert();
        }

        _updateOrderState(buyOrder, orderInfo.orderHash, params.sellAmount);

        uint256 erc20FillAmount;
        if (params.sellAmount == orderAmount) {
            erc20FillAmount = buyOrder.erc20TokenAmount;
        } else {
            // Rounding favors the order maker.
            erc20FillAmount = LibMathV06.safeGetPartialAmountFloor(
                params.sellAmount,
                orderAmount,
                buyOrder.erc20TokenAmount
            );
        }

        if (params.unwrapNativeToken) {
            // The ERC20 token must be WETH for it to be unwrapped.
            if (buyOrder.erc20Token != WETH) {
                LibNFTOrdersRichErrors.ERC20TokenMismatchError(
                    address(buyOrder.erc20Token),
                    address(WETH)
                ).rrevert();
            }
            // Transfer the WETH from the maker to the Exchange Proxy
            // so we can unwrap it before sending it to the seller.
            // TODO: Probably safe to just use WETH.transferFrom for some
            //       small gas savings
            _transferERC20TokensFrom(
                WETH,
                buyOrder.maker,
                address(this),
                erc20FillAmount
            );
            // Unwrap WETH into ETH.
            WETH.withdraw(erc20FillAmount);
            // Send ETH to the seller.
            _transferEth(payable(params.taker), erc20FillAmount);
        } else {
            // Transfer the ERC20 token from the buyer to the seller.
            _transferERC20TokensFrom(
                buyOrder.erc20Token,
                buyOrder.maker,
                params.taker,
                erc20FillAmount
            );
        }

        if (params.takerCallbackData.length > 0) {
            require(
                params.taker != address(this),
                "NFTOrders::_sellNFT/CANNOT_CALLBACK_SELF"
            );
            // Invoke the callback
            bytes4 callbackResult = ITakerCallback(params.taker)
                .zeroExTakerCallback(orderInfo.orderHash, params.takerCallbackData);
            // Check for the magic success bytes
            require(
                callbackResult == TAKER_CALLBACK_MAGIC_BYTES,
                "NFTOrders::_sellNFT/CALLBACK_FAILED"
            );
        }

        // Transfer the NFT asset to the buyer.
        // If this function is called from the
        // `onNFTReceived` callback the Exchange Proxy
        // holds the asset. Otherwise, transfer it from
        // the seller.
        _transferNFTAssetFrom(
            buyOrder.nft,
            params.currentNftOwner,
            buyOrder.maker,
            params.tokenId,
            params.sellAmount
        );

        // The buyer pays the order fees.
        _payFees(
            buyOrder,
            buyOrder.maker,
            params.sellAmount,
            orderAmount,
            false
        );
    }

    // Core settlement logic for buying an NFT asset.
    function _buyNFT(
        LibNFTOrder.NFTOrder memory sellOrder,
        uint128 orderAmount,
        LibSignature.Signature memory signature,
        BuyParams memory params
    )
        internal
        returns (uint256 ethSpent)
    {
        LibNFTOrder.OrderInfo memory orderInfo = _getOrderInfo(sellOrder, orderAmount);
        // Check that the order can be filled.
        _validateSellOrder(
            sellOrder,
            signature,
            orderInfo,
            msg.sender
        );

        if (params.buyAmount > orderInfo.remainingAmount) {
            LibNFTOrdersRichErrors.ExceedsRemainingOrderAmount(
                orderInfo.remainingAmount,
                params.buyAmount
            ).rrevert();
        }

        _updateOrderState(sellOrder, orderInfo.orderHash, params.buyAmount);

        uint256 erc20FillAmount;
        if (params.buyAmount == orderAmount) {
            erc20FillAmount = sellOrder.erc20TokenAmount;
        } else {
            // Rounding favors the order maker.
            erc20FillAmount = LibMathV06.safeGetPartialAmountCeil(
                params.buyAmount,
                orderAmount,
                sellOrder.erc20TokenAmount
            );
        }

        // Transfer the NFT asset to the buyer (`msg.sender`).
        _transferNFTAssetFrom(
            sellOrder.nft,
            sellOrder.maker,
            msg.sender,
            sellOrder.nftId,
            params.buyAmount
        );

        if (params.takerCallbackData.length > 0) {
            require(
                msg.sender != address(this),
                "NFTOrders::_buyNFT/CANNOT_CALLBACK_SELF"
            );
            uint256 ethBalanceBeforeCallback = address(this).balance;
            // Invoke the callback
            bytes4 callbackResult = ITakerCallback(msg.sender)
                .zeroExTakerCallback(orderInfo.orderHash, params.takerCallbackData);
            params.ethAvailable = params.ethAvailable.safeAdd(
                address(this).balance.safeSub(ethBalanceBeforeCallback)
            );
            // Check for the magic success bytes
            require(
                callbackResult == TAKER_CALLBACK_MAGIC_BYTES,
                "NFTOrders::_buyNFT/CALLBACK_FAILED"
            );
        }

        if (address(sellOrder.erc20Token) == NATIVE_TOKEN_ADDRESS) {
            // Check that we have enough ETH.
            if (params.ethAvailable < erc20FillAmount) {
                LibNFTOrdersRichErrors.InsufficientEthError(
                    params.ethAvailable,
                    erc20FillAmount
                ).rrevert();
            }
            // Transfer ETH to the seller.
            _transferEth(payable(sellOrder.maker), erc20FillAmount);
            // Fees are paid from the EP's current balance of ETH.
            uint256 ethFees = _payFees(
                sellOrder,
                address(this),
                params.buyAmount,
                orderAmount,
                true
            );
            // Sum the amount of ETH spent.
            ethSpent = erc20FillAmount.safeAdd(ethFees);
        } else if (sellOrder.erc20Token == WETH) {
            // If there is enough ETH available, fill the WETH order
            // (including fees) using that ETH.
            // Otherwise, transfer WETH from the taker.
            if (params.ethAvailable >= erc20FillAmount) {
                // Wrap ETH.
                WETH.deposit{value: erc20FillAmount}();
                // TODO: Probably safe to just use WETH.transfer for some
                //       small gas savings
                // Transfer WETH to the seller.
                _transferERC20Tokens(
                    WETH,
                    sellOrder.maker,
                    erc20FillAmount
                );
                // Pay fees using ETH.
                uint256 ethFees = _payFees(
                    sellOrder,
                    address(this),
                    params.buyAmount,
                    orderAmount,
                    true
                );
                // Sum the amount of ETH spent.
                ethSpent = erc20FillAmount.safeAdd(ethFees);
            } else {
                // Transfer WETH from the buyer to the seller.
                _transferERC20TokensFrom(
                    sellOrder.erc20Token,
                    msg.sender,
                    sellOrder.maker,
                    erc20FillAmount
                );
                // The buyer pays fees using WETH.
                _payFees(
                    sellOrder,
                    msg.sender,
                    params.buyAmount,
                    orderAmount,
                    false
                );
            }
        } else {
            // Transfer ERC20 token from the buyer to the seller.
            _transferERC20TokensFrom(
                sellOrder.erc20Token,
                msg.sender,
                sellOrder.maker,
                erc20FillAmount
            );
            // The buyer pays fees.
            _payFees(
                sellOrder,
                msg.sender,
                params.buyAmount,
                orderAmount,
                false
            );
        }
    }

    function _validateSellOrder(
        LibNFTOrder.NFTOrder memory sellOrder,
        LibSignature.Signature memory signature,
        LibNFTOrder.OrderInfo memory orderInfo,
        address taker
    )
        private
        view
    {
        // Order must be selling the NFT asset.
        require(
            sellOrder.direction == LibNFTOrder.TradeDirection.SELL_NFT,
            "NFTOrders::_validateSellOrder/WRONG_TRADE_DIRECTION"
        );
        // Taker must match the order taker, if one is specified.
        if (sellOrder.taker != address(0) && sellOrder.taker != taker) {
            LibNFTOrdersRichErrors.OnlyTakerError(taker, sellOrder.taker).rrevert();
        }
        // Check that the order is valid and has not expired, been cancelled,
        // or been filled.
        if (orderInfo.status != LibNFTOrder.OrderStatus.FILLABLE) {
            LibNFTOrdersRichErrors.OrderNotFillableError(
                sellOrder.maker,
                sellOrder.nonce,
                uint8(orderInfo.status)
            ).rrevert();
        }

        // Check the signature.
        _validateOrderSignature(orderInfo.orderHash, signature, sellOrder.maker);
    }

    function _validateBuyOrder(
        LibNFTOrder.NFTOrder memory buyOrder,
        LibSignature.Signature memory signature,
        LibNFTOrder.OrderInfo memory orderInfo,
        address taker,
        uint256 tokenId
    )
        private
        view
    {
        // Order must be buying the NFT asset.
        require(
            buyOrder.direction == LibNFTOrder.TradeDirection.BUY_NFT,
            "NFTOrders::_validateBuyOrder/WRONG_TRADE_DIRECTION"
        );
        // The ERC20 token cannot be ETH.
        require(
            address(buyOrder.erc20Token) != NATIVE_TOKEN_ADDRESS,
            "NFTOrders::_validateBuyOrder/NATIVE_TOKEN_NOT_ALLOWED"
        );
        // Taker must match the order taker, if one is specified.
        if (buyOrder.taker != address(0) && buyOrder.taker != taker) {
            LibNFTOrdersRichErrors.OnlyTakerError(taker, buyOrder.taker).rrevert();
        }
        // Check that the order is valid and has not expired, been cancelled,
        // or been filled.
        if (orderInfo.status != LibNFTOrder.OrderStatus.FILLABLE) {
            LibNFTOrdersRichErrors.OrderNotFillableError(
                buyOrder.maker,
                buyOrder.nonce,
                uint8(orderInfo.status)
            ).rrevert();
        }
        // Check that the asset with the given token ID satisfies the properties
        // specified by the order.
        _validateOrderProperties(buyOrder, tokenId);
        // Check the signature.
        _validateOrderSignature(orderInfo.orderHash, signature, buyOrder.maker);
    }

    function _payFees(
        LibNFTOrder.NFTOrder memory order,
        address payer,
        uint128 fillAmount,
        uint128 orderAmount,
        bool useNativeToken
    )
        internal
        returns (uint256 totalFeesPaid)
    {
        for (uint256 i = 0; i < order.fees.length; i++) {
            LibNFTOrder.Fee memory fee = order.fees[i];

            require(
                fee.recipient != address(this),
                "NFTOrders::_payFees/RECIPIENT_CANNOT_BE_EXCHANGE_PROXY"
            );

            uint256 feeFillAmount;
            if (fillAmount == orderAmount) {
                feeFillAmount = fee.amount;
            } else {
                // Round in favor of the taker or maker
                feeFillAmount = LibMathV06.safeGetPartialAmountFloor(
                    fillAmount,
                    orderAmount,
                    fee.amount
                );
            }
            if (feeFillAmount == 0) {
                continue;
            }

            if (useNativeToken) {
                assert(payer == address(this));
                // Transfer ETH to the fee recipient.
                _transferEth(payable(fee.recipient), feeFillAmount);
            } else {
                // Transfer ERC20 token from payer to recipient.
                _transferERC20TokensFrom(
                    order.erc20Token,
                    payer,
                    fee.recipient,
                    feeFillAmount
                );
            }
            // Note that the fee callback is _not_ called if zero
            // `feeData` is provided. If `feeData` is provided, we assume
            // the fee recipient is a contract that implements the
            // `IFeeRecipient` interface.
            if (fee.feeData.length > 0) {
                // Invoke the callback
                bytes4 callbackResult = IFeeRecipient(fee.recipient).receiveZeroExFeeCallback(
                    useNativeToken ? NATIVE_TOKEN_ADDRESS : address(order.erc20Token),
                    feeFillAmount,
                    fee.feeData
                );
                // Check for the magic success bytes
                require(
                    callbackResult == FEE_CALLBACK_MAGIC_BYTES,
                    "NFTOrders::_payFees/CALLBACK_FAILED"
                );
            }
            // Sum the fees paid
            totalFeesPaid = totalFeesPaid.safeAdd(feeFillAmount);
        }
    }

    function _validateOrderSignature(
        bytes32 orderHash,
        LibSignature.Signature memory signature,
        address maker
    )
        internal
        virtual
        view;

    /// @dev If the given order is buying an NFT asset, checks
    ///      whether or not the given token ID satisfies the required
    ///      properties specified in the order. If the order does not
    ///      specify any properties, this function instead checks
    ///      whether the given token ID matches the ID in the order.
    ///      Reverts if any checks fail, or if the order is selling
    ///      an NFT asset.
    /// @param order The NFT order.
    /// @param tokenId The ID of the NFT asset.
    function _validateOrderProperties(
        LibNFTOrder.NFTOrder memory order,
        uint256 tokenId
    )
        internal
        view
    {
        // Order must be buying an NFT asset to have properties.
        require(
            order.direction == LibNFTOrder.TradeDirection.BUY_NFT,
            "NFTOrders::_validateOrderProperties/WRONG_TRADE_DIRECTION"
        );

        // If no properties are specified, check that the given
        // `tokenId` matches the one specified in the order.
        if (order.nftProperties.length == 0) {
            if (tokenId != order.nftId) {
                LibNFTOrdersRichErrors.TokenIdMismatchError(
                    tokenId,
                    order.nftId
                ).rrevert();
            }
        }

        // Validate each property
        for (uint256 i = 0; i < order.nftProperties.length; i++) {
            LibNFTOrder.Property memory property = order.nftProperties[i];
            // `address(0)` is interpreted as a no-op. Any token ID
            // will satisfy a property with `propertyValidator == address(0)`.
            if (address(property.propertyValidator) == address(0)) {
                continue;
            }

            // Call the property validator and throw a descriptive error
            // if the call reverts.
            try property.propertyValidator.validateProperty(
                order.nft,
                tokenId,
                property.propertyData
            ) {} catch (bytes memory errorData) {
                LibNFTOrdersRichErrors.PropertyValidationFailedError(
                    address(property.propertyValidator),
                    order.nft,
                    tokenId,
                    property.propertyData,
                    errorData
                ).rrevert();
            }
        }
    }

    function _transferNFTAssetFrom(
        address nft,
        address from,
        address to,
        uint256 tokenId,
        uint256 amount
    )
        internal
        virtual;

    function _updateOrderState(
        LibNFTOrder.NFTOrder memory order,
        bytes32 orderHash,
        uint128 fillAmount
    )
        internal
        virtual;

    /// @dev Get the order info for an NFT order.
    /// @param order The NFT order.
    /// @return orderInfo Info about the order.
    function _getOrderInfo(LibNFTOrder.NFTOrder memory order, uint128 orderAmount)
        internal
        virtual
        view
        returns (LibNFTOrder.OrderInfo memory orderInfo);
}
