######
Orders
######

An order is a message passed into the 0x Protocol to facilitate an ERC20->ERC20 trade. There are currently two types of orders in 0x V4: Limit, RFQ.


.. note::
    As of v4 of the protocol, the maker address is no longer explicitly defined in limit orders. The maker is instead recovered from the signature of the order's EIP712 hash.

.. note::
    0x Orders currently support the exchange of ERC20 Tokens. Other asset classes, like ERC721,
    will be added in the future based on community demand.

Limit Orders
==============

``LimitOrder``s are the standard 0x Order, which encodes a possible trade between a maker and taker at a fixed price. These orders are typically distributed via Mesh/SRA (open orderbook) or OTC, and can be filled through the ``fillOrder()`` function on the Exchange Proxy.

Structure
---------

The ``LimitOrder`` struct has the following fields:

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
| taker        | address | Allowed taker address. Set to zero to allow any taker.                      |
+--------------+---------+-----------------------------------------------------------------------------+
| sender       | address | Allowed address to directly call ``fillLimitOrder()`` (``msg.sender``).     |
|              |         | This is distinct from ``taker`` in meta-transactions.                       |
|              |         | Set to zero to allow any caller.                                            |
+--------------+---------+-----------------------------------------------------------------------------+
| pool         | uint256 | The staking pool to attribute the 0x protocol fee from this order.          |
|              |         | Set to zero to attribute to the default pool, not owned by anyone.          |
+--------------+---------+-----------------------------------------------------------------------------+
| expiry       | uint64  | The Unix timestamp in seconds when this order expires.                      |
+--------------+---------+-----------------------------------------------------------------------------+
| salt         | uint256 | Arbitrary number to enforce uniqueness of the order's hash.                 |
+--------------+---------+-----------------------------------------------------------------------------+

Hashing Limit Orders
--------------------

There are two hashes associated with limit orders: the signature hash and the fill hash. The signature hash is what gets signed during the signing step. The fill hash is the hash used to uniquely identify an order inside the protocol and can be considered the "canonical" hash of the order.

Computing the signature hash
^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The signature hash is the hash of the order struct, following the `EIP712 spec <https://github.com/ethereum/EIPs/blob/master/EIPS/eip-712.md>`. In solidity, the signature hash is computed as:

.. code-block:: solidity
    :lineno:

    bytes32 signatureHash = keccak256(abi.encodePacked(
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
                'address feeRecipient,',
                'uint128 feeAmount,',
                'address taker,',
                'address sender,',
                'uint256 pool,',
                'uint64 expiry,',
                'uint256 salt)'
            )),
            // The struct values.
            order.makerToken,
            order.takerToken,
            order.makerAmount,
            order.takerAmount,
            order.feeRecipient,
            order.feeAmount,
            order.taker,
            order.sender,
            order.pool,
            order.expiry,
            order.salt
        ))
    ));

Computing the fill hash
^^^^^^^^^^^^^^^^^^^^^^^^^

The fill hash simply hashes the previous signature hash with the maker's address, which can be recovered from the order's signature if not already known.

.. code-block:: solidity
    :lineno:

    // For EthSign signatures, the signatureHash would need to be replaced with
    // keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", signatureHash))
    address makerAddress = ecrecover(signatureHash, signature.v, signature.r, signature.s);
    bytes32 fillHash = keccak256(abi.encode(signatureHash, makerAddress));

Alternatively, the Exchange Proxy contract can be used to retrieve these hashes given an order and signature.

.. code-block:: solidity
    :lineno:

    bytes32 signatureHash = IZeroEx(0xDef1C0ded9bec7F1a1670819833240f027b25EfF).getLimitOrderSignatureHash(order);
    bytes32 fillHash = IZeroEx(0xDef1C0ded9bec7F1a1670819833240f027b25EfF).getLimitOrderFillHash(order, signature);

Signing limit orders
--------------------

Limit orders must be signed by the maker of the order. This signature must be passed into the fill function by the taker in order to fill the order.

The protocol accepts signatures defined by the following struct:

.. code-block:: solidity
    :lineno:

    struct {
         uint8 signatureType; // Either 2 or 3
         uint8 v; // Signature data.
         bytes32 r; // Signature data.
         bytes32 s; // Signature data.
    }

There are two types of signatures supported: ``EIP712`` and ``EthSign``.

