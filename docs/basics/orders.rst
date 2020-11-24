######
Orders
######

An order is a message passed into the 0x Protocol to facilitate an ERC20->ERC20 trade. There are currently two types of orders in 0x V4: **Limit** and **RFQ**.

.. note::
    0x Orders currently support the exchange of ERC20 Tokens. Other asset classes, like ERC721,
    will be added in the future based on community demand.

Limit Orders
==============

Limit orders are the standard 0x Order, which encodes a possible trade between a maker and taker at a fixed price. These orders are typically distributed via Mesh/SRA (open orderbook) or OTC, and can be filled through the ``fillOrder()`` function on the Exchange Proxy.

Structure
---------

The ``LimitOrder`` struct has the following fields:

+--------------------------+-------------+-----------------------------------------------------------------------------+
| Field                    | Type        | Description                                                                 |
+==========================+=============+=============================================================================+
| ``makerToken``           | ``address`` | The ERC20 token the maker is selling and the maker is selling to the taker. |
+--------------------------+-------------+-----------------------------------------------------------------------------+
| ``takerToken``           | ``address`` | The ERC20 token the taker is selling and the taker is selling to the maker. |
+--------------------------+-------------+-----------------------------------------------------------------------------+
| ``makerAmount``          | ``uint128`` | The amount of makerToken being sold by the maker.                           |
+--------------------------+-------------+-----------------------------------------------------------------------------+
| ``takerAmount``          | ``uint128`` | The amount of takerToken being sold by the taker.                           |
+--------------------------+-------------+-----------------------------------------------------------------------------+
| ``takerTokenFeeAmount``  | ``uint128`` | Amount of takerToken paid by the taker to the feeRecipient.                 |
+--------------------------+-------------+-----------------------------------------------------------------------------+
| ``maker``                | ``address`` | The address of the maker, and signer, of this order.                        |
+--------------------------+-------------+-----------------------------------------------------------------------------+
| ``taker``                | ``address`` | Allowed taker address. Set to zero to allow any taker.                      |
+--------------------------+-------------+-----------------------------------------------------------------------------+
| ``sender``               | ``address`` | Allowed address to directly call ``fillLimitOrder()`` (``msg.sender``).     |
|                          |             | This is distinct from ``taker`` in meta-transactions.                       |
|                          |             | Set to zero to allow any caller.                                            |
+--------------------------+-------------+-----------------------------------------------------------------------------+
| ``feeRecipient``         | ``address`` | Recipient of maker token or taker token fees (if non-zero).                 |
+--------------------------+-------------+-----------------------------------------------------------------------------+
| ``pool``                 | ``bytes32`` | The staking pool to attribute the 0x protocol fee from this order.          |
|                          |             | Set to zero to attribute to the default pool, not owned by anyone.          |
+--------------------------+-------------+-----------------------------------------------------------------------------+
| ``expiry``               | ``uint64``  | The Unix timestamp in seconds when this order expires.                      |
+--------------------------+-------------+-----------------------------------------------------------------------------+
| ``salt``                 | ``uint256`` | Arbitrary number to enforce uniqueness of the order's hash.                 |
+--------------------------+-------------+-----------------------------------------------------------------------------+

Hashing limit orders
--------------------

The hash of the order is used to uniquely identify an order inside the protocol. It is computed following the `EIP712 spec <https://github.com/ethereum/EIPs/blob/master/EIPS/eip-712.md>`_ standard. In solidity, the hash is computed as:

.. code-block:: solidity

    bytes32 orderHash = keccak256(abi.encodePacked(
        '\x19\x01',
        // The domain separator.
        keccak256(abi.encode(
            // The EIP712 domain separator type hash.
            keccak256(abi.encodePacked(
                'EIP712Domain(',
                'string name,',
                'string version,',
                'uint256 chainId,',
                'address verifyingContract)'
            )),
            // The EIP712 domain separator values.
            'ZeroEx',
            '1.0.0',
            1, // For mainnet
            0xDef1C0ded9bec7F1a1670819833240f027b25EfF, // Address of the Exchange Proxy
        )),
        // The struct hash.
        keccak256(abi.encode(
            // The EIP712 type hash.
            keccak256(abi.encodePacked(
                'LimitOrder(',
                'address makerToken,',
                'address takerToken,',
                'uint128 makerAmount,',
                'uint128 takerAmount,',
                'uint128 takerTokenFeeAmount,',
                'address taker,',
                'address maker,',
                'address sender,',
                'address feeRecipient,',
                'bytes32 pool,',
                'uint64 expiry,',
                'uint256 salt)'
            )),
            // The struct values.
            order.makerToken,
            order.takerToken,
            order.makerAmount,
            order.takerAmount,
            order.takerTokenFeeAmount,
            order.maker,
            order.taker,
            order.sender,
            order.feeRecipient,
            order.pool,
            order.expiry,
            order.salt
        ))
    ));

