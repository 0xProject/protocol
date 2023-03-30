Cancelling Orders
=================

All orders, whether off-chain or on-chain, can only be cancelled
on-chain. The following contract functions are used to cancel individual
ERC721 and ERC1155 orders. 

.. code:: solidity

   /// @dev Cancel a single ERC721 order by its nonce. The caller
   ///      should be the maker of the order. Silently succeeds if
   ///      an order with the same nonce has already been filled or
   ///      cancelled.
   /// @param orderNonce The order nonce.
   function cancelERC721Order(uint256 orderNonce)
       external;

   /// @dev Cancel a single ERC1155 order by its nonce. The caller
   ///      should be the maker of the order. Silently succeeds if
   ///      an order with the same nonce has already been filled or
   ///      cancelled.
   /// @param orderNonce The order nonce.
   function cancelERC1155Order(uint256 orderNonce)
       external;

Note that if there are multiple outstanding orders with the same nonce,
calling ``cancelERC721Order`` or ``cancelERC1155Order`` would cancel all
those orders.

The following functions can be used to cancel multiple orders.

.. code:: solidity

   /// @dev Cancel multiple ERC721 orders by their nonces. The caller
   ///      should be the maker of the orders. Silently succeeds if
   ///      an order with the same nonce has already been filled or
   ///      cancelled.
   /// @param orderNonces The order nonces.
   function batchCancelERC721Orders(uint256[] calldata orderNonces)
       external;
       
   /// @dev Cancel multiple ERC1155 orders by their nonces. The caller
   ///      should be the maker of the orders. Silently succeeds if
   ///      an order with the same nonce has already been filled or
   ///      cancelled.
   /// @param orderNonces The order nonces.
   function batchCancelERC1155Orders(uint256[] calldata orderNonces)
       external;