* The ``EIP712`` signature type is best for web frontends that present an order to be signed through Metamask in a human-readable format. It relies on the `:code:`eth_signTypedData` <https://github.com/ethereum/EIPs/blob/master/EIPS/eip-712.md#specification-of-the-eth_signtypeddata-json-rpc>` JSON-RPC method exposed by MetaMask. This signature has the ``signatureType`` of ``2``.
* The ``EthSign`` signature is best for use with headless providers, such as when using a geth node. This relies on the ``eth_sign`` JSON-RPC method common to all nodes. This signature has the ``signatureType`` of ``3``.

In both cases, the ``@0x/order-utils`` package simplifies generating these signatures.

.. code-block:: javascript
   :linenos:

   const orderUtils = require('@0x/order-utils');
   const order = new orderUtils.LimitOrder({
       makerToken: '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
       takerToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
       ... // Other fields
   });
   // Generate an EIP712 signature
   const signature = await order.signTypedDataAsync(web3.currentProvider, makerAddress);
   // Generate an EthSign signature
   const signature = await order.sign(web3.currentProvider, makerAddress);

Filling limit orders
--------------------

Limit orders can be fill with the ``fillLimitOrder()`` or `fillOrKillLimitOrder()`` functions on the Exchange Proxy. The person calling these function will be considered the "taker" of the order.


``fillLimitOrder()`` fills a single limit order for **up to** ``takerTokenFillAmount``:

.. code-block:: solidity
    :lineno:

    function fillLimitOrder(
        // The order
        LimitOrder calldata order,
        // The signature
        Signature calldata signature,
        // How much taker token to fill the order with
        uint256 takerTokenFillAmount
    )
        external
        payable
        // How much maker token from the order the taker received.
        returns (uint256 makerTokenFillAmount);

``fillOrKillLimitOrder()`` fills a single limit order for **exactly** ``takerTokenFillAmount``:

.. code-block:: solidity
    :lineno:

    function fillOrKillLimitOrder(
        // The order
        LimitOrder calldata order,
        // The signature
        Signature calldata signature,
        // How much taker token to fill the order with
        uint256 takerTokenFillAmount
    )
        external
        payable
        // How much maker token from the order the taker received.
        returns (uint256 makerTokenFillAmount);

Cancelling a limit order
------------------------

Because there is no way to un-sign an order that has been distributed, limit orders must be cancelled on-chain through either the ``cancelLimitOrder()`` or ``cancelLimitOrdersUpTo()`` functions. Both can only be called by the order's maker.

``cancelLimitOrder()`` cancels a single limit order created by the caller:

.. code-block:: solidity
    :lineno:

    function cancelLimitOrder(
        // The order
        LimitOrder calldata order
    )
        external;

``cancelLimitOrdersUpTo()`` will cancel limit orders created by the caller with a ``salt`` field <= the value provided. Subsequent calls to this function must provide a ``salt`` >= the last call to succeed.

.. code-block:: solidity
    :lineno:

    function cancelLimitOrdersUpTo(
        uint256 salt;
    )
        external;

Getting the status of a limit order
-----------------------------------

The Exchange Proxy exposes a function ``getLimitOrderInfo()`` to query information about a limit order, such as its fillable state and how much it has been filled by.

.. code-block:: solidity
    :lineno:

    enum OrderState {
        INVALID,
        CANCELLED,
        FILLABLE,
        FILLED
    }

    struct LimitOrderStatus {
        // The fill hash.
        bytes32 fillHash;
        // Current state of the order.
        OrderState state;
        // How much taker token has been filled in the order.
        uint256 takerTokenFilledAmount;
    }

    function getLimitOrderInfo(
        // The order
        LimitOrder calldata order,
        // The signature
        Signature calldata signature
    )
        external
        view
        returns (LimitOrderStatus memory status);

RFQ Orders
==========

``RfqOrder``s are a stripped down version of ``LimitOrder``s, supporting fewer fields and a leaner settlement process. These orders are fielded just-in-time, directly from market makers, during the construction of a swap quote on 0x API, and can be filled through the ``fillRfqOrder()`` function on the Exchange Proxy.

Some notable differences from regular limit orders are:

* RFQ orders cannot be cancelled.
* RFQ orders can only be filled once. Even a partial fill will mark the order as ``FILLED``.
* The only fill restrictions that can be placed on an RFQ order is on the ``tx.origin`` of the transaction.
* There are no taker token fees.

Structure
----------

The `RFQOrder` struct has the following fields:

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
| txOrigin    | address | The allowed address of the EOA that submitted the Ethereum transaction.     |
+-------------+---------+-----------------------------------------------------------------------------+
| pool        | uint256 | The staking pool to attribute the 0x protocol fee from this order.          |
|             |         | Set to zero to attribute to the default pool, not owned by anyone.          |
+-------------+---------+-----------------------------------------------------------------------------+
| expiry      | uint64  | The Unix timestamp in seconds when this order expires.                      |
+-------------+---------+-----------------------------------------------------------------------------+
| salt        | uint256 | Arbitrary number to enforce uniqueness of the order's hash.                 |
+-------------+---------+-----------------------------------------------------------------------------+

Hashing RFQ Orders
------------------

There are two hashes associated with RFQ orders: the signature hash and the fill hash. The signature hash is what gets signed during the signing step. The fill hash is the hash used to uniquely identify an order inside the protocol and can be considered the "canonical" hash of the order.

Computing the signature hash
^^^^^^^^^^^^^^^^^^^^^^^^^^^^

The signature hash is the hash of the order struct, following the `EIP712 spec <https://github.com/ethereum/EIPs/blob/master/EIPS/eip-712.md>`. In solidity, the signature hash is computed as:

