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
import "../fixins/FixinCommon.sol";
import "../fixins/FixinEIP712.sol";
import "../fixins/FixinERC721Spender.sol";
import "../fixins/FixinTokenSpender.sol";
import "../migrations/LibMigrate.sol";
import "../storage/LibERC721OrdersStorage.sol";
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

    /// @dev The magic return value indicating the success of a `receiveFeeCallback`.
    bytes4 private constant FEE_CALLBACK_MAGIC_BYTES = IFeeRecipient.receiveFeeCallback.selector;
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
        _registerFeatureFunction(this.isValidERC721OrderSignature.selector);
        _registerFeatureFunction(this.satisfiesERC721OrderProperties.selector);
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
    function sellERC721(
        LibERC721Order.ERC721Order memory order,
        LibSignature.Signature memory signature,
        uint256 erc721TokenId,
        bool unwrapNativeToken
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
            false       // isCallback
        );
    }

    /// @dev Buys an ERC721 asset by filling the given order.
    /// @param order The ERC721 order.
    /// @param signature The order signature.
    function buyERC721(
        LibERC721Order.ERC721Order memory order,
        LibSignature.Signature memory signature
    )
        public
        override
        payable
    {
        uint256 ethSpent = _buyERC721(order, signature, msg.value);
        require(
            ethSpent <= msg.value,
            "Overspent ETH"
        );
        if (ethSpent < msg.value) {
            _transferEth(msg.sender, msg.value - ethSpent);
        }
    }

    /// @dev Cancel a single ERC721 order. The caller must be the maker.
    ///      Silently succeeds if the order has already been cancelled.
    /// @param order The ERC721 order.
    function cancelERC721Order(LibERC721Order.ERC721Order memory order)
        public
        override
    {
        // TODO: Signer registry
        require(msg.sender == order.maker, "Only maker can cancel");
        _setOrderStatusBit(order);

        emit ERC721OrderCancelled(
            order.maker,
            order.nonce
        );
    }

    /// @dev Buys multiple ERC721 assets by filling the
    ///      given orders.
    /// @param orders The ERC721 orders.
    /// @param signatures The order signatures.
    /// @param revertIfIncomplete If true, reverts if this
    ///        function fails to fill any individual order.
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
            "Array length mismatch"
        );
        successes = new bool[](orders.length);

        uint256 ethSpent = 0;
        for (uint256 i = 0; i < orders.length; i++) {
            bytes memory returnData;
            (successes[i], returnData) = _implementation.delegatecall(
                abi.encodeWithSelector(
                    this._buyERC721.selector, 
                    orders[i],
                    signatures[i],
                    msg.value - ethSpent
                )
            );
            if (successes[i]) {
                (uint256 _ethSpent) = abi.decode(returnData, (uint256));
                ethSpent += _ethSpent;
            } else if (revertIfIncomplete) {
                returnData.rrevert();
            }
            require(
                ethSpent <= msg.value,
                "Overspent ETH"
            );
        }
        if (ethSpent < msg.value) {
            _transferEth(msg.sender, msg.value - ethSpent);
        }
    }

    /// @dev Matches a pair of complementary orders that have
    ///      a non-negative spread. Each order is filled at 
    ///      their respective price, and the matcher receives
    ///      a profit denominated in the ERC20 token.
    /// @param leftOrder First order to match.
    /// @param rightOrder Second order to match.
    /// @param leftSignature Signature for the left order.
    /// @param rightSignature Signature for the right order.
    function matchERC721Orders(
        LibERC721Order.ERC721Order memory leftOrder,
        LibERC721Order.ERC721Order memory rightOrder,
        LibSignature.Signature memory leftSignature,
        LibSignature.Signature memory rightSignature
    )
        public
        override
        returns (uint256 profit)
    {
        // TODO
    }
    
    /// @dev Matches pairs of complementary orders that have
    ///      non-negative spreads. Each order is filled at 
    ///      their respective price, and the matcher receives
    ///      a profit denominated in the ERC20 token.
    /// @param leftOrders Orders to match against `rightOrders`.
    /// @param rightOrders Orders to match against `leftOrders`.
    /// @param leftSignatures Signatures for the left orders.
    /// @param rightSignatures Signatures for the right orders.
    function batchMatchERC721Orders(
        LibERC721Order.ERC721Order[] memory leftOrders,
        LibERC721Order.ERC721Order[] memory rightOrders,
        LibSignature.Signature[] memory leftSignatures,
        LibSignature.Signature[] memory rightSignatures
    )
        public
        override
        returns (uint256[] memory profits, bool[] memory successes)
    {
        // TODO
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
        (
            LibERC721Order.ERC721Order memory order, 
            LibSignature.Signature memory signature,
            bool unwrapNativeToken
        ) = abi.decode(
            data,
            (LibERC721Order.ERC721Order, LibSignature.Signature, bool)
        );

        require(
            msg.sender == address(order.erc721Token),
            "Incorrect ERC721 token"
        );

        // TODO: Enforce operator == from?

        _sellERC721(
            order, 
            signature, 
            tokenId, 
            unwrapNativeToken,
            from, // taker
            true  // isCallback
        );

        return ERC721_RECEIVED_MAGIC_BYTES;
    }

    function _sellERC721(
        LibERC721Order.ERC721Order memory order,
        LibSignature.Signature memory signature,
        uint256 erc721TokenId,
        bool unwrapNativeToken,
        address taker,
        bool isCallback
    )
        private
    {
        require(
            order.direction == LibERC721Order.TradeDirection.BUY_721,
            "Order is not buying 721"
        );

        require(
            order.taker == address(0) || order.taker == taker,
            "Invalid taker"
        );

        require(
            getERC721OrderStatus(order) == LibERC721Order.OrderStatus.FILLABLE,
            "Order is not fillable"
        );

        require(
            satisfiesERC721OrderProperties(order, erc721TokenId),
            "721 token ID does not satisfy order properties"
        );

        require(
            isValidERC721OrderSignature(order, signature),
            "Invalid signature"
        );

        _setOrderStatusBit(order);

        _transferERC721AssetFrom(
            order.erc721Token,
            isCallback ? address(this) : taker,
            order.maker,
            erc721TokenId
        );

        if (unwrapNativeToken) {
            require(
                order.erc20Token == WETH,
                "ERC20 token is not WETH"
            );
            // TODO: Probably safe to just use WETH.transferFrom for some
            //       small gas savings
            _transferERC20TokensFrom(
                WETH,
                order.maker,
                address(this),
                order.erc20TokenAmount
            );
            WETH.withdraw(order.erc20TokenAmount);
            _transferEth(payable(taker), order.erc20TokenAmount);
        } else {
            _transferERC20TokensFrom(
                order.erc20Token, 
                order.maker, 
                taker, 
                order.erc20TokenAmount
            );
        }

        _payFees(order, order.maker, false);

        emit ERC721OrderFilled(
            order.direction,
            order.erc20Token,
            order.erc20TokenAmount,
            order.erc721Token,
            erc721TokenId,
            order.maker,
            taker,
            order.nonce
        );
    }

    function _buyERC721(
        LibERC721Order.ERC721Order memory order,
        LibSignature.Signature memory signature,
        uint256 ethAvailable
    )
        public
        payable
        returns (uint256 ethSpent)
    {
        require(
            order.direction == LibERC721Order.TradeDirection.SELL_721,
            "Order is not selling 721"
        );

        require(
            order.taker == address(0) || order.taker == msg.sender,
            "msg.sender is not order.taker"
        );

        require(
            getERC721OrderStatus(order) == LibERC721Order.OrderStatus.FILLABLE,
            "Order is not fillable"
        );

        require(
            isValidERC721OrderSignature(order, signature),
            "Invalid signature"
        );

        _setOrderStatusBit(order);

        _transferERC721AssetFrom(
            order.erc721Token,
            order.maker,
            msg.sender,
            order.erc721TokenId
        );

        if (address(order.erc20Token) == NATIVE_TOKEN_ADDRESS) {
            require(
                ethAvailable >= order.erc20TokenAmount,
                "Insufficient ETH"
            );
            _transferEth(payable(order.maker), order.erc20TokenAmount);
            ethSpent = order.erc20TokenAmount + _payFees(order, address(this), true);
        } else if (order.erc20Token == WETH) {
            if (ethAvailable >= order.erc20TokenAmount) {
                // Wrap native token
                WETH.deposit{value: order.erc20TokenAmount}();
                // TODO: Probably safe to just use WETH.transfer for some
                //       small gas savings
                _transferERC20Tokens(
                    WETH,
                    order.maker,
                    order.erc20TokenAmount
                );
                ethSpent = order.erc20TokenAmount + _payFees(order, address(this), true);
            } else {
                _transferERC20TokensFrom(
                    order.erc20Token,
                    msg.sender,
                    order.maker,
                    order.erc20TokenAmount
                );
                _payFees(order, msg.sender, false);
            }
        } else {
            _transferERC20TokensFrom(
                order.erc20Token,
                msg.sender,
                order.maker,
                order.erc20TokenAmount
            );
            _payFees(order, msg.sender, false);
        }

        emit ERC721OrderFilled(
            order.direction,
            order.erc20Token,
            order.erc20TokenAmount,
            order.erc721Token,
            order.erc721TokenId,
            order.maker,
            msg.sender,
            order.nonce
        );
    }

    /// @dev Returns whether not the given signature is valid for the
    ///      the given ERC721 order.
    /// @param order The ERC721 order.
    /// @param signature The signature to validate.
    /// @return isValid Whether `signature` is valid for `order`.
    function isValidERC721OrderSignature(
        LibERC721Order.ERC721Order memory order,
        LibSignature.Signature memory signature
    )
        public
        override
        view
        returns (bool isValid)
    {
        bytes32 orderHash = getERC721OrderHash(order);
        address signer = LibSignature.getSignerOfHash(orderHash, signature);
        // TODO: Signer registry
        return signer == order.maker;
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
            if (useNativeToken) {
                _transferEth(payable(fee.recipient), fee.amount);
            } else {
                _transferERC20TokensFrom(
                    order.erc20Token,
                    payer,
                    fee.recipient, 
                    fee.amount
                );
            }
            if (fee.feeData.length > 0) {
                bytes4 callbackResult = IFeeRecipient(fee.recipient).receiveFeeCallback(
                    useNativeToken ? NATIVE_TOKEN_ADDRESS : address(order.erc20Token),
                    fee.amount,
                    fee.feeData
                );
                require(
                    callbackResult == FEE_CALLBACK_MAGIC_BYTES,
                    "Fee callback failed"
                );
            }
            totalFeesPaid += fee.amount;
        }
    }

    function _setOrderStatusBit(LibERC721Order.ERC721Order memory order)
        private
    {
        uint256 flag = 1 << (order.nonce % 256);
        // Update order status bit vector
        LibERC721OrdersStorage.getStorage().orderStatusByMaker
            [order.maker][uint248(order.nonce >> 8)] |= flag;            
    }

    /// @dev If the given order is buying an ERC721 asset, returns
    ///      whether or not the given token ID satisfies the required
    ///      properties specified in the order. If the order does not
    ///      specify any properties, this function instead returns 
    ///      whether the given token ID matches the ID in the order.
    /// @param order The ERC721 order.
    /// @param erc721TokenId The ID of the ERC721 asset.
    /// @return satisfiesProperties Whether or not the given ERC721 asset
    ///         satisfies the properties specified in the order.
    function satisfiesERC721OrderProperties(
        LibERC721Order.ERC721Order memory order,
        uint256 erc721TokenId
    )
        public
        override
        view
        returns (bool satisfiesProperties)
    {
        if (order.erc721TokenProperties.length == 0) {
            return erc721TokenId == order.erc721TokenId;
        }

        satisfiesProperties = true;
        for (uint256 i = 0; i < order.erc721TokenProperties.length; i++) {
            LibERC721Order.Property memory property = order.erc721TokenProperties[i];
            if (address(property.propertyValidator) == address(0)) {
                continue;
            }

            try property.propertyValidator.validateProperty(
                address(order.erc721Token),
                erc721TokenId,
                property.propertyData
            ) {} catch {
                satisfiesProperties = false;
            }
            if (!satisfiesProperties) {
                break;
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
        if (order.erc721TokenProperties.length > 0 && 
                (order.direction == LibERC721Order.TradeDirection.SELL_721 ||
                 order.erc721TokenId != 0))
        {
            return LibERC721Order.OrderStatus.INVALID;
        }

        if (order.direction == LibERC721Order.TradeDirection.BUY_721 &&
            address(order.erc20Token) == NATIVE_TOKEN_ADDRESS) 
        {
            return LibERC721Order.OrderStatus.INVALID;
        }

        if (order.expiry <= block.timestamp) {
            return LibERC721Order.OrderStatus.EXPIRED;
        }

        LibERC721OrdersStorage.Storage storage stor = 
            LibERC721OrdersStorage.getStorage();
        uint256 orderStatusBitVector =
            stor.orderStatusByMaker[order.maker][uint248(order.nonce >> 8)];
        uint256 flag = 1 << (order.nonce % 256);
        if (orderStatusBitVector & flag != 0) {
            return LibERC721Order.OrderStatus.UNFILLABLE;
        }

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