Alternatively, the Exchange Proxy contract can be used to retrieve the hash given an order.

.. code-block:: solidity

    bytes32 orderHash = IZeroEx(0xDef1C0ded9bec7F1a1670819833240f027b25EfF).getLimitOrderHash(order);

Signing limit orders
--------------------

Limit orders must be signed by the maker of the order. This signature must be passed into the fill function by the taker in order to fill the order.

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

.. code-block:: javascript

   const utils = require('@0x/protocol-utils');
   const order = new utils.LimitOrder({
       makerToken: '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
       takerToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
       ... // Other fields
   });
   // Generate an EIP712 signature
   const signature = await order.eip712SignTypedDataWithProviderAsync(
       web3.currentProvider,
       makerAddress,
   );
   // Generate an EthSign signature
   const signature = await order.ethSignHashWithProviderAsync(
       web3.currentProvider,
       makerAddress,
   );

Filling limit orders
--------------------

Limit orders can be filled with the ``fillLimitOrder()`` or ``fillOrKillLimitOrder()`` functions on the Exchange Proxy. The address calling these function will be considered the "taker" of the order.


``fillLimitOrder()`` fills a single limit order for **up to** ``takerTokenFillAmount``:

.. code-block:: solidity

    function fillLimitOrder(
        // The order
        LimitOrder calldata order,
        // The signature
        Signature calldata signature,
        // How much taker token to fill the order with
        uint128 takerTokenFillAmount
    )
        external
        payable
        // How much maker token from the order the taker received.
        returns (uint128 takerTokenFillAmount, uint128 makerTokenFillAmount);

``fillOrKillLimitOrder()`` fills a single limit order for **exactly** ``takerTokenFillAmount``:

.. code-block:: solidity

    function fillOrKillLimitOrder(
        // The order
        LimitOrder calldata order,
        // The signature
        Signature calldata signature,
        // How much taker token to fill the order with
        uint128 takerTokenFillAmount
    )
        external
        payable
        // How much maker token from the order the taker received.
        returns (uint128 makerTokenFillAmount);

Cancelling a limit order
------------------------

Because there is no way to un-sign an order that has been distributed, limit orders must be cancelled on-chain through one of several functions. They can only be called by the order's maker.

``cancelLimitOrder()`` cancels a single limit order created by the caller:

.. code-block:: solidity

    function cancelLimitOrder(
        // The order
        LimitOrder calldata order
    )
        external;

``batchCancelLimitOrders()`` cancels multiple limit orders created by the caller:

.. code-block:: solidity

    function batchCancelLimitOrders(
        // The orders
        LimitOrder[] calldata orders
    )
        external;

``cancelLimitPairOrders()`` will cancel all limit orders created by the caller with with a maker and taker token pair and a ``salt`` field < the ``salt`` provided. Subsequent calls to this function with the same tokens must provide a ``salt`` >= the last call to succeed.

.. code-block:: solidity

    function cancelLimitPairLimitOrders(
        address makerToken,
        address takerToken,
        uint256 salt;
    )
        external;

``batchCancelLimitPairOrders()`` performs multiple ``cancelLimitPairOrders()`` at once. Each respective index across arrays is equivalent to a single call.

.. code-block:: solidity

    function batchCancelLimitPairOrders(
        address[] makerTokens,
        address[] takerTokens,
        uint256[] salts;
    )
        external;

Getting the status of a limit order
-----------------------------------

The Exchange Proxy exposes a function ``getLimitOrderInfo()`` to query information about a limit order, such as its fillable state and how much it has been filled by.

