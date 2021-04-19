######
Orders
######

An order is a message passed into the 0x Protocol to facilitate an ERC20->ERC20 trade. There are currently two types of orders in 0x V4: **Limit** and **RFQ**.

.. note::
    0x Orders currently support the exchange of ERC20 Tokens. Other asset classes, like ERC721,
    will be added in the future based on community demand.

Limit Orders
==============

Limit orders are the standard 0x Order, which encodes a possible trade between a maker and taker at a fixed price. These orders are typically distributed via Mesh/SRA (open orderbook) or OTC, and can be filled through the functions on the Exchange Proxy.

The ``LimitOrder`` struct has the following fields:

+-------------------------+-------------+------------------------------------------------------------------------------------------+
| Field                   | Type        | Description                                                                              |
+-------------------------+-------------+------------------------------------------------------------------------------------------+
| ``makerToken``          | ``address`` | The ERC20 token the maker is selling and the maker is selling to the taker. [required]   |
+-------------------------+-------------+------------------------------------------------------------------------------------------+
| ``takerToken``          | ``address`` | The ERC20 token the taker is selling and the taker is selling to the maker. [required]   |
+-------------------------+-------------+------------------------------------------------------------------------------------------+
| ``makerAmount``         | ``uint128`` | The amount of makerToken being sold by the maker. [required]                             |
+-------------------------+-------------+------------------------------------------------------------------------------------------+
| ``takerAmount``         | ``uint128`` | The amount of takerToken being sold by the taker. [required]                             |
+-------------------------+-------------+------------------------------------------------------------------------------------------+
| ``takerTokenFeeAmount`` | ``uint128`` | Amount of takerToken paid by the taker to the feeRecipient. [optional; default 0]        |
+-------------------------+-------------+------------------------------------------------------------------------------------------+
| ``maker``               | ``address`` | The address of the maker, and signer, of this order. [required]                          |
+-------------------------+-------------+------------------------------------------------------------------------------------------+
| ``taker``               | ``address`` | Allowed taker address. Set to zero to allow any taker. [optional; default 0]             |
+-------------------------+-------------+------------------------------------------------------------------------------------------+
| ``sender``              | ``address`` | Allowed address to call ``fillLimitOrder()`` (``msg.sender``).                           |
|                         |             | This is the same as ``taker``, expect when using meta-transactions.                      |
|                         |             | Set to zero to allow any caller. [optional; default 0]                                   |
+-------------------------+-------------+------------------------------------------------------------------------------------------+
| ``feeRecipient``        | ``address`` | Recipient of maker token or taker token fees (if non-zero). [optional; default 0]        |
+-------------------------+-------------+------------------------------------------------------------------------------------------+
| ``pool``                | ``bytes32`` | The staking pool to attribute the 0x protocol fee from this order.                       |
|                         |             | Set to zero to attribute to the default pool, not owned by anyone. [optional; default 0] |
+-------------------------+-------------+------------------------------------------------------------------------------------------+
| ``expiry``              | ``uint64``  | The Unix timestamp in seconds when this order expires. [required]                        |
+-------------------------+-------------+------------------------------------------------------------------------------------------+
| ``salt``                | ``uint256`` | Arbitrary number to enforce uniqueness of the order hash. [required]                     |
+-------------------------+-------------+------------------------------------------------------------------------------------------+

RFQ Orders
==========

RFQ orders are a stripped down version of standard limit orders, supporting fewer fields and a leaner settlement process.
These orders are fielded just-in-time, directly from market makers, during the construction of a swap quote on 0x API,
and can be filled through the ``fillRfqOrder()`` function on the Exchange Proxy.

Some notable differences from regular limit orders are:

* There is no ``sender`` field.
* There is no taker fee.
* Must restrict ``transaction.origin`` via the `order.txOrigin` field.
* There is currently no protocol fee paid when filling an RFQ order.

The ``RFQOrder`` struct has the following fields:

+-----------------+-------------+----------------------------------------------------------------------------------------------------------------------------+
| Field           | Type        | Description                                                                                                                |
+-----------------+-------------+----------------------------------------------------------------------------------------------------------------------------+
| ``makerToken``  | ``address`` | The ERC20 token the maker is selling and the maker is selling to the taker. [required]                                     |
+-----------------+-------------+----------------------------------------------------------------------------------------------------------------------------+
| ``takerToken``  | ``address`` | The ERC20 token the taker is selling and the taker is selling to the maker. [required]                                     |
+-----------------+-------------+----------------------------------------------------------------------------------------------------------------------------+
| ``makerAmount`` | ``uint128`` | The amount of makerToken being sold by the maker. [required]                                                               |
+-----------------+-------------+----------------------------------------------------------------------------------------------------------------------------+
| ``takerAmount`` | ``uint128`` | The amount of takerToken being sold by the taker. [required]                                                               |
+-----------------+-------------+----------------------------------------------------------------------------------------------------------------------------+
| ``maker``       | ``address`` | The address of the maker, and signer, of this order. [required]                                                            |
+-----------------+-------------+----------------------------------------------------------------------------------------------------------------------------+
| ``taker``       | ``address`` | Allowed taker address. Set to zero to allow any taker. [optional; default 0]                                               |
+-----------------+-------------+----------------------------------------------------------------------------------------------------------------------------+
| ``txOrigin``    | ``address`` | The allowed address of the EOA that submitted the Ethereum transaction. **This must be set**.                              |
|                 |             | Multiple addresses are supported via `registerAllowedRfqOrigins <./functions.html#registerallowedrfqorigins>`_. [required] |
+-----------------+-------------+----------------------------------------------------------------------------------------------------------------------------+
| ``pool``        | ``bytes32`` | The staking pool to attribute the 0x protocol fee from this order.                                                         |
|                 |             | Set to zero to attribute to the default pool, not owned by anyone. [optional; default 0]                                   |
+-----------------+-------------+----------------------------------------------------------------------------------------------------------------------------+
| ``expiry``      | ``uint64``  | The Unix timestamp in seconds when this order expires. [required]                                                          |
+-----------------+-------------+----------------------------------------------------------------------------------------------------------------------------+
| ``salt``        | ``uint256`` | Arbitrary number to enforce uniqueness of the order hash. [required]                                                       |
+-----------------+-------------+----------------------------------------------------------------------------------------------------------------------------+


How To Sign
==============

Both Limit & RFQ orders must be signed by the `maker` or a registered order signer (`registerAllowedOrderSigner <./functions.html#registerallowedrfqorigins>`_). This signature is needed to fill an order, see `Basic Functionality <./functions.html>`_.

The protocol accepts signatures defined by the following struct:

.. code-block:: solidity

    struct {
         uint8 signatureType; // Either 2 or 3
         uint8 v; // Signature data.
         bytes32 r; // Signature data.
         bytes32 s; // Signature data.
    }

There are two types of signatures supported: ``EIP712`` and ``EthSign``.

* The ``EIP712`` signature type is best for web frontends that present an order to be signed through Metamask in a human-readable format. It relies on the `eth_signTypedData <https://github.com/ethereum/EIPs/blob/master/EIPS/eip-712.md#specification-of-the-eth_signtypeddata-json-rpc>`_ JSON-RPC method exposed by MetaMask. This signature has the ``signatureType`` of ``2``.
* The ``EthSign`` signature is best for use with headless providers, such as when using a geth node. This relies on the ``eth_sign`` JSON-RPC method common to all nodes. This signature has the ``signatureType`` of ``3``.

In both cases, the ``@0x/protocol-utils`` package simplifies generating these signatures.

.. note::
    The Protocol Utils package is still under development. This message will be removed once the package is published. - 11/24/2020.

.. code-block:: javascript

   const utils = require('@0x/protocol-utils');
   const order = new utils.LimitOrder({ // or utils.RfqOrder
       makerToken: '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
       takerToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
       ... // Other fields
   });
   // Generate an EthSign signature with a provider.
   const signature = await order.getSignatureWithProviderAsync(
       web3.currentProvider,
   );
   // Generate an EthSign signature with a private key.
   const signature = await order.getSignatureWithKey(
       '0x123456...', // Maker's 32-byte private key, in hex.
   );
   // Generate an EIP712 signature with a provider (e.g., metamask).
   const signature = await order.getSignatureWithProviderAsync(
       web3.currentProvider,
       utils.SignatureType.EIP712,
   );
   // Generate an EIP712 signature with a private key.
   const signature = await order.getSignatureWithKey(
       '0x123456...', // Maker's 32-byte private key, in hex.
       utils.SignatureType.EIP712,
   );


The Orderbook
=======================
Orders are shared through a decentralized and permissionless network, called `0x Mesh <https://0x.org/mesh>`_. The simplest way to post and discover orders is through `0x API <https://0x.org/api>`_. See `this guide <https://0x.org/docs/guides/market-making-on-0x>`_ tailored for Market Makers.

Orders are usually represented as a JSON object off-chain. Below is a table represention and example of how orders should be formatted off-chain.

JSON representation of RFQ Orders
*********************************

A ``RFQOrder`` should be serialized to JSON as following:

.. code-block:: typescript

    interface RfqOrderJson {
        "maker": string,
        "taker": string,
        "makerToken": string,
        "takerToken": string,
        "makerAmount": string,
        "takerAmount": string,
        "txOrigin": string,
        "pool": string,
        "expiry": number,
        "salt": string,
        "chainId": number,             // Ethereum Chain Id where the transaction is submitted.
        "verifyingContract": string,   // Address of the contract where the transaction should be sent.
        "signature": {
            "signatureType": number,
            "v": number,
            "s": string,
            "r": string,
        }
    }
