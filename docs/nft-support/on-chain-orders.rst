On-chain Orders
===============

Orders can be simultaneously “signed” and listed on-chain using the
``preSignERC721Order`` or ``preSignERC1155Order`` functions. Orders can
only be signed by the maker address specified in the order. 

.. code:: solidity

   /// @dev Approves an ERC721 order on-chain. After pre-signing
   ///      the order, the `PRESIGNED` signature type will become
   ///      valid for that order and signer.
   /// @param order An ERC721 order.
   function preSignERC721Order(LibNFTOrder.ERC721Order calldata order)
       external;
       
   /// @dev Approves an ERC1155 order on-chain. After pre-signing
   ///      the order, the `PRESIGNED` signature type will become
   ///      valid for that order and signer.
   /// @param order An ERC1155 order.
   function preSignERC1155Order(LibNFTOrder.ERC1155Order calldata order)
       external;

If an order has been pre-signed, it can be filled by providing a “null”
signature with the ``PRESIGNED`` signature type (see
`LibSignature.sol <https://github.com/0xProject/protocol/blob/refactor/nft-orders/contracts/zero-ex/contracts/src/features/libs/LibSignature.sol#L42-L61>`__):

.. code:: solidity

   LibSignature.Signature({
      signatureType: LibSignature.SignatureType.PRESIGNED,
      v: uint8(0),
      r: bytes32(0),
      s: bytes32(0)
   });

The pre-sign functions emit the entire order as an event, so that the
order is easily indexable by subgraphs and thus easily discoverable
without the need for an off-chain database.

.. code:: solidity

   /// @dev Emitted when an `ERC721Order` is pre-signed.
   ///      Contains all the fields of the order.
   event ERC721OrderPreSigned(
       LibNFTOrder.TradeDirection direction,
       address maker,
       address taker,
       uint256 expiry,
       uint256 nonce,
       IERC20TokenV06 erc20Token,
       uint256 erc20TokenAmount,
       LibNFTOrder.Fee[] fees,
       IERC721Token erc721Token,
       uint256 erc721TokenId,
       LibNFTOrder.Property[] erc721TokenProperties
   );

   /// @dev Emitted when an `ERC1155Order` is pre-signed.
   ///      Contains all the fields of the order.
   event ERC1155OrderPreSigned(
       LibNFTOrder.TradeDirection direction,
       address maker,
       address taker,
       uint256 expiry,
       uint256 nonce,
       IERC20TokenV06 erc20Token,
       uint256 erc20TokenAmount,
       LibNFTOrder.Fee[] fees,
       IERC1155Token erc1155Token,
       uint256 erc1155TokenId,
       LibNFTOrder.Property[] erc1155TokenProperties,
       uint128 erc1155TokenAmount
   );

The pre-sign functions also enable smart contracts to create and “sign”
NFT orders, opening the door for potential integrations with
e.g. multisig wallets.