.. code-block:: solidity

    enum OrderStatus {
        INVALID,
        FILLABLE,
        FILLED,
        CANCELLED,
        EXPIRED
    }

    struct OrderInfo {
        // The order hash.
        bytes32 orderHash;
        // Current state of the order.
        OrderStatus status;
        // How much taker token has been filled in the order.
        uint128 takerTokenFilledAmount;
    }

    function getLimitOrderInfo(
        // The order
        LimitOrder calldata order
    )
        external
        view
        returns (OrderInfo memory orderInfo);

RFQ Orders
==========

RFQ orders are a stripped down version of standard limit orders, supporting fewer fields and a leaner settlement process. These orders are fielded just-in-time, directly from market makers, during the construction of a swap quote on 0x API, and can be filled through the ``fillRfqOrder()`` function on the Exchange Proxy.

Some notable differences from regular limit orders are:

* The only fill restrictions that can be placed on an RFQ order is on the ``tx.origin`` and ``taker`` of the transaction.
* There are no taker token fees.

Structure
----------

The ``RFQOrder`` struct has the following fields:

+-----------------+-------------+-----------------------------------------------------------------------------+
| Field           | Type        | Description                                                                 |
+=================+=============+=============================================================================+
| ``makerToken``  | ``address`` | The ERC20 token the maker is selling and the maker is selling to the taker. |
+-----------------+-------------+-----------------------------------------------------------------------------+
| ``takerToken``  | ``address`` | The ERC20 token the taker is selling and the taker is selling to the maker. |
+-----------------+-------------+-----------------------------------------------------------------------------+
| ``makerAmount`` | ``uint128`` | The amount of makerToken being sold by the maker.                           |
+-----------------+-------------+-----------------------------------------------------------------------------+
| ``takerAmount`` | ``uint128`` | The amount of takerToken being sold by the taker.                           |
+-----------------+-------------+-----------------------------------------------------------------------------+
| ``maker``       | ``address`` | The address of the maker, and signer, of this order.                        |
+-----------------+-------------+-----------------------------------------------------------------------------+
| ``taker``       | ``address`` | Allowed taker address. Set to zero to allow any taker.                      |
+-----------------+-------------+-----------------------------------------------------------------------------+
| ``txOrigin``    | ``address`` | The allowed address of the EOA that submitted the Ethereum transaction.     |
+-----------------+-------------+-----------------------------------------------------------------------------+
| ``pool``        | ``bytes32`` | The staking pool to attribute the 0x protocol fee from this order.          |
|                 |             | Set to zero to attribute to the default pool, not owned by anyone.          |
+-----------------+-------------+-----------------------------------------------------------------------------+
| ``expiry``      | ``uint64``  | The Unix timestamp in seconds when this order expires.                      |
+-----------------+-------------+-----------------------------------------------------------------------------+
| ``salt``        | ``uint256`` | Arbitrary number to enforce uniqueness of the order's hash.                 |
+-----------------+-------------+-----------------------------------------------------------------------------+

Hashing RFQ orders
------------------

The hash of the order is used to uniquely identify an order inside the protocol. It is computed following the `EIP712 spec <https://github.com/ethereum/EIPs/blob/master/EIPS/eip-712.md>`_ standard. In solidity, the hash is computed as:

.. code-block:: solidity

    bytes32 orderHash = keccak256(abi.encodePacked(
        '\x19\x01',
        // The domain separator.
        keccak256(abi.encode(
            // The EIP712 domain separator type hash.
            keccak256(abi.encodePacked(
                'EIP712Domain(',
                'string name,',
                'string version,',
                'uint256 chainId,',
                'address verifyingContract)'
            )),
            // The EIP712 domain separator values.
            'ZeroEx',
            '1.0.0',
            1, // For mainnet
            0xDef1C0ded9bec7F1a1670819833240f027b25EfF, // Address of the Exchange Proxy
        )),
        // The struct hash.
        keccak256(abi.encode(
            // The EIP712 type hash.
            keccak256(abi.encodePacked(
                'RfqOrder(',
                'address makerToken,',
                'address takerToken,',
                'uint128 makerAmount,',
                'uint128 takerAmount,',
                'address maker,'
                'address taker,'
                'address txOrigin,'
                'bytes32 pool,',
                'uint64 expiry,',
                'uint256 salt)'
            )),
            // The struct values.
            order.makerToken,
            order.takerToken,
            order.makerAmount,
            order.takerAmount,
            order.maker,
            order.taker,
            order.txOrigin,
            order.pool,
            order.expiry,
            order.salt
        ))
    ));

