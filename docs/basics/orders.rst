###############################
Orders
###############################

An order is a message for the 0x Protocol to facilitate a trade. There are three types of orders in 
0x V4: Limit, RFQ and DEX. Limit orders are the traditional 0x Order, which faciliates a trade
between a maker and taker at a specified price. RFQ Orders are similar to Limit Orders, however,
they are designed specifically for request-for-quote market makers. Limit Orders are shared
via 0x Mesh and the Standard Relayer API, whereas RFQ Orders are generated in real-time through
0x API's RFQ system. DEX Orders are also generated in real-time through 0x API and serve liquidity
from on-chain DEX's like Uniswap.

.. note::
    As of Exchange v4.0, the maker address is no longer included in orders. The maker is now uncovered
    from the signature of the order hash.

.. note::
    0x Orders currently support the exchange of ERC20 Tokens. Other asset classes, like ERC721,
    will be added in the future based on community demand.

Limit Order
-----------

The Limit Order consists of the following parameters:

+--------------+---------+-----------------------------------------------------------------------------+
| Field        | Type    | Description                                                                 |
+==============+=========+=============================================================================+
| makerToken   | address | The ERC20 token the maker is selling and the maker is selling to the taker. |
+--------------+---------+-----------------------------------------------------------------------------+
| takerToken   | address | The ERC20 token the taker is selling and the taker is selling to the maker. |
+--------------+---------+-----------------------------------------------------------------------------+
| makerAmount  | uint128 | The amount of makerToken being sold by the maker.                           |
+--------------+---------+-----------------------------------------------------------------------------+
| takerAmount  | uint128 | The amount of takerToken being sold by the taker.                           |
+--------------+---------+-----------------------------------------------------------------------------+
| feeRecipient | address | Recipient of maker token or taker token fees (if non-zero).                 |
+--------------+---------+-----------------------------------------------------------------------------+
| feeAmount    | uint128 | Amount of takerToken paid by the taker to the feeRecipient.                 |
+--------------+---------+-----------------------------------------------------------------------------+
| taker        | address | Taker address. Set to zero to allow any taker.                              |
+--------------+---------+-----------------------------------------------------------------------------+
| sender       | address | The address that calls the Exchange (``msg.sender``)                        |
+--------------+---------+-----------------------------------------------------------------------------+
| pool         | uint256 | The staking pool to attribute the 0x protocol fee from this order.          |
|              |         | Set to zero to attribute to the default pool, not owned by anyone.          |
+--------------+---------+-----------------------------------------------------------------------------+
| expiry       | uint64  | The Unix Timestamp in seconds when this order expires.                      |
+--------------+---------+-----------------------------------------------------------------------------+
| salt         | bytes32 | Arbitrary number to facilitate uniqueness of the order's hash.              |
+--------------+---------+-----------------------------------------------------------------------------+

TODO: Show how to hash the Limit order.

RFQ Order
------------------

The RFQ Order consists of the following parameters:

+-------------+---------+-----------------------------------------------------------------------------+
| Field       | Type    | Description                                                                 |
+=============+=========+=============================================================================+
| makerToken  | address | The ERC20 token the maker is selling and the maker is selling to the taker. |
+-------------+---------+-----------------------------------------------------------------------------+
| takerToken  | address | The ERC20 token the taker is selling and the taker is selling to the maker. |
+-------------+---------+-----------------------------------------------------------------------------+
| makerAmount | uint128 | The amount of makerToken being sold by the maker.                           |
+-------------+---------+-----------------------------------------------------------------------------+
| takerAmount | uint128 | The amount of takerToken being sold by the taker.                           |
+-------------+---------+-----------------------------------------------------------------------------+
| txOrigin    | address | The address of the EOA that submitted the Ethereum transaction.             |
+-------------+---------+-----------------------------------------------------------------------------+
| pool        | uint256 | The staking pool to attribute the 0x protocol fee from this order.          |
|             |         | Set to zero to attribute to the default pool, not owned by anyone.          |
+-------------+---------+-----------------------------------------------------------------------------+
| expiry      | uint64  | The Unix Timestamp in seconds when this order expires.                      |
+-------------+---------+-----------------------------------------------------------------------------+
| salt        | bytes32 | Arbitrary number to facilitate uniqueness of the order's hash.              |
+-------------+---------+-----------------------------------------------------------------------------+

TODO: Show how to hash the RFQ order.

DEX Order
------------------

The DEX Order consists of the following parameters:

+----------------+---------+-----------------------------------------------------------------------------+
| Field          | Type    | Description                                                                 |
+================+=========+=============================================================================+
| makerToken     | address | The ERC20 token the maker is selling and the maker is selling to the taker. |
+----------------+---------+-----------------------------------------------------------------------------+
| takerToken     | address | The ERC20 token the taker is selling and the taker is selling to the maker. |
+----------------+---------+-----------------------------------------------------------------------------+
| minMakerAmount | uint128 | The minimum amount of makerToken to purchase from the DEX.                  |
+----------------+---------+-----------------------------------------------------------------------------+
| takerAmount    | uint128 | The amount of takerToken being sold by the taker.                           |
+----------------+---------+-----------------------------------------------------------------------------+
| dex            | address | The address of the DEX to source liquidity from, ex Uniswap.                |
+----------------+---------+-----------------------------------------------------------------------------+
| data           | bytes   | Any additional data needed to source liquidity from the DEX.                |
+----------------+---------+-----------------------------------------------------------------------------+


TODO: Discuss how to format `data` for the various DEX's that we support.