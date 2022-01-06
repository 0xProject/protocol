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
import "../errors/LibERC721OrdersRichErrors.sol";
import "../fixins/FixinCommon.sol";
import "../fixins/FixinEIP712.sol";
import "../fixins/FixinERC721Spender.sol";
import "../fixins/FixinTokenSpender.sol";
import "../migrations/LibMigrate.sol";
import "../storage/LibERC721OrdersStorage.sol";
import "../vendor/IERC721OrderCallback.sol";
import "../vendor/IFeeRecipient.sol";
import "./interfaces/IFeature.sol";
import "./interfaces/IERC721OrdersFeature.sol";
import "./libs/LibERC721Order.sol";
import "./libs/LibSignature.sol";


/// @dev Feature for interacting with ERC721 orders.
contract ERC721OrdersFeature is
    IFeature,
    IERC721OrdersFeature,
    FixinCommon,
    FixinEIP712,
    FixinERC721Spender,
    FixinTokenSpender
{
    using LibSafeMathV06 for uint256;

    /// @dev Name of this feature.
    string public constant override FEATURE_NAME = "ERC721Orders";
    /// @dev Version of this feature.
    uint256 public immutable override FEATURE_VERSION = _encodeVersion(1, 0, 0);
    /// @dev Native token pseudo-address.
    address constant private NATIVE_TOKEN_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    /// @dev The WETH token contract.
    IEtherTokenV06 private immutable WETH;

    /// @dev The magic return value indicating the success of a `receiveZeroExFeeCallback`.
    bytes4 private constant FEE_CALLBACK_MAGIC_BYTES = IFeeRecipient.receiveZeroExFeeCallback.selector;
    /// @dev The magic return value indicating the success of a `zeroExERC721OrderCallback`.
    bytes4 private constant TAKER_CALLBACK_MAGIC_BYTES = IERC721OrderCallback.zeroExERC721OrderCallback.selector;
    /// @dev The magic return value indicating the success of a `onERC721Received`.
    bytes4 private constant ERC721_RECEIVED_MAGIC_BYTES = this.onERC721Received.selector;


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
        _registerFeatureFunction(this.sellERC721.selector);
        _registerFeatureFunction(this.buyERC721.selector);
        _registerFeatureFunction(this.cancelERC721Order.selector);
        _registerFeatureFunction(this.batchBuyERC721s.selector);
        _registerFeatureFunction(this.matchERC721Orders.selector);
        _registerFeatureFunction(this.batchMatchERC721Orders.selector);
        _registerFeatureFunction(this.onERC721Received.selector);
        _registerFeatureFunction(this.preSignERC721Order.selector);
        _registerFeatureFunction(this.validateERC721OrderSignature.selector);
        _registerFeatureFunction(this.validateERC721OrderProperties.selector);
        _registerFeatureFunction(this.getERC721OrderStatus.selector);
        _registerFeatureFunction(this.getERC721OrderHash.selector);
        _registerFeatureFunction(this.getERC721OrderStatusBitVector.selector);
        return LibMigrate.MIGRATE_SUCCESS;
    }

    /// @dev Sells an ERC721 asset to fill the given order.
    /// @param order The ERC721 order.
    /// @param signature The order signature from the maker.
    /// @param erc721TokenId The ID of the ERC721 asset being
    ///        sold. If the given order specifies properties,
    ///        the asset must satisfy those properties. Otherwise,
    ///        it must equal the tokenId in the order.
    /// @param unwrapNativeToken If this parameter is true and the
    ///        ERC20 token of the order is e.g. WETH, unwraps the
    ///        token before transferring it to the taker.
    /// @param callbackData If this parameter is non-zero, invokes
    ///        `zeroExERC721OrderCallback` on `msg.sender` after
    ///        the ERC20 tokens have been transferred to `msg.sender`
    ///        but before transferring the ERC721 asset to the buyer.
    function sellERC721(
        LibERC721Order.ERC721Order memory order,
        LibSignature.Signature memory signature,
        uint256 erc721TokenId,
        bool unwrapNativeToken,
        bytes memory callbackData
    )
        public
        override
    {
        _sellERC721(
            order,
            signature,
            erc721TokenId,
            unwrapNativeToken,
            msg.sender, // taker
            msg.sender, // owner
            callbackData
        );
    }

    /// @dev Buys an ERC721 asset by filling the given order.
    /// @param order The ERC721 order.
    /// @param signature The order signature.
    /// @param callbackData If this parameter is non-zero, invokes
    ///        `zeroExERC721OrderCallback` on `msg.sender` after
    ///        the ERC721 asset has been transferred to `msg.sender`
    ///        but before transferring the ERC20 tokens to the seller.
    ///        Native tokens acquired during the callback can be used
    ///        to fill the order.
    function buyERC721(
        LibERC721Order.ERC721Order memory order,
        LibSignature.Signature memory signature,
        bytes memory callbackData
    )
        public
        override
        payable
    {
        uint256 ethBalanceBefore = address(this).balance
            .safeSub(msg.value);
        _buyERC721(
            order,
            signature,
            msg.value,
            callbackData
        );
        uint256 ethBalanceAfter = address(this).balance;
        // Cannot spent more than `msg.value`
        if (ethBalanceAfter < ethBalanceBefore) {
            LibERC721OrdersRichErrors.OverspentEthError(
                ethBalanceBefore - ethBalanceAfter + msg.value,
                msg.value
            ).rrevert();
        }
        // Refund
        _transferEth(msg.sender, ethBalanceAfter - ethBalanceBefore);
    }

    /// @dev Cancel a single ERC721 order by its nonce. The caller
    ///      should be the maker of the order. Silently succeeds if
    ///      an order with the same nonce has already been filled or
    ///      cancelled.
    /// @param orderNonce The order nonce.
    function cancelERC721Order(uint256 orderNonce)
        public
        override
    {
        // Mark order as cancelled
        _setOrderStatusBit(msg.sender, orderNonce);

        emit ERC721OrderCancelled(
            msg.sender,
            orderNonce
        );
    }

    /// @dev Buys multiple ERC721 assets by filling the
    ///      given orders.
    /// @param orders The ERC721 orders.
    /// @param signatures The order signatures.
    /// @param revertIfIncomplete If true, reverts if this
    ///        function fails to fill any individual order.
    /// @return successes An array of booleans corresponding to whether
    ///         each order in `orders` was successfully filled.
    function batchBuyERC721s(
        LibERC721Order.ERC721Order[] memory orders,
        LibSignature.Signature[] memory signatures,
        bool revertIfIncomplete
    )
        public
        override
        payable
        returns (bool[] memory successes)
    {
        require(
            orders.length == signatures.length,
            "ERC721OrdersFeature::batchBuyERC721s/ARRAY_LENGTH_MISMATCH"
        );
        successes = new bool[](orders.length);

        uint256 ethSpent = 0;
        for (uint256 i = 0; i < orders.length; i++) {
            bytes memory returnData;
            // Delegatecall `_buyERC721` to track ETH consumption while
            // preserving execution context.
            // Note that `_buyERC721` is a public function but should _not_
            // be registered in the Exchange Proxy.
            (successes[i], returnData) = _implementation.delegatecall(
                abi.encodeWithSelector(
                    this._buyERC721.selector,
                    orders[i],
                    signatures[i],
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
            LibERC721OrdersRichErrors.OverspentEthError(
                ethSpent,
                msg.value
            ).rrevert();
        }

        // Refund
        _transferEth(msg.sender, msg.value - ethSpent);
    }

    /// @dev Matches a pair of complementary orders that have
    ///      a non-negative spread. Each order is filled at
    ///      their respective price, and the matcher receives
    ///      a profit denominated in the ERC20 token.
    /// @param sellOrder Order selling an ERC721 asset.
    /// @param buyOrder Order buying an ERC721 asset.
    /// @param sellOrderSignature Signature for the sell order.
    /// @param buyOrderSignature Signature for the buy order.
    /// @return profit The amount of profit earned by the caller
    ///         of this function (denominated in the ERC20 token
    ///         of the matched orders).
    function matchERC721Orders(
        LibERC721Order.ERC721Order memory sellOrder,
        LibERC721Order.ERC721Order memory buyOrder,
        LibSignature.Signature memory sellOrderSignature,
        LibSignature.Signature memory buyOrderSignature
    )
        public
        override
        returns (uint256 profit)
    {
        _validateSellOrder(sellOrder, sellOrderSignature);
        _validateBuyOrder(
            buyOrder,
            buyOrderSignature,
            sellOrder.maker,
            sellOrder.erc721TokenId
        );

        // The ERC721 tokens must match
        if (sellOrder.erc721Token != buyOrder.erc721Token) {
            LibERC721OrdersRichErrors.ERC721TokenMismatchError(
                address(sellOrder.erc721Token),
                address(buyOrder.erc721Token)
            ).rrevert();
        }
        // The ERC20 tokens must match. Okay if the sell order specifies ETH
        // and the buy order specifies WETH; we will unwrap the WETH before
        // sending it to `sellOrder.maker`.
        bool isWethBuyEthSell =
            address(sellOrder.erc20Token) == NATIVE_TOKEN_ADDRESS &&
            buyOrder.erc20Token == WETH;
        if (sellOrder.erc20Token != buyOrder.erc20Token && !isWethBuyEthSell) {
            LibERC721OrdersRichErrors.ERC20TokenMismatchError(
                address(sellOrder.erc20Token),
                address(buyOrder.erc20Token)
            ).rrevert();
        }
        // The buyer must be willing to pay at least the amount that the
        // seller is asking.
        if (buyOrder.erc20TokenAmount < sellOrder.erc20TokenAmount) {
            LibERC721OrdersRichErrors.NegativeSpreadError(
                sellOrder.erc20TokenAmount,
                buyOrder.erc20TokenAmount
            ).rrevert();
        }

        // The difference in ERC20 token amounts is the spread.
        uint256 spread = buyOrder.erc20TokenAmount - sellOrder.erc20TokenAmount;

        // Mark both orders as filled.
        _setOrderStatusBit(sellOrder.maker, sellOrder.nonce);
        _setOrderStatusBit(buyOrder.maker, buyOrder.nonce);

        // Transfer the ERC721 asset from seller to buyer.
        _transferERC721AssetFrom(
            sellOrder.erc721Token,
            sellOrder.maker,
            buyOrder.maker,
            sellOrder.erc721TokenId
        );

        // Handle the ERC20 side of the order:
        if (
            address(sellOrder.erc20Token) == NATIVE_TOKEN_ADDRESS &&
            buyOrder.erc20Token == WETH
        ) {
            // The sell order specifies ETH, while the buy order specifies WETH.
            // The orders are still compatible with one another, but we'll have
            // to unwrap the WETH on behalf of the buyer.

            // Step 1: Transfer WETH from the buyer to the EP.
            //         Note that we transfer `buyOrder.erc20TokenAmount`, which
            //         is the amount the buyer signaled they are willing to pay
            //         for the ERC721 asset, which may be more than the seller's
            //         ask.
            _transferERC20TokensFrom(
                WETH,
                buyOrder.maker,
                address(this),
                buyOrder.erc20TokenAmount
            );
            // Step 2: Unwrap the WETH into ETH. We unwrap the entire
            //         `buyOrder.erc20TokenAmount`.
            //         The ETH will be used for three purposes:
            //         - To pay the seller
            //         - To pay fees for the sell order
            //         - Any remaining ETH will be sent to
            //           `msg.sender` as profit.
            WETH.withdraw(buyOrder.erc20TokenAmount);

            // Step 3: Pay the seller (in ETH).
            _transferEth(payable(sellOrder.maker), sellOrder.erc20TokenAmount);

            // Step 4: Pay fees for the buy order. Note that these are paid
            //         in _WETH_ by the _buyer_. By signing the buy order, the
            //         buyer signals that they are willing to spend a total
            //         of `erc20TokenAmount` _plus_ fees, all denominated in
            //         the `erc20Token`, which in this case is WETH.
            _payFees(buyOrder, buyOrder.maker, false);

            // Step 5: Pay fees for the sell order. The `erc20Token` of the
            //         sell order is ETH, so the fees are paid out in ETH.
            //         There should be `spread` wei of ETH remaining in the
            //         EP at this point, which we will use ETH to pay the
            //         sell order fees.
            uint256 sellOrderFees = _payFees(sellOrder, address(this), true);

            // Step 6: The spread must be enough to cover the sell order fees.
            //         If not, either `_payFees` will have reverted, or we
            //         have spent ETH that was in the EP before this
            //         `matchERC721Orders` call, which we disallow.
            if (spread < sellOrderFees) {
                LibERC721OrdersRichErrors.SellOrderFeesExceedSpreadError(
                    sellOrderFees,
                    spread
                ).rrevert();
            }
            // Step 7: The spread less the sell order fees is the amount of ETH
            //         remaining in the EP that can be sent to `msg.sender` as
            //         the profit from matching these two orders.
            profit = spread - sellOrderFees;
            if (profit > 0) {
                _transferEth(msg.sender, profit);
            }
        } else {
            // Step 1: Transfer the ERC20 token from the buyer to the seller.
            //         Note that we transfer `sellOrder.erc20TokenAmount`, which
            //         is at most `buyOrder.erc20TokenAmount`.
            _transferERC20TokensFrom(
                buyOrder.erc20Token,
                buyOrder.maker,
                sellOrder.maker,
                sellOrder.erc20TokenAmount
            );

            // Step 2: Pay fees for the buy order. Note that these are paid
            //         by the buyer. By signing the buy order, the buyer signals
            //         that they are willing to spend a total of
            //         `buyOrder.erc20TokenAmount` _plus_ `buyOrder.fees`.
            _payFees(buyOrder, buyOrder.maker, false);

            // Step 3: Pay fees for the sell order. These are paid by the buyer
            //         as well. After paying these fees, we may have taken more
            //         from the buyer than they agreed to in the buy order. If
            //         so, we revert in the following step.
            uint256 sellOrderFees = _payFees(sellOrder, buyOrder.maker, false);

            // Step 4: The spread must be enough to cover the sell order fees.
            //         If not, `_payFees` will have taken more tokens from the
            //         buyer than they had agreed to in the buy order, in which
            //         case we revert here.
            if (spread < sellOrderFees) {
                LibERC721OrdersRichErrors.SellOrderFeesExceedSpreadError(
                    sellOrderFees,
                    spread
                ).rrevert();
            }

            // Step 7: We calculate the profit as:
            //         profit = buyOrder.erc20TokenAmount - sellOrder.erc20TokenAmount - sellOrderFees
            //                = spread - sellOrderFees
            //         I.e. the buyer would've been willing to pay up to `profit`
            //         more to buy the asset, so instead that amount is sent to
            //         `msg.sender` as the profit from matching these two orders.
            profit = spread - sellOrderFees;
            if (profit > 0) {
                _transferERC20TokensFrom(
                    buyOrder.erc20Token,
                    buyOrder.maker,
                    msg.sender,
                    profit
                );
            }
        }

        emit ERC721OrderFilled(
            LibERC721Order.TradeDirection.SELL_721,
            sellOrder.erc20Token,
            sellOrder.erc20TokenAmount,
            sellOrder.erc721Token,
            sellOrder.erc721TokenId,
            sellOrder.maker,
            buyOrder.maker, // taker
            sellOrder.nonce,
            msg.sender
        );

        emit ERC721OrderFilled(
            LibERC721Order.TradeDirection.BUY_721,
            buyOrder.erc20Token,
            buyOrder.erc20TokenAmount,
            buyOrder.erc721Token,
            sellOrder.erc721TokenId,
            buyOrder.maker,
            sellOrder.maker, // taker
            buyOrder.nonce,
            msg.sender
        );
    }

    /// @dev Matches pairs of complementary orders that have
    ///      non-negative spreads. Each order is filled at
    ///      their respective price, and the matcher receives
    ///      a profit denominated in the ERC20 token.
    /// @param sellOrders Orders selling ERC721 assets.
    /// @param buyOrders Orders buying ERC721 assets.
    /// @param sellOrderSignatures Signatures for the sell orders.
    /// @param buyOrderSignatures Signatures for the buy orders.
    /// @param revertIfIncomplete Revert if any match operation fails.
    /// @return profits The amount of profit earned by the caller
    ///         of this function for each pair of matched orders
    ///         (denominated in the ERC20 token of the order pair).
    /// @return successes An array of booleans corresponding to
    ///         whether each pair of orders was successfully matched.
    function batchMatchERC721Orders(
        LibERC721Order.ERC721Order[] memory sellOrders,
        LibERC721Order.ERC721Order[] memory buyOrders,
        LibSignature.Signature[] memory sellOrderSignatures,
        LibSignature.Signature[] memory buyOrderSignatures,
        bool revertIfIncomplete
    )
        public
        override
        returns (uint256[] memory profits, bool[] memory successes)
    {
        require(
            sellOrders.length == buyOrders.length &&
            sellOrderSignatures.length == buyOrderSignatures.length &&
            sellOrders.length == sellOrderSignatures.length,
            "Array length mismatch"
        );
        profits = new uint256[](sellOrders.length);
        successes = new bool[](sellOrders.length);

        for (uint256 i = 0; i < sellOrders.length; i++) {
            bytes memory returnData;
            // Delegatecall `matchERC721Orders` to catch reverts while
            // preserving execution context.
            (successes[i], returnData) = _implementation.delegatecall(
                abi.encodeWithSelector(
                    this.matchERC721Orders.selector,
                    sellOrders[i],
                    buyOrders[i],
                    sellOrderSignatures[i],
                    buyOrderSignatures[i]
                )
            );
            if (successes[i]) {
                // If the matching succeeded, record the profit.
                (uint256 profit) = abi.decode(returnData, (uint256));
                profits[i] = profit;
            } else if (revertIfIncomplete) {
                returnData.rrevert();
            }
        }
    }

    /// @dev Callback for the ERC721 `safeTransferFrom` function.
    ///      This callback can be used to sell an ERC721 asset if
    ///      a valid ERC721 order, signature and `unwrapNativeToken`
    ///      are encoded in `data`. This allows takers to sell their
    ///      ERC721 asset without first calling `setApprovalForAll`.
    /// @param operator The address which called `safeTransferFrom`.
    /// @param from The address which previously owned the token.
    /// @param tokenId The ID of the asset being transferred.
    /// @param data Additional data with no specified format. If a
    ///        valid ERC721 order, signature and `unwrapNativeToken`
    ///        are encoded in `data`, this function will try to fill
    ///        the order using the received asset.
    /// @return success The selector of this function (0x150b7a02),
    ///         indicating that the callback succeeded.
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
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
            LibERC721Order.ERC721Order memory buyOrder,
            LibSignature.Signature memory signature,
            bool unwrapNativeToken
        ) = abi.decode(
            data,
            (LibERC721Order.ERC721Order, LibSignature.Signature, bool)
        );

        // `onERC721Received` is called by the ERC721 token contract.
        // Check that it matches the ERC721 token in the order.
        if (msg.sender != address(buyOrder.erc721Token)) {
            LibERC721OrdersRichErrors.ERC721TokenMismatchError(
                msg.sender,
                address(buyOrder.erc721Token)
            ).rrevert();
        }

        _sellERC721(
            buyOrder,
            signature,
            tokenId,
            unwrapNativeToken,
            operator,       // taker
            address(this),  // owner (we hold the NFT currently)
            new bytes(0)    // No taker callback
        );

        return ERC721_RECEIVED_MAGIC_BYTES;
    }

    /// @dev Approves an ERC721 order hash on-chain. After pre-signing
    ///      a hash, the `PRESIGNED` signature type will become valid
    ///      for that order and signer.
    /// @param orderHash An ERC721 order hash.
    function preSignERC721Order(bytes32 orderHash)
        external
        override
    {
        LibERC721OrdersStorage.getStorage()
            .preSigned[orderHash][msg.sender] = true;
    }

    // Core settlment logic for selling an ERC721 asset.
    // Used by `sellERC721` and `onERC721Received`.
    function _sellERC721(
        LibERC721Order.ERC721Order memory buyOrder,
        LibSignature.Signature memory signature,
        uint256 erc721TokenId,
        bool unwrapNativeToken,
        address taker,
        address nftOwner,
        bytes memory takerCallbackData
    )
        private
    {
        // Check that the order can be filled.
        _validateBuyOrder(
            buyOrder,
            signature,
            taker,
            erc721TokenId
        );

        // Mark the order as filled.
        _setOrderStatusBit(buyOrder.maker, buyOrder.nonce);

        if (unwrapNativeToken) {
            // The ERC20 token must be WETH for it to be unwrapped.
            if (buyOrder.erc20Token != WETH) {
                LibERC721OrdersRichErrors.ERC20TokenMismatchError(
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
                buyOrder.erc20TokenAmount
            );
            // Unwrap WETH into ETH.
            WETH.withdraw(buyOrder.erc20TokenAmount);
            // Send ETH to the seller.
            _transferEth(payable(taker), buyOrder.erc20TokenAmount);
        } else {
            // Transfer the ERC20 token from the buyer to the seller.
            _transferERC20TokensFrom(
                buyOrder.erc20Token,
                buyOrder.maker,
                taker,
                buyOrder.erc20TokenAmount
            );
        }

        if (takerCallbackData.length > 0) {
            require(
                taker != address(this),
                "ERC721OrdersFeature::_sellERC721/CANNOT_CALLBACK_SELF"
            );
            // Invoke the callback
            bytes4 callbackResult = IERC721OrderCallback(taker)
                .zeroExERC721OrderCallback(takerCallbackData);
            // Check for the magic success bytes
            require(
                callbackResult == TAKER_CALLBACK_MAGIC_BYTES,
                "ERC721OrdersFeature::_sellERC721/CALLBACK_FAILED"
            );
        }

        // Transfer the ERC721 asset to the buyer.
        // If this function is called from the
        // `onERC721Received` callback the Exchange Proxy
        // holds the asset. Otherwise, transfer it from
        // the seller.
        _transferERC721AssetFrom(
            buyOrder.erc721Token,
            nftOwner,
            buyOrder.maker,
            erc721TokenId
        );

        // The buyer pays the order fees.
        _payFees(buyOrder, buyOrder.maker, false);

        emit ERC721OrderFilled(
            buyOrder.direction,
            buyOrder.erc20Token,
            buyOrder.erc20TokenAmount,
            buyOrder.erc721Token,
            erc721TokenId,
            buyOrder.maker,
            taker,
            buyOrder.nonce,
            address(0)
        );
    }

    // Core settlement logic for buying an ERC721 asset.
    // Used by `buyERC721` and `batchBuyERC721s`.
    function _buyERC721(
        LibERC721Order.ERC721Order memory sellOrder,
        LibSignature.Signature memory signature,
        uint256 ethAvailable,
        bytes memory takerCallbackData
    )
        public
        payable
        returns (uint256 ethSpent)
    {
        // Check that the order can be filled.
        _validateSellOrder(sellOrder, signature);

        // Mark the order as filled.
        _setOrderStatusBit(sellOrder.maker, sellOrder.nonce);

        // Transfer the ERC721 asset to the buyer (`msg.sender`).
        _transferERC721AssetFrom(
            sellOrder.erc721Token,
            sellOrder.maker,
            msg.sender,
            sellOrder.erc721TokenId
        );

        if (takerCallbackData.length > 0) {
            require(
                msg.sender != address(this),
                "ERC721OrdersFeature::_buyERC721/CANNOT_CALLBACK_SELF"
            );
            uint256 ethBalanceBeforeCallback = address(this).balance;
            // Invoke the callback
            bytes4 callbackResult = IERC721OrderCallback(msg.sender)
                .zeroExERC721OrderCallback(takerCallbackData);
            ethAvailable = ethAvailable.safeAdd(
                address(this).balance.safeSub(ethBalanceBeforeCallback)
            );
            // Check for the magic success bytes
            require(
                callbackResult == TAKER_CALLBACK_MAGIC_BYTES,
                "ERC721OrdersFeature::_sellERC721/CALLBACK_FAILED"
            );
        }

        if (address(sellOrder.erc20Token) == NATIVE_TOKEN_ADDRESS) {
            // Check that we have enough ETH.
            if (ethAvailable < sellOrder.erc20TokenAmount) {
                LibERC721OrdersRichErrors.InsufficientEthError(
                    ethAvailable,
                    sellOrder.erc20TokenAmount
                ).rrevert();
            }
            // Transfer ETH to the seller.
            _transferEth(payable(sellOrder.maker), sellOrder.erc20TokenAmount);
            // Fees are paid from the EP's current balance of ETH.
            uint256 ethFees = _payFees(sellOrder, address(this), true);
            // Sum the amount of ETH spent.
            ethSpent = sellOrder.erc20TokenAmount.safeAdd(ethFees);
        } else if (sellOrder.erc20Token == WETH) {
            // If there is enough ETH available, fill the WETH order
            // (including fees) using that ETH.
            // Otherwise, transfer WETH from the taker.
            if (ethAvailable >= sellOrder.erc20TokenAmount) {
                // Wrap ETH.
                WETH.deposit{value: sellOrder.erc20TokenAmount}();
                // TODO: Probably safe to just use WETH.transfer for some
                //       small gas savings
                // Transfer WETH to the seller.
                _transferERC20Tokens(
                    WETH,
                    sellOrder.maker,
                    sellOrder.erc20TokenAmount
                );
                // Pay fees using ETH.
                uint256 ethFees = _payFees(sellOrder, address(this), true);
                // Sum the amount of ETH spent.
                ethSpent = sellOrder.erc20TokenAmount.safeAdd(ethFees);
            } else {
                // Transfer WETH from the buyer to the seller.
                _transferERC20TokensFrom(
                    sellOrder.erc20Token,
                    msg.sender,
                    sellOrder.maker,
                    sellOrder.erc20TokenAmount
                );
                // The buyer pays fees using WETH.
                _payFees(sellOrder, msg.sender, false);
            }
        } else {
            // Transfer ERC20 token from the buyer to the seller.
            _transferERC20TokensFrom(
                sellOrder.erc20Token,
                msg.sender,
                sellOrder.maker,
                sellOrder.erc20TokenAmount
            );
            // The buyer pays fees.
            _payFees(sellOrder, msg.sender, false);
        }

        emit ERC721OrderFilled(
            sellOrder.direction,
            sellOrder.erc20Token,
            sellOrder.erc20TokenAmount,
            sellOrder.erc721Token,
            sellOrder.erc721TokenId,
            sellOrder.maker,
            msg.sender,
            sellOrder.nonce,
            address(0)
        );
    }

    function _validateSellOrder(
        LibERC721Order.ERC721Order memory order,
        LibSignature.Signature memory signature
    )
        private
        view
    {
        // Order must be selling the ERC721 asset.
        require(
            order.direction == LibERC721Order.TradeDirection.SELL_721,
            "ERC721OrdersFeature::_validateSellOrder/WRONG_TRADE_DIRECTION"
        );
        // The taker must either be unspecified in the order, or it must
        // be equal to `msg.sender`.
        if (order.taker != address(0) && order.taker != msg.sender) {
            LibERC721OrdersRichErrors.OnlyTakerError(msg.sender, order.taker).rrevert();
        }
        // Check that the order is valid and has not expired, been cancelled,
        // or been filled.
        LibERC721Order.OrderStatus status = getERC721OrderStatus(order);
        if (getERC721OrderStatus(order) != LibERC721Order.OrderStatus.FILLABLE) {
            LibERC721OrdersRichErrors.OrderNotFillableError(
                order.maker,
                order.nonce,
                uint8(status)
            ).rrevert();
        }
        // Check the signature.
        validateERC721OrderSignature(order, signature);
    }

    function _validateBuyOrder(
        LibERC721Order.ERC721Order memory buyOrder,
        LibSignature.Signature memory signature,
        address taker,
        uint256 erc721TokenId
    )
        private
        view
    {
        // Order must be buying the ERC721 asset.
        require(
            buyOrder.direction == LibERC721Order.TradeDirection.BUY_721,
            "ERC721OrdersFeature::_validateBuyOrder/WRONG_TRADE_DIRECTION"
        );
        // The ERC20 token cannot be ETH.
        require(
            address(buyOrder.erc20Token) != NATIVE_TOKEN_ADDRESS,
            "ERC721OrdersFeature::_validateBuyOrder/NATIVE_TOKEN_NOT_ALLOWED"
        );
        // The taker must either be unspecified in the order, or it must
        // be equal to `msg.sender`.
        if (buyOrder.taker != address(0) && buyOrder.taker != taker) {
            LibERC721OrdersRichErrors.OnlyTakerError(taker, buyOrder.taker).rrevert();
        }
        // Check that the order is valid and has not expired, been cancelled,
        // or been filled.
        LibERC721Order.OrderStatus status = getERC721OrderStatus(buyOrder);
        if (getERC721OrderStatus(buyOrder) != LibERC721Order.OrderStatus.FILLABLE) {
            LibERC721OrdersRichErrors.OrderNotFillableError(
                buyOrder.maker,
                buyOrder.nonce,
                uint8(status)
            ).rrevert();
        }
        // Check that the asset with the given token ID satisfies the properties
        // specified by the order.
        validateERC721OrderProperties(buyOrder, erc721TokenId);
        // Check the signature.
        validateERC721OrderSignature(buyOrder, signature);
    }

    function _payFees(
        LibERC721Order.ERC721Order memory order,
        address payer,
        bool useNativeToken
    )
        private
        returns (uint256 totalFeesPaid)
    {
        for (uint256 i = 0; i < order.fees.length; i++) {
            LibERC721Order.Fee memory fee = order.fees[i];

            require(
                fee.recipient != address(this),
                "ERC721OrdersFeature::_payFees/RECIPIENT_CANNOT_BE_EXCHANGE_PROXY"
            );

            if (useNativeToken) {
                assert(payer == address(this));
                // Transfer ETH to the fee recipient.
                _transferEth(payable(fee.recipient), fee.amount);
            } else {
                // Transfer ERC20 token from payer to recipient.
                _transferERC20TokensFrom(
                    order.erc20Token,
                    payer,
                    fee.recipient,
                    fee.amount
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
                    fee.amount,
                    fee.feeData
                );
                // Check for the magic success bytes
                require(
                    callbackResult == FEE_CALLBACK_MAGIC_BYTES,
                    "ERC721OrdersFeature::_payFees/CALLBACK_FAILED"
                );
            }
            // Sum the fees paid
            totalFeesPaid = totalFeesPaid.safeAdd(fee.amount);
        }
    }

    function _setOrderStatusBit(address maker, uint256 nonce)
        private
    {
        // The bitvector is indexed by the lower 8 bits of the nonce.
        uint256 flag = 1 << (nonce % 256);
        // Update order status bit vector to indicate that the given order
        // has been cancelled/filled by setting the designated bit to 1.
        LibERC721OrdersStorage.getStorage().orderStatusByMaker
            [maker][uint248(nonce >> 8)] |= flag;
    }


    /// @dev Checks whether the given signature is valid for the
    ///      the given ERC721 order. Reverts if not.
    /// @param order The ERC721 order.
    /// @param signature The signature to validate.
    function validateERC721OrderSignature(
        LibERC721Order.ERC721Order memory order,
        LibSignature.Signature memory signature
    )
        public
        override
        view
    {
        bytes32 orderHash = getERC721OrderHash(order);
        if (signature.signatureType == LibSignature.SignatureType.PRESIGNED) {
            // Check if order hash has been pre-signed by the maker.
            bool isPreSigned = LibERC721OrdersStorage.getStorage()
                .preSigned[orderHash][order.maker];
            if (!isPreSigned) {
                LibERC721OrdersRichErrors.InvalidSignerError(order.maker, address(0)).rrevert();
            }
        } else {
            address signer = LibSignature.getSignerOfHash(orderHash, signature);
            if (signer != order.maker) {
                LibERC721OrdersRichErrors.InvalidSignerError(order.maker, signer).rrevert();
            }
        }
    }

    /// @dev If the given order is buying an ERC721 asset, checks
    ///      whether or not the given token ID satisfies the required
    ///      properties specified in the order. If the order does not
    ///      specify any properties, this function instead checks
    ///      whether the given token ID matches the ID in the order.
    ///      Reverts if any checks fail, or if the order is selling
    ///      an ERC721 asset.
    /// @param order The ERC721 order.
    /// @param erc721TokenId The ID of the ERC721 asset.
    function validateERC721OrderProperties(
        LibERC721Order.ERC721Order memory order,
        uint256 erc721TokenId
    )
        public
        override
        view
    {
        // Order must be buying an ERC721 asset to have properties.
        require(
            order.direction == LibERC721Order.TradeDirection.BUY_721,
            "ERC721OrdersFeature::validateERC721OrderProperties/WRONG_TRADE_DIRECTION"
        );

        // If no properties are specified, check that the given
        // `erc721TokenId` matches the one specified in the order.
        if (order.erc721TokenProperties.length == 0) {
            if (erc721TokenId != order.erc721TokenId) {
                LibERC721OrdersRichErrors.ERC721TokenIdMismatchError(
                    erc721TokenId,
                    order.erc721TokenId
                ).rrevert();
            }
        }

        // Validate each property
        for (uint256 i = 0; i < order.erc721TokenProperties.length; i++) {
            LibERC721Order.Property memory property = order.erc721TokenProperties[i];
            // `address(0)` is interpreted as a no-op. Any token ID
            // will satisfy a property with `propertyValidator == address(0)`.
            if (address(property.propertyValidator) == address(0)) {
                continue;
            }

            // Call the property validator and throw a descriptive error
            // if the call reverts.
            try property.propertyValidator.validateProperty(
                address(order.erc721Token),
                erc721TokenId,
                property.propertyData
            ) {} catch (bytes memory errorData) {
                LibERC721OrdersRichErrors.PropertyValidationFailedError(
                    address(property.propertyValidator),
                    address(order.erc721Token),
                    erc721TokenId,
                    property.propertyData,
                    errorData
                ).rrevert();
            }
        }
    }

    /// @dev Get the current status of an ERC721 order.
    /// @param order The ERC721 order.
    /// @return status The status of the order.
    function getERC721OrderStatus(LibERC721Order.ERC721Order memory order)
        public
        override
        view
        returns (LibERC721Order.OrderStatus status)
    {
        // Only buy orders with `erc721TokenId` == 0 can be property
        // orders.
        if (order.erc721TokenProperties.length > 0 &&
                (order.direction != LibERC721Order.TradeDirection.BUY_721 ||
                 order.erc721TokenId != 0))
        {
            return LibERC721Order.OrderStatus.INVALID;
        }

        // Buy orders cannot use ETH as the ERC20 token, since ETH cannot be
        // transferred from the buyer by a contract.
        if (order.direction == LibERC721Order.TradeDirection.BUY_721 &&
            address(order.erc20Token) == NATIVE_TOKEN_ADDRESS)
        {
            return LibERC721Order.OrderStatus.INVALID;
        }

        // Check for expiry.
        if (order.expiry <= block.timestamp) {
            return LibERC721Order.OrderStatus.EXPIRED;
        }

        // Check `orderStatusByMaker` state variable to see if the order
        // has been cancelled or previously filled.
        LibERC721OrdersStorage.Storage storage stor =
            LibERC721OrdersStorage.getStorage();
        // `orderStatusByMaker` is indexed by maker and nonce.
        uint256 orderStatusBitVector =
            stor.orderStatusByMaker[order.maker][uint248(order.nonce >> 8)];
        // The bitvector is indexed by the lower 8 bits of the nonce.
        uint256 flag = 1 << (order.nonce % 256);
        // If the designated bit is set, the order has been cancelled or
        // previously filled, so it is now unfillable.
        if (orderStatusBitVector & flag != 0) {
            return LibERC721Order.OrderStatus.UNFILLABLE;
        }

        // Otherwise, the order is fillable.
        return LibERC721Order.OrderStatus.FILLABLE;
    }

    /// @dev Get the canonical hash of an ERC721 order.
    /// @param order The ERC721 order.
    /// @return orderHash The order hash.
    function getERC721OrderHash(LibERC721Order.ERC721Order memory order)
        public
        override
        view
        returns (bytes32 orderHash)
    {
        return _getEIP712Hash(LibERC721Order.getERC721OrderStructHash(order));
    }

    /// @dev Get the order status bit vector for the given
    ///      maker address and nonce range.
    /// @param maker The maker of the order.
    /// @param nonceRange Order status bit vectors are indexed
    ///        by maker address and the upper 248 bits of the
    ///        order nonce. We define `nonceRange` to be these
    ///        248 bits.
    /// @return bitVector The order status bit vector for the
    ///         given maker and nonce range.
    function getERC721OrderStatusBitVector(address maker, uint248 nonceRange)
        external
        override
        view
        returns (uint256 bitVector)
    {
        LibERC721OrdersStorage.Storage storage stor =
            LibERC721OrdersStorage.getStorage();
        return stor.orderStatusByMaker[maker][nonceRange];
    }
}
