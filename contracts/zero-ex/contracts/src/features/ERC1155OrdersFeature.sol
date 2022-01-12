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
import "@0x/contracts-utils/contracts/src/v06/LibMathV06.sol";
import "@0x/contracts-utils/contracts/src/v06/LibSafeMathV06.sol";
import "../errors/LibERC1155OrdersRichErrors.sol";
import "../fixins/FixinCommon.sol";
import "../fixins/FixinEIP712.sol";
import "../fixins/FixinERC1155Spender.sol";
import "../fixins/FixinTokenSpender.sol";
import "../migrations/LibMigrate.sol";
import "../storage/LibERC1155OrdersStorage.sol";
import "../vendor/IERC1155OrderCallback.sol";
import "../vendor/IFeeRecipient.sol";
import "./interfaces/IFeature.sol";
import "./interfaces/IERC1155OrdersFeature.sol";
import "./libs/LibERC1155Order.sol";
import "./libs/LibSignature.sol";


/// @dev Feature for interacting with ERC1155 orders.
contract ERC1155OrdersFeature is
    IFeature,
    IERC1155OrdersFeature,
    FixinCommon,
    FixinEIP712,
    FixinERC1155Spender,
    FixinTokenSpender
{
    using LibSafeMathV06 for uint256;
    using LibSafeMathV06 for uint128;

    /// @dev Name of this feature.
    string public constant override FEATURE_NAME = "ERC1155Orders";
    /// @dev Version of this feature.
    uint256 public immutable override FEATURE_VERSION = _encodeVersion(1, 0, 0);
    /// @dev Native token pseudo-address.
    address constant private NATIVE_TOKEN_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    /// @dev The WETH token contract.
    IEtherTokenV06 private immutable WETH;

    /// @dev The magic return value indicating the success of a `receiveZeroExFeeCallback`.
    bytes4 private constant FEE_CALLBACK_MAGIC_BYTES = IFeeRecipient.receiveZeroExFeeCallback.selector;
    /// @dev The magic return value indicating the success of a `zeroExERC1155OrderCallback`.
    bytes4 private constant TAKER_CALLBACK_MAGIC_BYTES = IERC1155OrderCallback.zeroExERC1155OrderCallback.selector;
    /// @dev The magic return value indicating the success of a `onERC1155Received`.
    bytes4 private constant ERC1155_RECEIVED_MAGIC_BYTES = this.onERC1155Received.selector;
    /// @dev Highest bit of a uint256, used to flag cancelled orders.
    uint256 private constant CANCEL_BIT = 1 << 255;
    /// @dev Second-highest bit of a uint256, used to flag pre-signed orders.
    uint256 private constant PRESIGN_BIT = 1 << 254;


    struct SellOrderParams {
        LibERC1155Order.ERC1155Order buyOrder;
        LibSignature.Signature signature;
        uint256 erc1155TokenId;
        uint128 erc1155FillAmount;
        bool unwrapNativeToken;
        address taker;
        address currentNftOwner;
        bytes takerCallbackData;
    }


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
        _registerFeatureFunction(this.sellERC1155.selector);
        _registerFeatureFunction(this.buyERC1155.selector);
        _registerFeatureFunction(this.cancelERC1155Order.selector);
        _registerFeatureFunction(this.batchBuyERC1155s.selector);
        _registerFeatureFunction(this.onERC1155Received.selector);
        _registerFeatureFunction(this.preSignERC1155Order.selector);
        _registerFeatureFunction(this.validateERC1155OrderSignature.selector);
        _registerFeatureFunction(this.validateERC1155OrderProperties.selector);
        _registerFeatureFunction(this.getERC1155OrderInfo.selector);
        _registerFeatureFunction(this.getERC1155OrderHash.selector);
        return LibMigrate.MIGRATE_SUCCESS;
    }

    /// @dev Sells an ERC1155 asset to fill the given order.
    /// @param buyOrder The ERC1155 buy order.
    /// @param signature The order signature from the maker.
    /// @param erc1155TokenId The ID of the ERC1155 asset being
    ///        sold. If the given order specifies properties,
    ///        the asset must satisfy those properties. Otherwise,
    ///        it must equal the tokenId in the order.
    /// @param erc1155SellAmount The amount of the ERC1155 asset
    ///        to sell.
    /// @param unwrapNativeToken If this parameter is true and the
    ///        ERC20 token of the order is e.g. WETH, unwraps the
    ///        token before transferring it to the taker.
    /// @param callbackData If this parameter is non-zero, invokes
    ///        `zeroExERC1155OrderCallback` on `msg.sender` after
    ///        the ERC20 tokens have been transferred to `msg.sender`
    ///        but before transferring the ERC1155 asset to the buyer.
    function sellERC1155(
        LibERC1155Order.ERC1155Order memory buyOrder,
        LibSignature.Signature memory signature,
        uint256 erc1155TokenId,
        uint128 erc1155SellAmount,
        bool unwrapNativeToken,
        bytes memory callbackData
    )
        public
        override
    {
        _sellERC1155(SellOrderParams(
            buyOrder,
            signature,
            erc1155TokenId,
            erc1155SellAmount,
            unwrapNativeToken,
            msg.sender, // taker
            msg.sender, // owner
            callbackData
        ));
    }

    /// @dev Buys an ERC1155 asset by filling the given order.
    /// @param sellOrder The ERC1155 sell order.
    /// @param signature The order signature.
    /// @param erc1155BuyAmount The amount of the ERC1155 asset
    ///        to buy.
    /// @param callbackData If this parameter is non-zero, invokes
    ///        `zeroExERC1155OrderCallback` on `msg.sender` after
    ///        the ERC1155 asset has been transferred to `msg.sender`
    ///        but before transferring the ERC20 tokens to the seller.
    ///        Native tokens acquired during the callback can be used
    ///        to fill the order.
    function buyERC1155(
        LibERC1155Order.ERC1155Order memory sellOrder,
        LibSignature.Signature memory signature,
        uint128 erc1155BuyAmount,
        bytes memory callbackData
    )
        public
        override
        payable
    {
        uint256 ethBalanceBefore = address(this).balance
            .safeSub(msg.value);
        _buyERC1155(
            sellOrder,
            signature,
            erc1155BuyAmount,
            msg.value,
            callbackData
        );
        uint256 ethBalanceAfter = address(this).balance;
        // Cannot spent more than `msg.value`
        if (ethBalanceAfter < ethBalanceBefore) {
            LibERC1155OrdersRichErrors.OverspentEthError(
                ethBalanceBefore - ethBalanceAfter + msg.value,
                msg.value
            ).rrevert();
        }
        // Refund
        _transferEth(msg.sender, ethBalanceAfter - ethBalanceBefore);
    }

    /// @dev Cancel a single ERC1155 order. The caller should be the
    ///      maker of the order. Silently succeeds if the order has
    ///      already been filled or cancelled.
    /// @param order The order to cancel.
    function cancelERC1155Order(LibERC1155Order.ERC1155Order memory order)
        public
        override
    {
        require(
            order.maker == msg.sender,
            "ERC1155OrdersFeature::cancelERC1155Order/ONLY_MAKER"
        );

        bytes32 orderHash = getERC1155OrderHash(order);
        // Set the high bit on the order state variable to indicate
        // a cancel. It's OK to cancel twice.
        LibERC1155OrdersStorage.Storage storage stor =
            LibERC1155OrdersStorage.getStorage();
        stor.orderState[orderHash] |= CANCEL_BIT;

        emit ERC1155OrderCancelled(orderHash, msg.sender);
    }

    /// @dev Cancel multiple ERC1155 orders. The caller should be the
    ///      maker of the orders. Silently succeeds if an order has
    ///      already been filled or cancelled.
    /// @param orders The orders to cancel.
    function batchCancelERC1155Orders(LibERC1155Order.ERC1155Order[] memory orders)
        public
        override
    {
        for (uint256 i = 0; i < orders.length; i++) {
            cancelERC1155Order(orders[i]);
        }
    }

    /// @dev Buys multiple ERC1155 assets by filling the
    ///      given orders.
    /// @param sellOrders The ERC1155 sell orders.
    /// @param signatures The order signatures.
    /// @param erc1155FillAmounts The amounts of the ERC1155 assets
    ///        to buy for each order.
    /// @param revertIfIncomplete If true, reverts if this
    ///        function fails to fill any individual order.
    /// @return successes An array of booleans corresponding to whether
    ///         each order in `orders` was successfully filled.
    function batchBuyERC1155s(
        LibERC1155Order.ERC1155Order[] memory sellOrders,
        LibSignature.Signature[] memory signatures,
        uint256[] calldata erc1155FillAmounts,
        bool revertIfIncomplete
    )
        public
        override
        payable
        returns (bool[] memory successes)
    {
        require(
            sellOrders.length == signatures.length &&
            sellOrders.length == erc1155FillAmounts.length,
            "ERC1155OrdersFeature::batchBuyERC1155s/ARRAY_LENGTH_MISMATCH"
        );
        successes = new bool[](sellOrders.length);

        uint256 ethSpent = 0;
        for (uint256 i = 0; i < sellOrders.length; i++) {
            bytes memory returnData;
            // Delegatecall `_buyERC1155` to track ETH consumption while
            // preserving execution context.
            // Note that `_buyERC1155` is a public function but should _not_
            // be registered in the Exchange Proxy.
            (successes[i], returnData) = _implementation.delegatecall(
                abi.encodeWithSelector(
                    this._buyERC1155.selector,
                    sellOrders[i],
                    signatures[i],
                    erc1155FillAmounts[i],
                    msg.value - ethSpent, // Remaining ETH available
                    new bytes(0)          // No taker callback; allowing a
                                          // callback would potentially mess
                                          // up the ETH accounting here.
                )
            );
            if (successes[i]) {
                (uint256 _ethSpent) = abi.decode(returnData, (uint256));
                ethSpent = ethSpent.safeAdd(_ethSpent);
            } else if (revertIfIncomplete) {
                // Bubble up revert
                returnData.rrevert();
            }
        }

        if (ethSpent > msg.value) {
            LibERC1155OrdersRichErrors.OverspentEthError(
                ethSpent,
                msg.value
            ).rrevert();
        }

        // Refund
        _transferEth(msg.sender, msg.value - ethSpent);
    }

    /// @dev Callback for the ERC1155 `safeTransferFrom` function.
    ///      This callback can be used to sell an ERC1155 asset if
    ///      a valid ERC1155 order, signature and `unwrapNativeToken`
    ///      are encoded in `data`. This allows takers to sell their
    ///      ERC1155 asset without first calling `setApprovalForAll`.
    /// @param operator The address which called `safeTransferFrom`.
    /// @param from The address which previously owned the token.
    /// @param tokenId The ID of the asset being transferred.
    /// @param value The amount being transferred.
    /// @param data Additional data with no specified format. If a
    ///        valid ERC1155 order, signature and `unwrapNativeToken`
    ///        are encoded in `data`, this function will try to fill
    ///        the order using the received asset.
    /// @return success The selector of this function (0xf23a6e61),
    ///         indicating that the callback succeeded.
    function onERC1155Received(
        address operator,
        address from,
        uint256 tokenId,
        uint256 value,
        bytes calldata data
    )
        external
        override
        returns (bytes4 success)
    {
        // TODO: Throw helpful reverts for malformed `data` before
        //       attempting to decode?

        // Decode the order, signature, and `unwrapNativeToken` from
        // `data`. If `data` does not encode such parameters, this
        // will throw.
        (
            LibERC1155Order.ERC1155Order memory buyOrder,
            LibSignature.Signature memory signature,
            bool unwrapNativeToken
        ) = abi.decode(
            data,
            (LibERC1155Order.ERC1155Order, LibSignature.Signature, bool)
        );

        // `onERC1155Received` is called by the ERC1155 token contract.
        // Check that it matches the ERC1155 token in the order.
        if (msg.sender != address(buyOrder.erc1155Token)) {
            LibERC1155OrdersRichErrors.ERC1155TokenMismatchError(
                msg.sender,
                address(buyOrder.erc1155Token)
            ).rrevert();
        }

        require(
            value <= type(uint128).max,
            "ERC1155OrdersFeature::onERC1155Received/VALUE_OVERFLOW"
        );

        _sellERC1155(SellOrderParams(
            buyOrder,
            signature,
            tokenId,
            uint128(value),
            unwrapNativeToken,
            operator,       // taker
            address(this),  // owner (we hold the NFT currently)
            new bytes(0)    // No taker callback
        ));

        return ERC1155_RECEIVED_MAGIC_BYTES;
    }

    /// @dev Approves an ERC1155 order on-chain. After pre-signing
    ///      the order, the `PRESIGNED` signature type will become
    ///      valid for that order and signer.
    /// @param order An ERC1155 order.
    function preSignERC1155Order(LibERC1155Order.ERC1155Order memory order)
        public
        override
    {
        require(
            order.maker == msg.sender,
            "ERC1155OrdersFeature::preSignERC1155Order/MAKER_MISMATCH"
        );
        bytes32 orderHash = getERC1155OrderHash(order);

        LibERC1155OrdersStorage.Storage storage stor =
            LibERC1155OrdersStorage.getStorage();
        // Set the second-highest bit on the order state variable
        // to indicate that the order has been pre-signed.
        stor.orderState[orderHash] |= PRESIGN_BIT;

        emit ERC1155OrderPreSigned(
            order.direction,
            order.erc20Token,
            order.erc20TokenAmount,
            order.erc1155Token,
            order.erc1155TokenId,
            order.erc1155TokenAmount,
            order.erc1155TokenProperties,
            order.fees,
            order.maker,
            order.taker,
            order.expiry,
            order.nonce
        );
    }

    // Core settlement logic for selling an ERC1155 asset.
    // Used by `sellERC1155` and `onERC1155Received`.
    function _sellERC1155(SellOrderParams memory params)
        private
    {
        {
            LibERC1155Order.OrderInfo memory orderInfo = getERC1155OrderInfo(params.buyOrder);
            // Check that the order can be filled.
            _validateBuyOrder(
                params.buyOrder,
                params.signature,
                orderInfo,
                params.taker,
                params.erc1155TokenId
            );

            if (params.erc1155FillAmount > orderInfo.remainingERC1155FillableAmount) {
                LibERC1155OrdersRichErrors.ExceedsRemainingOrderAmount(
                    orderInfo.remainingERC1155FillableAmount,
                    params.erc1155FillAmount
                ).rrevert();
            }

            _updateOrderFilledAmount(orderInfo.orderHash, params.erc1155FillAmount);
        }

        uint256 erc20FillAmount;
        if (params.erc1155FillAmount == params.buyOrder.erc1155TokenAmount) {
            erc20FillAmount = params.buyOrder.erc20TokenAmount;
        } else {
            // Rounding favors the order maker.
            erc20FillAmount = LibMathV06.safeGetPartialAmountFloor(
                params.erc1155FillAmount,
                params.buyOrder.erc1155TokenAmount,
                params.buyOrder.erc20TokenAmount
            );
        }

        if (params.unwrapNativeToken) {
            // The ERC20 token must be WETH for it to be unwrapped.
            if (params.buyOrder.erc20Token != WETH) {
                LibERC1155OrdersRichErrors.ERC20TokenMismatchError(
                    address(params.buyOrder.erc20Token),
                    address(WETH)
                ).rrevert();
            }
            // Transfer the WETH from the maker to the Exchange Proxy
            // so we can unwrap it before sending it to the seller.
            // TODO: Probably safe to just use WETH.transferFrom for some
            //       small gas savings
            _transferERC20TokensFrom(
                WETH,
                params.buyOrder.maker,
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
                params.buyOrder.erc20Token,
                params.buyOrder.maker,
                params.taker,
                erc20FillAmount
            );
        }

        if (params.takerCallbackData.length > 0) {
            require(
                params.taker != address(this),
                "ERC1155OrdersFeature::_sellERC1155/CANNOT_CALLBACK_SELF"
            );
            // Invoke the callback
            bytes4 callbackResult = IERC1155OrderCallback(params.taker)
                .zeroExERC1155OrderCallback(params.takerCallbackData);
            // Check for the magic success bytes
            require(
                callbackResult == TAKER_CALLBACK_MAGIC_BYTES,
                "ERC1155OrdersFeature::_sellERC1155/CALLBACK_FAILED"
            );
        }

        // Transfer the ERC1155 asset to the buyer.
        // If this function is called from the
        // `onERC1155Received` callback the Exchange Proxy
        // holds the asset. Otherwise, transfer it from
        // the seller.
        _transferERC1155AssetFrom(
            params.buyOrder.erc1155Token,
            params.currentNftOwner,
            params.buyOrder.maker,
            params.erc1155TokenId,
            params.erc1155FillAmount
        );

        // The buyer pays the order fees.
        _payFees(
            params.buyOrder,
            params.buyOrder.maker,
            params.erc1155FillAmount,
            false
        );

        emit ERC1155OrderFilled(
            params.buyOrder.direction,
            params.buyOrder.erc20Token,
            erc20FillAmount,
            params.buyOrder.erc1155Token,
            params.erc1155TokenId,
            params.erc1155FillAmount,
            params.buyOrder.maker,
            params.taker,
            params.buyOrder.nonce,
            address(0)
        );
    }

    // Core settlement logic for buying an ERC1155 asset.
    // Used by `buyERC1155` and `batchBuyERC1155s`.
    function _buyERC1155(
        LibERC1155Order.ERC1155Order memory sellOrder,
        LibSignature.Signature memory signature,
        uint128 erc1155FillAmount,
        uint256 ethAvailable,
        bytes memory takerCallbackData
    )
        public
        payable
        returns (uint256 ethSpent)
    {
        {
            LibERC1155Order.OrderInfo memory orderInfo = getERC1155OrderInfo(sellOrder);
            // Check that the order can be filled.
            _validateSellOrder(
                sellOrder,
                signature,
                orderInfo,
                msg.sender
            );

            if (erc1155FillAmount > orderInfo.remainingERC1155FillableAmount) {
                LibERC1155OrdersRichErrors.ExceedsRemainingOrderAmount(
                    orderInfo.remainingERC1155FillableAmount,
                    erc1155FillAmount
                ).rrevert();
            }

            _updateOrderFilledAmount(orderInfo.orderHash, erc1155FillAmount);
        }

        uint256 erc20FillAmount;
        if (erc1155FillAmount == sellOrder.erc1155TokenAmount) {
            erc20FillAmount = sellOrder.erc20TokenAmount;
        } else {
            // Rounding favors the order maker.
            erc20FillAmount = LibMathV06.safeGetPartialAmountCeil(
                erc1155FillAmount,
                sellOrder.erc1155TokenAmount,
                sellOrder.erc20TokenAmount
            );
        }

        // Transfer the ERC1155 asset to the buyer (`msg.sender`).
        _transferERC1155AssetFrom(
            sellOrder.erc1155Token,
            sellOrder.maker,
            msg.sender,
            sellOrder.erc1155TokenId,
            erc1155FillAmount
        );

        if (takerCallbackData.length > 0) {
            require(
                msg.sender != address(this),
                "ERC1155OrdersFeature::_buyERC1155/CANNOT_CALLBACK_SELF"
            );
            uint256 ethBalanceBeforeCallback = address(this).balance;
            // Invoke the callback
            bytes4 callbackResult = IERC1155OrderCallback(msg.sender)
                .zeroExERC1155OrderCallback(takerCallbackData);
            ethAvailable = ethAvailable.safeAdd(
                address(this).balance.safeSub(ethBalanceBeforeCallback)
            );
            // Check for the magic success bytes
            require(
                callbackResult == TAKER_CALLBACK_MAGIC_BYTES,
                "ERC1155OrdersFeature::_sellERC1155/CALLBACK_FAILED"
            );
        }

        if (address(sellOrder.erc20Token) == NATIVE_TOKEN_ADDRESS) {
            // Check that we have enough ETH.
            if (ethAvailable < erc20FillAmount) {
                LibERC1155OrdersRichErrors.InsufficientEthError(
                    ethAvailable,
                    erc20FillAmount
                ).rrevert();
            }
            // Transfer ETH to the seller.
            _transferEth(payable(sellOrder.maker), erc20FillAmount);
            // Fees are paid from the EP's current balance of ETH.
            uint256 ethFees = _payFees(
                sellOrder,
                address(this),
                erc1155FillAmount,
                true
            );
            // Sum the amount of ETH spent.
            ethSpent = erc20FillAmount.safeAdd(ethFees);
        } else if (sellOrder.erc20Token == WETH) {
            // If there is enough ETH available, fill the WETH order
            // (including fees) using that ETH.
            // Otherwise, transfer WETH from the taker.
            if (ethAvailable >= erc20FillAmount) {
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
                    erc1155FillAmount,
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
                    erc1155FillAmount,
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
                erc1155FillAmount,
                false
            );
        }

        emit ERC1155OrderFilled(
            sellOrder.direction,
            sellOrder.erc20Token,
            erc20FillAmount,
            sellOrder.erc1155Token,
            sellOrder.erc1155TokenId,
            erc1155FillAmount,
            sellOrder.maker,
            msg.sender,
            sellOrder.nonce,
            address(0)
        );
    }

    function _validateSellOrder(
        LibERC1155Order.ERC1155Order memory sellOrder,
        LibSignature.Signature memory signature,
        LibERC1155Order.OrderInfo memory orderInfo,
        address taker
    )
        private
        view
    {
        // Order must be selling the ERC1155 asset.
        require(
            sellOrder.direction == LibERC1155Order.TradeDirection.SELL_1155,
            "ERC1155OrdersFeature::_validateSellOrder/WRONG_TRADE_DIRECTION"
        );
        // Taker must match the order taker, if one is specified.
        if (sellOrder.taker != address(0) && sellOrder.taker != taker) {
            LibERC1155OrdersRichErrors.OnlyTakerError(taker, sellOrder.taker).rrevert();
        }
        // Check that the order is valid and has not expired, been cancelled,
        // or been filled.
        if (orderInfo.status != LibERC1155Order.OrderStatus.FILLABLE) {
            LibERC1155OrdersRichErrors.OrderNotFillableError(
                sellOrder.maker,
                sellOrder.nonce,
                uint8(orderInfo.status)
            ).rrevert();
        }

        // Check the signature.
        _validateERC1155OrderSignature(orderInfo.orderHash, signature, sellOrder.maker);
    }

    function _validateBuyOrder(
        LibERC1155Order.ERC1155Order memory buyOrder,
        LibSignature.Signature memory signature,
        LibERC1155Order.OrderInfo memory orderInfo,
        address taker,
        uint256 erc1155TokenId
    )
        private
        view
    {
        // Order must be buying the ERC1155 asset.
        require(
            buyOrder.direction == LibERC1155Order.TradeDirection.BUY_1155,
            "ERC1155OrdersFeature::_validateBuyOrder/WRONG_TRADE_DIRECTION"
        );
        // The ERC20 token cannot be ETH.
        require(
            address(buyOrder.erc20Token) != NATIVE_TOKEN_ADDRESS,
            "ERC1155OrdersFeature::_validateBuyOrder/NATIVE_TOKEN_NOT_ALLOWED"
        );
        // Taker must match the order taker, if one is specified.
        if (buyOrder.taker != address(0) && buyOrder.taker != taker) {
            LibERC1155OrdersRichErrors.OnlyTakerError(taker, buyOrder.taker).rrevert();
        }
        // Check that the order is valid and has not expired, been cancelled,
        // or been filled.
        if (orderInfo.status != LibERC1155Order.OrderStatus.FILLABLE) {
            LibERC1155OrdersRichErrors.OrderNotFillableError(
                buyOrder.maker,
                buyOrder.nonce,
                uint8(orderInfo.status)
            ).rrevert();
        }
        // Check that the asset with the given token ID satisfies the properties
        // specified by the order.
        validateERC1155OrderProperties(buyOrder, erc1155TokenId);
        // Check the signature.
        _validateERC1155OrderSignature(orderInfo.orderHash, signature, buyOrder.maker);
    }

    function _payFees(
        LibERC1155Order.ERC1155Order memory order,
        address payer,
        uint128 erc1155FillAmount,
        bool useNativeToken
    )
        private
        returns (uint256 totalFeesPaid)
    {
        for (uint256 i = 0; i < order.fees.length; i++) {
            LibERC1155Order.Fee memory fee = order.fees[i];

            require(
                fee.recipient != address(this),
                "ERC1155OrdersFeature::_payFees/RECIPIENT_CANNOT_BE_EXCHANGE_PROXY"
            );

            uint256 feeFillAmount;
            if (erc1155FillAmount == order.erc1155TokenAmount) {
                feeFillAmount = fee.amount;
            } else {
                // Round in favor of the taker or maker
                feeFillAmount = LibMathV06.safeGetPartialAmountFloor(
                    erc1155FillAmount,
                    order.erc1155TokenAmount,
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
                    "ERC1155OrdersFeature::_payFees/CALLBACK_FAILED"
                );
            }
            // Sum the fees paid
            totalFeesPaid = totalFeesPaid.safeAdd(feeFillAmount);
        }
    }

    function _updateOrderFilledAmount(bytes32 orderHash, uint128 erc1155FillAmount)
        private
    {
        LibERC1155OrdersStorage.Storage storage stor = LibERC1155OrdersStorage.getStorage();
        // We require that
        //   erc1155FillAmount <= orderInfo.remainingERC1155FillableAmount
        // which implies that this will not overflow the bottom 128 bits.
        stor.orderState[orderHash] += erc1155FillAmount;
    }

    /// @dev Checks whether the given signature is valid for the
    ///      the given ERC1155 order. Reverts if not.
    /// @param order The ERC1155 order.
    /// @param signature The signature to validate.
    function validateERC1155OrderSignature(
        LibERC1155Order.ERC1155Order memory order,
        LibSignature.Signature memory signature
    )
        public
        override
        view
    {
        bytes32 orderHash = getERC1155OrderHash(order);
        _validateERC1155OrderSignature(orderHash, signature, order.maker);
    }

    function _validateERC1155OrderSignature(
        bytes32 orderHash,
        LibSignature.Signature memory signature,
        address maker
    )
        private
        view
    {
        if (signature.signatureType == LibSignature.SignatureType.PRESIGNED) {
            // Check if order hash has been pre-signed by the maker.
            uint256 orderState = LibERC1155OrdersStorage.getStorage()
                .orderState[orderHash];
            bool isPreSigned = orderState & PRESIGN_BIT != 0;
            if (!isPreSigned) {
                LibERC1155OrdersRichErrors.InvalidSignerError(maker, address(0)).rrevert();
            }
        } else {
            address signer = LibSignature.getSignerOfHash(orderHash, signature);
            if (signer != maker) {
                LibERC1155OrdersRichErrors.InvalidSignerError(maker, signer).rrevert();
            }
        }
    }

    /// @dev If the given order is buying an ERC1155 asset, checks
    ///      whether or not the given token ID satisfies the required
    ///      properties specified in the order. If the order does not
    ///      specify any properties, this function instead checks
    ///      whether the given token ID matches the ID in the order.
    ///      Reverts if any checks fail, or if the order is selling
    ///      an ERC1155 asset.
    /// @param order The ERC1155 order.
    /// @param erc1155TokenId The ID of the ERC1155 asset.
    function validateERC1155OrderProperties(
        LibERC1155Order.ERC1155Order memory order,
        uint256 erc1155TokenId
    )
        public
        override
        view
    {
        // Order must be buying an ERC1155 asset to have properties.
        require(
            order.direction == LibERC1155Order.TradeDirection.BUY_1155,
            "ERC1155OrdersFeature::validateERC1155OrderProperties/WRONG_TRADE_DIRECTION"
        );

        // If no properties are specified, check that the given
        // `erc1155TokenId` matches the one specified in the order.
        if (order.erc1155TokenProperties.length == 0) {
            if (erc1155TokenId != order.erc1155TokenId) {
                LibERC1155OrdersRichErrors.ERC1155TokenIdMismatchError(
                    erc1155TokenId,
                    order.erc1155TokenId
                ).rrevert();
            }
        }

        // Validate each property
        for (uint256 i = 0; i < order.erc1155TokenProperties.length; i++) {
            LibERC1155Order.Property memory property = order.erc1155TokenProperties[i];
            // `address(0)` is interpreted as a no-op. Any token ID
            // will satisfy a property with `propertyValidator == address(0)`.
            if (address(property.propertyValidator) == address(0)) {
                continue;
            }

            // Call the property validator and throw a descriptive error
            // if the call reverts.
            try property.propertyValidator.validateProperty(
                address(order.erc1155Token),
                erc1155TokenId,
                property.propertyData
            ) {} catch (bytes memory errorData) {
                LibERC1155OrdersRichErrors.PropertyValidationFailedError(
                    address(property.propertyValidator),
                    address(order.erc1155Token),
                    erc1155TokenId,
                    property.propertyData,
                    errorData
                ).rrevert();
            }
        }
    }

    /// @dev Get the order info for an ERC1155 order.
    /// @param order The ERC1155 order.
    /// @return orderInfo Infor about the order.
    function getERC1155OrderInfo(LibERC1155Order.ERC1155Order memory order)
        public
        override
        view
        returns (LibERC1155Order.OrderInfo memory orderInfo)
    {
        orderInfo.orderHash = getERC1155OrderHash(order);

        {
            LibERC1155OrdersStorage.Storage storage stor =
                LibERC1155OrdersStorage.getStorage();
            uint256 orderState = stor.orderState[orderInfo.orderHash];
            orderInfo.remainingERC1155FillableAmount = order.erc1155TokenAmount
                .safeSub128(uint128(orderState));

            if (orderInfo.remainingERC1155FillableAmount == 0) {
                orderInfo.status = LibERC1155Order.OrderStatus.FILLED;
                return orderInfo;
            }
            if (orderState & CANCEL_BIT != 0) {
                orderInfo.status = LibERC1155Order.OrderStatus.CANCELLED;
                return orderInfo;
            }
        }

        // Only buy orders with `erc1155TokenId` == 0 can be property
        // orders.
        if (order.erc1155TokenProperties.length > 0 &&
                (order.direction != LibERC1155Order.TradeDirection.BUY_1155 ||
                 order.erc1155TokenId != 0))
        {
            orderInfo.status = LibERC1155Order.OrderStatus.INVALID;
            return orderInfo;
        }

        // Buy orders cannot use ETH as the ERC20 token, since ETH cannot be
        // transferred from the buyer by a contract.
        if (order.direction == LibERC1155Order.TradeDirection.BUY_1155 &&
            address(order.erc20Token) == NATIVE_TOKEN_ADDRESS)
        {
            orderInfo.status = LibERC1155Order.OrderStatus.INVALID;
            return orderInfo;
        }

        // Check for expiry.
        if (order.expiry <= block.timestamp) {
            orderInfo.status = LibERC1155Order.OrderStatus.EXPIRED;
            return orderInfo;
        }

        // Otherwise, the order is fillable.
        orderInfo.status = LibERC1155Order.OrderStatus.FILLABLE;
    }

    /// @dev Get the canonical hash of an ERC1155 order.
    /// @param order The ERC1155 order.
    /// @return orderHash The order hash.
    function getERC1155OrderHash(LibERC1155Order.ERC1155Order memory order)
        public
        override
        view
        returns (bytes32 orderHash)
    {
        return _getEIP712Hash(LibERC1155Order.getERC1155OrderStructHash(order));
    }
}