Alternatively, the Exchange Proxy contract can be used to retrieve the hash given an order.

.. code-block:: solidity

    bytes32 orderHash = IZeroEx(0xDef1C0ded9bec7F1a1670819833240f027b25EfF).getLimitOrderHash(order);

Signing RFQ orders
------------------

RFQ orders must be signed by the maker of the order. This signature must be passed into the fill function by the taker in order to fill the order.

The protocol accepts signatures defined by the following struct:

.. code-block:: solidity

    struct {
         uint8 v; // Signature data.
         bytes32 r; // Signature data.
         bytes32 s; // Signature data.
    }

The ``@0x/protocol-utils`` node package simplifies the process of creating a valid signature object.

.. code-block:: javascript

   const utils = require('@0x/protocol-utils');
   const order = new utils.RfqOrder({
       makerToken: '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
       takerToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
       ... // Other fields
   });
   // Generate an EthSign signature
   const signature = await order.ethSignHashWithProviderAsync(
       web3.currentProvider,
       makerAddress,
   );

Filling RFQ Orders
------------------

RFQ orders can be filled with the ``fillRfqOrder()`` or ``fillOrKillRfqOrder()`` functions on the Exchange Proxy. The address calling this function will be considered the "taker" of the order.

``fillRfqOrder()`` fills a single RFQ order for **up to** ``takerTokenFillAmount``:

.. code-block:: solidity

    function fillRfqOrder(
        // The order
        RfqOrder calldata order,
        // The signature
        Signature calldata signature,
        // How much taker token to fill the order with
        uint128 takerTokenFillAmount
    )
        external
        // How much maker token from the order the taker received.
        returns (uint128 takerTokenFillAmount, uint128 makerTokenFillAmount);

``fillOrKillRfqOrder()`` fills a single RFQ order for **exactly** ``takerTokenFillAmount``:

.. code-block:: solidity

    function fillOrKillRfqOrder(
        // The order
        RfqOrder calldata order,
        // The signature
        Signature calldata signature,
        // How much taker token to fill the order with
        uint128 takerTokenFillAmount
    )
        external
        // How much maker token from the order the taker received.
        returns (uint128 makerTokenFillAmount);

Cancelling an RFQ order
-----------------------

Similar to limit orders, RFQ orders can be cancelled on-chain through a variety of functions, which can only be called by the order's maker.

``cancelRfqOrder()`` cancels a single RFQ order created by the caller:

.. code-block:: solidity

    function cancelRfqOrder(
        // The order
        RfqOrder calldata order
    )
        external;

``batchCancelRfqOrders()`` cancels multiple RFQ orders created by the caller:

.. code-block:: solidity

    function batchCancelRfqOrders(
        // The orders
        RfqOrder[] calldata orders
    )
        external;

``cancelPairRfqOrders()`` will cancel all RFQ orders created by the caller with with a maker and taker token pair and a ``salt`` field < the ``salt`` provided. Subsequent calls to this function with the same tokens must provide a ``salt`` >= the last call to succeed.

.. code-block:: solidity

    function cancelPairRfqOrders(
        address makerToken,
        address takerToken,
        uint256 salt;
    )
        external;

``batchCancelPairRfqOrders()`` performs multiple ``cancelPairRfqOrders()`` at once. Each respective index across arrays is equivalent to a single call.

.. code-block:: solidity

    function batchCancelPairRfqOrders(
        address[] makerTokens,
        address[] takerTokens,
        uint256[] salts;
    )
        external;

Getting the status of an RFQ order
----------------------------------

The Exchange Proxy exposes a function ``getRfqOrderInfo()`` to query information about an RFQ order, such as its fillable state and how much it has been filled by.

.. code-block:: solidity

    enum OrderStatus {
        INVALID,
        FILLABLE,
        FILLED,
        CANCELLED,
        EXPIRED
    }

    struct OrderInfo {
        // The order hash.
        bytes32 orderHash;
        // Current state of the order.
        OrderStatus status;
        // How much taker token has been filled in the order.
        uint128 takerTokenFilledAmount;
    }

    function getRfqOrderInfo(
        // The order
        RfqOrder calldata order
    )
        external
        view
        returns (OrderInfo memory orderInfo);