.. code-block:: solidity
    :lineno:

    bytes32 signatureHash = keccak256(abi.encodePacked(
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
                'address txOrigin,'
                'uint256 pool,',
                'uint64 expiry,',
                'uint256 salt)'
            )),
            // The struct values.
            order.makerToken,
            order.takerToken,
            order.makerAmount,
            order.takerAmount,
            order.txOrigin,
            order.pool,
            order.expiry,
            order.salt
        ))
    ));

Computing the fill hash
^^^^^^^^^^^^^^^^^^^^^^^

The fill hash simply hashes the previous signature hash with the maker's address, which can be recovered from the order's signature if not already known.

.. code-block:: solidity
    :lineno:

    // For EthSign signatures, the signatureHash would need to be replaced with
    // keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", signatureHash))
    address makerAddress = ecrecover(
        keccak256(abi.encodePacked(
            '\x19Ethereum Signed Message:\n32',
            signatureHash
        )),
        signature.v,
        signature.r,
        signature.s
    );
    bytes32 fillHash = keccak256(abi.encode(signatureHash, makerAddress));

Alternatively, the Exchange Proxy contract can be used to retrieve these hashes given an order and signature.

.. code-block:: solidity
    :lineno:

    bytes32 signatureHash = IZeroEx(0xDef1C0ded9bec7F1a1670819833240f027b25EfF).getRfqOrderSignatureHash(order);
    bytes32 fillHash = IZeroEx(0xDef1C0ded9bec7F1a1670819833240f027b25EfF).getRfqOrderFillHash(order, signature);

Signing RFQ orders
------------------

RFQ orders must be signed by the maker of the order. This signature must be passed into the fill function by the taker in order to fill the order.

The protocol accepts signatures defined by the following struct:

.. code-block:: solidity
    :lineno:

    struct {
         uint8 v; // Signature data.
         bytes32 r; // Signature data.
         bytes32 s; // Signature data.
    }

The ``@0x/order-utils`` node package simplifies the process of creating a valid signature object.

.. code-block:: javascript
   :linenos:

   const orderUtils = require('@0x/order-utils');
   const order = new orderUtils.RfqOrder({
       makerToken: '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
       takerToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
       ... // Other fields
   });
   const signature = await order.sign(web3.currentProvider, makerAddress);

Filling RFQ Orders
------------------

RFQ orders can be fill with the ``fillRfqOrder()`` function on the Exchange Proxy. The person calling this function will be considered the "taker" of the order. The function has the following interface:

.. code-block:: solidity
    :lineno:

    function fillRfqOrder(
        // The order
        RfqOrder calldata order,
        // The signature
        Signature calldata signature,
        // How much taker token to fill the order with
        uint256 takerTokenFillAmount
    )
        external
        payable
        // How much maker token from the order the taker received.
        returns (uint256 makerTokenFillAmount);

Getting the status of a RFQ order
---------------------------------

The Exchange Proxy exposes a function ``getRfqOrderInfo()`` to query information about a RFQ order, such as its fillable state and how much it has been filled by.

.. code-block:: solidity
    :lineno:

    enum OrderState {
        INVALID,
        CANCELLED,
        FILLABLE,
        FILLED
    }

    struct RfqOrderStatus {
        // The fill hash.
        bytes32 fillHash;
        // Current state of the order.
        OrderState state;
        // How much taker token has been filled in the order.
        uint256 takerTokenFilledAmount;
    }

    function getRfqOrderInfo(
        // The order
        RfqOrder calldata order,
        // The signature
        Signature calldata signature
    )
        external
        view
        returns (RfqOrderStatus memory status);
