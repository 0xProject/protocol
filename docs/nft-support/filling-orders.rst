Filling Orders
==============

The basic functions used for filling NFT orders are the following:

.. code:: solidity

   /// @dev Sells an ERC721 asset to fill the given order.
   /// @param buyOrder The ERC721 buy order.
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
       LibNFTOrder.ERC721Order calldata buyOrder,
       LibSignature.Signature calldata signature,
       uint256 erc721TokenId,
       bool unwrapNativeToken,
       bytes calldata callbackData
   )
       external;

   /// @dev Buys an ERC721 asset by filling the given order.
   /// @param sellOrder The ERC721 sell order.
   /// @param signature The order signature.
   /// @param callbackData If this parameter is non-zero, invokes
   ///        `zeroExERC721OrderCallback` on `msg.sender` after
   ///        the ERC721 asset has been transferred to `msg.sender`
   ///        but before transferring the ERC20 tokens to the seller.
   ///        Native tokens acquired during the callback can be used
   ///        to fill the order.
   function buyERC721(
       LibNFTOrder.ERC721Order calldata sellOrder,
       LibSignature.Signature calldata signature,
       bytes calldata callbackData
   )
       external
       payable;
       
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
       LibNFTOrder.ERC1155Order calldata buyOrder,
       LibSignature.Signature calldata signature,
       uint256 erc1155TokenId,
       uint128 erc1155SellAmount,
       bool unwrapNativeToken,
       bytes calldata callbackData
   )
       external;

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
       LibNFTOrder.ERC1155Order calldata sellOrder,
       LibSignature.Signature calldata signature,
       uint128 erc1155BuyAmount,
       bytes calldata callbackData
   )
       external
       payable;

| ``sellERC721`` and ``sellERC1155`` are used when the caller is
  **selling** an NFT, so the order being filled is a **buy** order.
| ``buyERC721`` and ``buyERC1155`` are used when the caller is
  **buying** an NFT, so the order being filled is a **sell** order. 

Note that the only difference in parameters between the ERC721 and
ERC1155 functions is ``erc1155BuyAmount``. This value specifies the
amount of the ERC1155 asset to sell/buy from the given order, which may
be greater than one in the case of semi-fungible ERC1155 assets.
