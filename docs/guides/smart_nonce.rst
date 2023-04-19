############
Smart Nonces
############

The `nonce` field in the order is a number the maker chooses to ensure uniqueness of the order, but it also has some other functions:
- To identify the order (in addition to the caller/maker) in cancellation functions.
- To identify the order when checking/updating its filled state.
- To potentially reuse EVM storage slots that mark an order as filled, which can provide significant gas savings (~15k) when filling or cancelling the order.

**Gas Optimized Nonces**

The protocol marks ERC721 orders as filled when they either get cancelled or filled. Instead of always using a completely new storage slot for each order from a maker, the upper 248 bits of the nonce will identify the storage slot/bucket/status vector to be used and the lower 8 bits of the nonce will identify the bit offset in that slot (each slot is also 256 bits) which will be flipped from 0 to 1 when the order is cancelled or filled.

.. image:: ./_static/img/smart_nonce_diagram.webp
    :width: 600

To take advantage of this gas optimization, makers should reuse the upper 248 bits of their nonce across up to 256 different orders, varying the value of the lower 8 bits between them.