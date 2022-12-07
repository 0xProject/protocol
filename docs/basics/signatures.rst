Signatures
==========

Signatures are used in several places in 0x Protocol to prove an actor
has agreed to the behavior in some off-chain message.

Signatures are represented by the following struct:

.. code:: solidity

   struct Signature {
       // How to validate the signature.
       SignatureType signatureType;
       // EC Signature data.
       uint8 v;
       // EC Signature data.
       bytes32 r;
       // EC Signature data.
       bytes32 s;
   }

Where ``SignatureType`` is:

.. code:: solidity

   enum SignatureType {
       ILLEGAL,
       INVALID,
       EIP712,
       ETHSIGN,
       PRESIGNED
   }

Descriptions of the valid signature types follow.

**EIP712 (``2``)**

This is the signature type typically used when an order is signed
through a UI, such as Metamask. This is commonly achieved by calling
some variant of the ``eth_signTypedData`` (which fully utilizes EIP712)
JSONRPC command on the Ethereum provider.

It can also be generated in a headless manner using a standard
``ecsign()`` implementation
(`example <https://github.com/ethereumjs/ethereumjs-util/blob/master/docs/modules/_signature_.md#const-ecsign>`__)
by re-hashing the `canonical order
hash <signatures.md#limit-order-hashes>`__ with a prefix as follows and
signing the result:

.. code:: solidity

   eip712HashToSign = keccak256(abi.encodePacked(
       "\x19Ethereum Signed Message:\n32",
       orderHash
   ));

ETHSIGN (``3``)
^^^^^^^^^^^^^^^

This is the signature type typically used when an order is signed in a
headless environment (e.g., script or backend). This commonly achieved
by calling the ``eth_sign`` JSONRPC command on the Ethereum provider or,
perhaps more straight-forwardly, using a standard ``ecsign()``
implementation
(`example <https://github.com/ethereumjs/ethereumjs-util/blob/master/docs/modules/_signature_.md#const-ecsign>`__).
Unlike the ``EIP712`` signature type, the hash to sign is simply the
`canonical order hash <signatures.md#limit-order-hashes>`__ (no prefix).

PRESIGNED (``4``)
^^^^^^^^^^^^^^^^^

This signature type is used exclusively with NFT orders (721 and 1155)
for now. This value indicates that the order maker has previously marked
the order as fillable on-chain. The remaining fields in the
``Signature`` struct will be ignored.