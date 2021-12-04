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
import "../libs/LibERC721Order.sol";
import "../libs/LibSignature.sol";
import "../../vendor/IERC721Token.sol";


/// @dev Feature for interacting with ERC721 orders.
interface IERC721OrdersFeature {

    /// @dev Emitted whenever an `ERC721Order` is filled.
    /// @param direction Whether the order is selling or 
    ///        buying the ERC721 token. 
    /// @param erc20Token The address of the ERC20 token.
    /// @param erc20TokenAmount The amount of ERC20 token 
    ///        to sell or buy.
    /// @param erc721Token The address of the ERC721 token.
    /// @param erc721TokenId The ID of the ERC721 asset.
    /// @param maker The maker of the order.
    /// @param taker The taker of the order.
    /// @param nonce The unique maker nonce in the order.
    event ERC721OrderFilled(
        LibERC721Order.TradeDirection direction,
        IERC20TokenV06 erc20Token,
        uint256 erc20TokenAmount,
        IERC721Token erc721Token,
        uint256 erc721TokenId,
        address maker,
        address taker,
        uint256 nonce
    );

    /// @dev Emitted whenever two `ERC721Order`s are matched.
    /// @param erc20Token The ERC20 token of the two orders.
    ///        If `sellOrder.erc20Token` is the native token
    ///        and `buyOrder.erc20Token` is the wrapped native
    ///        token, this will be `NATIVE_TOKEN_ADDRESS`.
    /// @param erc721Token The address of the ERC721 token.
    /// @param erc721TokenId The ID of the ERC721 asset.
    /// @param sellOrderMaker The maker of the sell order.
    /// @param buyOrderMaker The maker of the buy order.
    /// @param sellOrderNonce The nonce of the sell order.
    /// @param buyOrderNonce The nonce of the buy order.
    /// @param matcher The address that called the `matchERC721Orders`
    ///        or `batchMatchERC721Orders` function.
    /// @param profit The amount of profit earned by the matcher,
    ///        denominated in `erc20Token`.
    event ERC721OrdersMatched(
        IERC20TokenV06 erc20Token,
        IERC721Token erc721Token,
        uint256 erc20TokenAmount,
        uint256 erc721TokenId,
        address sellOrderMaker,
        address buyOrderMaker,
        uint256 sellOrderNonce,
        uint256 buyOrderNonce,
        address matcher,
        uint256 profit
    );

    /// @dev Emitted whenever an `ERC721Order` is cancelled.
    /// @param maker The maker of the order.
    /// @param nonce The nonce of the order that was cancelled.
    event ERC721OrderCancelled(
        address maker,
        uint256 nonce
    );

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
        LibERC721Order.ERC721Order calldata order,
        LibSignature.Signature calldata signature,
        uint256 erc721TokenId,
        bool unwrapNativeToken
    )
        external;

    /// @dev Buys an ERC721 asset by filling the given order.
    /// @param order The ERC721 order.
    /// @param signature The order signature.
    function buyERC721(
        LibERC721Order.ERC721Order calldata order,
        LibSignature.Signature calldata signature
    )
        external
        payable;

    /// @dev Cancel a single ERC721 order by its nonce. The caller
    ///      should be the maker of the order. Silently succeeds if
    ///      an order with the same nonce has already been filled or
    ///      cancelled.
    /// @param orderNonce The order nonce.
    function cancelERC721Order(uint256 orderNonce)
        external;

    /// @dev Buys multiple ERC721 assets by filling the
    ///      given orders.
    /// @param orders The ERC721 orders.
    /// @param signatures The order signatures.
    /// @param revertIfIncomplete If true, reverts if this
    ///        function fails to fill any individual order.
    /// @return successes An array of booleans corresponding to whether
    ///         each order in `orders` was successfully filled.
    function batchBuyERC721s(
        LibERC721Order.ERC721Order[] calldata orders,
        LibSignature.Signature[] calldata signatures,
        bool revertIfIncomplete
    )
        external
        payable
        returns (bool[] memory successes);

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
        LibERC721Order.ERC721Order calldata sellOrder,
        LibERC721Order.ERC721Order calldata buyOrder,
        LibSignature.Signature calldata sellOrderSignature,
        LibSignature.Signature calldata buyOrderSignature
    )
        external
        returns (uint256 profit);
    
    /// @dev Matches pairs of complementary orders that have
    ///      non-negative spreads. Each order is filled at 
    ///      their respective price, and the matcher receives
    ///      a profit denominated in the ERC20 token.
    /// @param sellOrders Orders selling ERC721 assets.
    /// @param buyOrders Orders buying ERC721 assets.
    /// @param sellOrderSignatures Signatures for the sell orders.
    /// @param buyOrderSignatures Signatures for the buy orders.
    /// @return profits The amount of profit earned by the caller
    ///         of this function for each pair of matched orders
    ///         (denominated in the ERC20 token of the order pair).
    /// @return successes An array of booleans corresponding to
    ///         whether each pair of orders was successfully matched.
    function batchMatchERC721Orders(
        LibERC721Order.ERC721Order[] calldata sellOrders,
        LibERC721Order.ERC721Order[] calldata buyOrders,
        LibSignature.Signature[] calldata sellOrderSignatures,
        LibSignature.Signature[] calldata buyOrderSignatures
    )
        external
        returns (uint256[] memory profits, bool[] memory successes);
    
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
        returns (bytes4 success);

    /// @dev Approves an ERC721 order hash on-chain. After pre-signing 
    ///      a hash, the `PRESIGNED` signature type will become valid 
    ///      for that order and maker.
    /// @param orderHash An ERC721 order hash.
    function preSignERC721Order(bytes32 orderHash)
        external;

    /// @dev Checks whether the given signature is valid for the
    ///      the given ERC721 order. Reverts if not.
    /// @param order The ERC721 order.
    /// @param signature The signature to validate.
    function validateERC721OrderSignature(
        LibERC721Order.ERC721Order calldata order,
        LibSignature.Signature calldata signature
    )
        external
        view;

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
        LibERC721Order.ERC721Order calldata order, 
        uint256 erc721TokenId
    )
        external
        view;
    
    /// @dev Get the current status of an ERC721 order.
    /// @param order The ERC721 order.
    /// @return status The status of the order.
    function getERC721OrderStatus(LibERC721Order.ERC721Order calldata order)
        external
        view
        returns (LibERC721Order.OrderStatus status);

    /// @dev Get the canonical hash of an ERC721 order.
    /// @param order The ERC721 order.
    /// @return orderHash The order hash.
    function getERC721OrderHash(LibERC721Order.ERC721Order calldata order)
        external
        view
        returns (bytes32 orderHash);

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
        view
        returns (uint256 bitVector);
}
