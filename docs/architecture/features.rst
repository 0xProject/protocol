###############################
Features
###############################

Features implement the core feature set of the 0x Protocol. They are trusted with user allowances and permissioned by the `0x Governor <./governor.html>`_. Features are run in the context of the `Proxy <../proxy.html>`_, via a ``delegatecall``.

Below is a catalog of Features.

.. table::
    :widths: 20 60 20

    +----------------------------+----------------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
    | **Feature**                | **Description**                                                                                    | **Resources**                                                                                                                                                                                               |
    +----------------------------+----------------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
    | BatchFillNativeOrdersFeature | Exposes batch fill functions for ERC20 Limit and RFQ Orders.                                     |                                                                                                                                                                                                             |
    +----------------------------+----------------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
    | BootstrapFeature           | Bootstraps the entire system.                                                                      | `Code <https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/features/BootstrapFeature.sol>`__; `Usage <./proxy.html#bootstrapping>`__                                     |
    +----------------------------+----------------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
    | ERC721OrdersFeature/ERC1155OrdersFeature   | Settlement and management of NFT Limit Orders.                                     |                                                                                                                                                                                                             |
   +----------------------------+----------------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
    | FundRecoveryFeature        | Administrative functions for rescuing tokens that have been mistakenly sent to the Exchange Proxy. |                                                                                                                                                                                                             |
    +----------------------------+----------------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
    | LiquidityProviderFeature   | Connects the system to Pluggable Liquidity (PLP).                                                  | `Code <https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/features/LiquidityProviderFeature.sol>`__; `Usage <../advanced/plp.html#trading-with-a-liquidity-provider>`__ |
    +----------------------------+----------------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
    | MetaTransactionsFeature    | Executes Meta-Transactions.                                                                        | `Code <https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/features/MetaTransactionsFeature.sol>`__; `Usage <../advanced/mtx.html>`__                                    |
    +----------------------------+----------------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
    | MultiplexFeature           | Gas-optimized fulfillment functions for a subset of 0x API swap quotes.                            |                                                                                                                                                                                                             |
    +----------------------------+----------------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
    | NativeOrdersFeature     | Functions for native 0x orders (see `Orders <../basics/orders.html>`_).                         | `Code <https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/features/NativeOrdersFeature.sol>`__; `Usage <../basics/functions.html>`__                                          |
    +----------------------------+----------------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
    | OtcOrdersFeature           |  Settlement functions for a more restrictive form of RFQ orders.                                   |                                                                                                                                                                                                             |
    +----------------------------+----------------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
    | OwnableFeature             | An implementation of Ownable that is compatible with the delegate-call proxy pattern.              | `Code <https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/features/OwnableFeature.sol>`__; `Usage <./architecture/proxy.html#ownership>`__                              |
    +----------------------------+----------------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
    | PancakeSwapFeature         | Fulfillment function for swap 0x API quotes against Pancakeswap (BSC only).                        |                                                                                                                                                                                                             |
    +----------------------------+----------------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
    | SignatureValidationFeature | *This feature is deprecated. Its code will be removed after the contract is decommissioned.*       | `Code <https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/features/SignatureValidatorFeature.sol>`__                                                                    |
    +----------------------------+----------------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
    | SimpleFunctionRegistry     | Implements the registry of functions/features available in the system.                             | `Code <https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/features/SimpleFunctionRegistryFeature.sol>`__; `Usage <./proxy.html#function-registry>`__                    |
    +----------------------------+----------------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
    | TokenSpenderFeature        | *This feature is deprecated. Its code will be removed after the contract is decommissioned.*       | `Code <https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/features/TokenSpenderFeature.sol>`__                                                                          |
    +----------------------------+----------------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
    | TransformERC20Feature      | Executes `Transformers <./transformers.html>`_ to aggregate liquidity and operate on ERC20 tokens. | `Code <https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/features/TransformERC20Feature.sol>`__; `Usage <../advanced/erc20_transformations.html>`__                    |
    +----------------------------+----------------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
    | UniswapFeature             | A highly-optimized UniswapV2 router; used to source liquidity from Uniswap.                        | `Code <https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/features/UniswapFeature.sol>`__; `Usage <../advanced/uniswap.html>`__                                         |
    +----------------------------+----------------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+

Implementing a Feature
======================
The only requirement is that the Feature implements the interface in `IFeature <https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/features/IFeature.sol>`_. Review the `Proxy Section <./proxy.html>`_ for details on how to write a smart contract that is compatible with our architecture (ex, how to properly manage state).

.. code-block:: solidity

    /// @dev Basic interface for a feature contract.
    interface IFeature {

        /// @dev The name of this feature set.
        function FEATURE_NAME() external view returns (string memory name);

        /// @dev The version of this feature set.
        function FEATURE_VERSION() external view returns (uint256 version);
    }


Best Practices
================

We use this checklist to review the safety of new Features.

::

    - [ ] Feature has updated version information.
    - [ ] implements IFeature interface.
    - [ ] Feature contracts are stateless (including inherited contracts).
    - [ ] onlySelf feature functions are prefixed with _.
    - [ ] Feature functions are added to full_migration_tests.
    - [ ] No delegatecalls from inside a feature. Call other features through the router.
    - [ ] No self-destruct in features (except BootstrapFeature).
    - [ ] No intentionally persistent (non-atomic) balances on the Exchange Proxy.
    - [ ] No direct access to another feature’s storage bucket without strong justification.
    - [ ] No executing arbitrary calldata from the context of the Exchange Proxy.
    - [ ] No external calls to arbitrary contracts from within the Exchange Proxy.
    - [ ] Features use unique StorageIds.
    - [ ] Document functions with execution contexts outside of the Exchange Proxy.
    - [ ] Document feature dependencies in checklist doc.
    - [ ] Document reentrant functions in checklist doc.
    - [ ] Document temporary balances.


Commonly Referenced Features
============

This is a non-exhaustive overview of commonly referenced features that may be registered/deployed on the Exchange Proxy. What features an instance of the Exchange Proxy has depends on the needs of the network it is deployed on. For instance, limit orders are not typically deployed on networks where the only focus for the protocol is swap aggregation.


NativeOrders
============

Limit Orders
------------

Highlights:

-  Limit orders in the 0x protocol are off-chain messages that define a
   fixed-rate trade signed by a “maker” and filled on-chain by a
   “taker.”
-  The protocol is non-custodial in that neither party needs to deposit
   funds into the protocol in advance. Instead, *both parties must
   first* `grant the
   protocol <../../../../introduction/0x-cheat-sheet.md>`__ *an ERC20
   allowance for the tokens they intend to sell*, and the protocol will
   spend this allowance during settlement.
-  The exchange rate of a limit order is given by the taker and maker
   token quantities.
-  Limit orders may be repeatedly partially filled until the order is
   fully filled (the full quantities of either taker and maker tokens
   defined in the order have been exchanged through the order).
-  Once a limit order is signed, anyone with the order and signature
   details can fill the order (unless the order restricts the ``taker``
   or ``sender`` address). There is no way to un-sign an order so
   cancellations must be performed on-chain before a taker attempts to
   fill it.
-  ERC20 limit orders only work with ERC20 tokens, meaning raw
   (unwrapped) native asset (ETH on Ethereum) cannot be used as a maker
   or taker token. E.g., on Ethereum, WETH must be used instead.

The Limit Order Struct
~~~~~~~~~~~~~~~~~~~~~~

.. code:: solidity

   struct LimitOrder {
       address makerToken;
       address takerToken;
       uint128 makerAmount;
       uint128 takerAmount;
       uint128 takerTokenFeeAmount;
       address maker;
       address taker;
       address sender;
       address feeRecipient;
       bytes32 pool;
       uint64 expiry;
       uint256 salt;
   }

-  ``makerToken``: The address of the ERC20 token being sold by the
   maker of this order and bought by the taker of this order.
-  ``takerToken``: The address of the ERC20 token being sold by the
   taker of this order and bought by the maker of this order.
-  ``makerAmount``: The total quantity of ``makerToken`` that can be
   bought/sold by when filling this order. The ratio of this with
   ``takerToken`` establish the exchange rate.
-  ``takerAmount``: The total quantity of ``takerToken`` that can be
   bought/sold by when filling this order. The ratio of this with
   ``takerToken`` establish the exchange rate.
-  ``takerTokenFeeAmount``: May be ``0``. The total fee that can be paid
   to ``feeRecipient`` when filling this order, denominated in
   ``takerToken``. Fees are paid *in addition* to the ``takerAmount``
   when the order is filled.
-  ``maker``: The maker of this order. This is the Ethereum address that
   creates and signs the order.
-  ``taker``: May be NULL (``0x000...``). If set, only this address can
   fill this order.
-  ``sender``: May be NULL (``0x000...``). If set, only this address can
   directly call ``fillLimitOrder()``. This is intended for use with
   meta-transactions.
-  ``feeRecipient``: The recipient of any fees determined by
   ``takerTokenFeeAmount`` when the order is filled.
-  ``pool`` (defunct): The staking pool that receives a the protocol fee
   paid for filling this order. Currently protocol fees are disabled so
   this does nothing.
-  ``expiry``: The block timestamp (UTC) of when this order expires. The
   order cannot be filled at or after this time.
-  ``salt``: A random nonce the maker sets to ensure the hash of this
   order is unique. Some makers choose to use an montonically increasing
   value for this field to take advantage of bulk cancellation
   functions.

Limit Order Hashes
~~~~~~~~~~~~~~~~~~

The protocol utilizes a canonical,
`EIP712 <https://eips.ethereum.org/EIPS/eip-712>`__ hash of the limit
order struct to identify the order internally. In typical usage, this is
also the hash that the maker signs to make the order valid and fillable.

Computing the hash of a limit order in solidity is given by:

.. code:: solidity

   keccak256(abi.encode(
       bytes32(0xce918627cb55462ddbb85e73de69a8b322f2bc88f4507c52fcad6d4c33c29d49),
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
   ));

Another way to get the hash of an order is to simply call
``getLimitOrderHash()`` on the `Exchange Proxy <../>`__.

Limit Order Signatures
~~~~~~~~~~~~~~~~~~~~~~

To fill an order, the taker must also submit an ECDSA signature
generated for that order, typically signed by the maker. For information
on the format an how to generate these signatures, see
`signatures.md <../../signatures.md>`__.

Smart Contract Makers
~~~~~~~~~~~~~~~~~~~~~

Smart contracts do not have a private key associated with them so they
cannot generate a valid ECDSA signature. Yet they still can operate as
the ``maker`` of an order. To do this, they must delegate an external
signer address who can sign and cancel orders (using the above signature
schemes) on their behalf. See ``registerAllowedOrderSigner()``.

Information Functions
~~~~~~~~~~~~~~~~~~~~~

-  **``getLimitOrderInfo(LimitOrder order) view returns (OrderInfo memory orderInfo)``**

   -  Get order info for a limit order.
   -  Returns a struct with the ``orderHash``, ``status``, and
      ``takerTokenFilledAmount`` (how much the order has been filled,
      denominated in taker tokens).

-  **``getLimitOrderHash(LimitOrder order) view returns (bytes32 orderHash)``**

   -  Get the `canonical hash <nativeorders.md#limit-order-hashes>`__ of
      a limit order.

-  **``isValidOrderSigner(address maker, address signer) view returns (bool isAllowed)``**

   -  Check whether a ``maker`` has delegated an external ``signer``
      address to sign orders on their behalf.

Maker Functions
~~~~~~~~~~~~~~~

-  **``registerAllowedOrderSigner(address[] origins, bool allowed)``**

   -  Toggles whether multiple external addresses are allowed to sign
      orders on behalf of the caller of this function.

-  **``cancelLimitOrder(LimitOrder order)``**

   -  Mark an order cancelled for which the ``maker`` is the caller.
   -  Succeeds even if the order is already cancelled.

-  **``batchCancelLimitOrders(LimitOrder[] orders)``**

   -  Batch version of ``cancelLimitOrder()``.

-  **``cancelPairLimitOrders(address makerToken, address takerToken, uint256 minValidSalt)``**

   -  Cancels all limit orders for whom the ``maker`` is also the
      caller, with a given ``makerToken``, ``takerToken``, and a
      ``salt < minValidSalt``.

-  **``batchCancelPairLimitOrders(address[] makerTokens, address[] takerTokens, uint256[] minValidSalts)``**

   -  Batch version of ``cancelPairLimitOrders()``.

-  **``cancelPairLimitOrdersWithSigner(address maker, address makerToken, address takerToken, uint256 minValidSalt)``**

   -  Cancels all limit orders for with a given ``maker``,
      ``makerToken``, ``takerToken``, and a ``salt < minValidSalt``.
   -  The caller must have previously been registered as an external
      order signer with ``registerAllowedOrderSigner()``.

-  **``batchCancelPairLimitOrdersWithSigner(address maker, address[] memory makerTokens, address[] takerTokens, uint256[] minValidSalts)``**

   -  Batch version of ``cancelPairLimitOrdersWithSigner()``.

Taker/Fill Functions
~~~~~~~~~~~~~~~~~~~~

-  **``fillLimitOrder(LimitOrder order, Signature signature, uint128 takerTokenFillAmount) returns (uint128 takerTokenFilledAmount, uint128 makerTokenFilledAmount)``**

   -  Fills a single limit order for *up to* ``takerTokenFillAmount``
      taker tokens. If less than ``takerTokenFillAmount`` tokens are
      left on the order (possibly due to a prior partial fill), the
      remaining amount will be filled instead.
   -  The caller of this function is considered the taker.
   -  ``signature`` is an ECDSA order signature generated by either the
      order’s ``maker`` or a designated external order signer (see
      `#smart-contract-makers <nativeorders.md#smart-contract-makers>`__).
   -  Prior to calling this function, the maker and taker (caller) must
      have granted the Exchange Proxy an adequent ERC20 allowance for
      their respective token being sold.
   -  Returns how much of both taker and maker tokens were actually
      filled during settlement.

-  **``fillOrKillLimitOrder(LimitOrder order, Signature signature, uint128 takerTokenFillAmount) returns (uint128 makerTokenFilledAmount)``**

   -  Similar to ``fillLimitOrder()`` but must fill *exactly*
      ``takerTokenFillAmount`` taker tokens or else the function will
      revert.

Events
~~~~~~

.. code:: solidity

   /// @dev Emitted whenever a `LimitOrder` is filled.
   /// @param orderHash The canonical hash of the order.
   /// @param maker The maker of the order.
   /// @param taker The taker of the order.
   /// @param feeRecipient Fee recipient of the order.
   /// @param takerTokenFilledAmount How much taker token was filled.
   /// @param makerTokenFilledAmount How much maker token was filled.
   /// @param protocolFeePaid How much protocol fee was paid.
   /// @param pool The fee pool associated with this order.
   event LimitOrderFilled(
       bytes32 orderHash,
       address maker,
       address taker,
       address feeRecipient,
       address makerToken,
       address takerToken,
       uint128 takerTokenFilledAmount,
       uint128 makerTokenFilledAmount,
       uint128 takerTokenFeeFilledAmount,
       uint256 protocolFeePaid,
       bytes32 pool
   );

   /// @dev Emitted whenever a limit or RFQ order is cancelled.
   /// @param orderHash The canonical hash of the order.
   /// @param maker The order maker.
   event OrderCancelled(
       bytes32 orderHash,
       address maker
   );

   /// @dev Emitted whenever Limit orders are cancelled by pair by a maker.
   /// @param maker The maker of the order.
   /// @param makerToken The maker token in a pair for the orders cancelled.
   /// @param takerToken The taker token in a pair for the orders cancelled.
   /// @param minValidSalt The new minimum valid salt an order with this pair must
   ///        have.
   event PairCancelledLimitOrders(
       address maker,
       address makerToken,
       address takerToken,
       uint256 minValidSalt
   );

   /// @dev Emitted when new order signers are registered
   /// @param maker The maker address that is registering a designated signer.
   /// @param signer The address that will sign on behalf of maker.
   /// @param allowed Indicates whether the address should be allowed.
   event OrderSignerRegistered(
       address maker,
       address signer,
       bool allowed
   );

Relevant Code
-------------

-  :literal:`[`INativeOrdersFeature.sol`](https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/features/interfaces/INativeOrdersFeature.sol)`
-  :literal:`[`LibNativeOrders.sol`](https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/features/libs/LibNativeOrder.sol)`
-  :literal:`[`LibSignature.sol`](https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/features/libs/LibSignature.sol)`
-   ```NativeOrdersFeature.sol`` <https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/features/NativeOrdersFeature.sol>`__\ \`\`


ERC721Orders
============

| This feature implements the ERC721<->ERC20/ETH limit order type. The
  source code for
  `ERC721OrdersFeature.sol <https://github.com/0xProject/protocol/blob/c1177416f50c2465ee030dacc14ff996eebd4e74/contracts/zero-ex/contracts/src/features/nft_orders/ERC721OrdersFeature.sol>`__
  can be found
  `here <https://github.com/0xProject/protocol/blob/c1177416f50c2465ee030dacc14ff996eebd4e74/contracts/zero-ex/contracts/src/features/nft_orders/ERC721OrdersFeature.sol>`__.
| Here are some highlights:

-  Limit orders in the 0x protocol are off-chain messages that define a
   fixed-rate trade signed by a “maker” and filled on-chain by a
   “taker.”
-  The protocol is non-custodial in that neither party needs to deposit
   assets into the protocol in advance. Instead, *both parties must
   first* `grant the
   protocol <../../../../introduction/0x-cheat-sheet.md>`__\ *an
   ERC20/ERC721 allowance for the assets they intend to sell*, and the
   protocol will spend this allowance during settlement.
-  Due to the non-custodial nature of the protocol, the raw native asset
   (e.g., ETH) is only supported as a taker or fee token. Makers must
   use a wrapped variant (e.g., WETH) if trying to sell the network’s
   native asset.
-  ERC721 limit orders can only be filled once.
-  Once a limit order is signed, anyone with the order and signature
   details can fill the order (unless the order restricts the ``taker``
   address). There is no way to un-sign an order so cancellations must
   be performed on-chain before a taker attempts to fill it.
-  An NFT order can be made for a ERC721 token with an unknown ID (see
   `ERC721 Buy Orders <erc721orders.md#erc721-buy-orders>`__).

The ERC721 Limit Order Struct
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code:: solidity

   struct ERC721Order {
       TradeDirection direction;
       address maker;
       address taker;
       uint256 expiry;
       uint256 nonce;
       address erc20Token;
       uint256 erc20TokenAmount;
       Fee[] fees;
       address erc721Token;
       uint256 erc721TokenId;
       Property[] erc721TokenProperties;
   }

-  ``direction``: Whether this order is selling an NFT or buying an NFT
   (see `#erc721-sell-orders <erc721orders.md#erc721-sell-orders>`__ or
   `#erc721-buy-orders <erc721orders.md#erc721-buy-orders>`__).
-  ``maker``: The maker/signer of this limit order.
-  ``taker``: Who can fill this order. May be NULL (``0x000...``) to
   allow anyone.
-  ``expiry``: The block timestamp at which this trade is no longer
   valid.
-  ``nonce``: Usually a random nonce the maker sets to ensure the hash
   of this order is unique and to identify it during fills and
   cancellations. Carefully choosing this value can be used to reduce
   gas usage (see `#smart-nonces <erc721orders.md#smart-nonces>`__).
-  ``erc20Token``: The ERC20 token (or native asset, if allowed) to
   exchange for the NFT. For eligible trades, the native asset may be
   specified as ``0xeee...``.
-  ``erc20TokenAmount``: The amount of ``erc20Token`` to exchange for
   the NFT.
-  ``fees``: Optional fees, denominated in ``erc20Token``, that are paid
   out to designated recipients when the order is filled. Fees are
   collected *in addition* to the ``erc20TokenAmount``.
-  ``erc721Token``: The NFT’s ERC721 token contract address being
   exchanged.
-  ``erc721TokenId``: The ID of the ERC721 token inside ``erc721Token``
   being exchanged. This will be ignored for `buy
   orders <erc721orders.md#erc721-buy-orders>`__ with valid
   ``erc721TokenProperties``.
-  ``erc721TokenProperties``: A series of contracts that will be called
   to validate an unknown NFT token ID being bought at settlement.

Where ``TradeDirection`` is:

.. code:: solidity

   enum TradeDirection {
       SELL_NFT,
       BUY_NFT
   }

``Fee`` is:

.. code:: solidity

   struct Fee {
       address recipient;
       uint256 amount;
       bytes feeData;
   }

``Property`` is:

.. code:: solidity

   struct Property {
       address propertyValidator;
       bytes propertyData;
   }

Order Hashes
~~~~~~~~~~~~

The protocol utilizes a canonical,
`EIP712 <https://eips.ethereum.org/EIPS/eip-712>`__ hash of the limit
order struct to verify the authenticity of the order. In typical usage,
this is the hash that the maker signs to make the order valid and
fillable.

Computing the hash of a limit order in solidity is given by:

.. code:: solidity

   bytes32[] memory feesStructHashArray = new bytes32[](order.fees.length);
   for (uint256 i = 0; i < order.fees.length; ++i) {
       feesStructHashArray[i] = keccak256(abi.encode(
           bytes32(0xe68c29f1b4e8cce0bbcac76eb1334bdc1dc1f293a517c90e9e532340e1e94115),
           order.fees[i].recipient,
           order.fees[i].amount,
           keccak256(order.fees[i].feeData)
       ));
   }
   bytes32 memory feesHash = keccak256(abi.encodePacked(
       feesStructHashArray
   ));
   bytes32[] memory propertiesStructHashArray = new bytes32[](order.erc721TokenProperties.length);
   for (uint256 i = 0; i < order.erc721TokenProperties.length; ++i) {
       propertiesStructHashArray[i] = keccak256(abi.encode(
           bytes32(0x6292cf854241cb36887e639065eca63b3af9f7f70270cebeda4c29b6d3bc65e8),
           order.erc721TokenProperties[i].propertyValidator,
           keccak256(order.erc721TokenProperties[i].propertyData)
       ));
   }
   bytes32 memory propertiesHash = keccak256(abi.encodePacked(
       propertiesStructHashArray
   ));
   keccak256(abi.encode(
       bytes32(0x2de32b2b090da7d8ab83ca4c85ba2eb6957bc7f6c50cb4ae1995e87560d808ed),
       order.direction,
       order.maker,
       order.taker,
       order.expiry,
       order.nonce,
       order.erc20Token,
       order.erc20TokenAmount,
       kecca256(abi,
       order.erc721Token,
       order.erc721TokenId,
       propertiesHash
   ));

Another way to get the hash of an order is to simply call
``getERC721OrderHash()`` on the `Exchange Proxy <../>`__.

Signatures
~~~~~~~~~~

To fill an order, the taker must (usually, see below) also submit an
ECDSA signature generated for that order, typically signed by the maker.
For information on the format an how to generate these signatures, see
`signatures.md <../../signatures.md>`__.

Smart Contract Makers
~~~~~~~~~~~~~~~~~~~~~

Smart contracts do not have a private key associated with them so they
cannot generate a valid ECDSA signature. Yet they still can operate as
the ``maker`` of an order. To do this, they must call
``preSignERC721Order()``, which will allow the order to be filled using
the ``PRESIGNED`` ``signatureType``.

Network Discoverable Orders
~~~~~~~~~~~~~~~~~~~~~~~~~~~

Another feature of the ``preSignERC721Order()`` function is that it will
emit an event ``ERC721OrderPreSigned`` (see
`#events <erc721orders.md#events>`__) listing all the details of the
order. Anyone can listen for these events and potentially fill the order
without relying on off-chain sharing mechanisms.

Smart Nonces
~~~~~~~~~~~~

The ``nonce`` field in the order is a number the maker chooses to ensure
uniqueness of the order, but it also has some other functions:

-  To identify the order (in addition to the caller/maker) in
   cancellation functions (see
   `#maker-functions <erc721orders.md#maker-functions>`__).
-  To identify the order when checking/updating its filled state.
-  To potentially reuse EVM storage slots that mark an order as filled,
   which can provide significant gas savings (~15k) when filling or
   cancelling the order.

Gas Optimized Nonces
^^^^^^^^^^^^^^^^^^^^

The protocol marks ERC721 orders as filled when they either get
cancelled or filled. Instead of always using a completely new storage
slot for each order from a maker, the upper 248 bits of the nonce will
identify the storage slot/bucket/status vector to be used and the lower
8 bits of the nonce will identify the bit offset in that slot (each slot
is also 256 bits) which will be flipped from 0 to 1 when the order is
cancelled or filled.

To take advantage of this gas optimization, makers should reuse the
upper 248 bits of their nonce across up to 256 different orders, varying
the value of the lower 8 bits between them.

.. image:: docs/_static/img/gas_optimized_nonces.png
  :width: 400

ERC721 Sell Orders
~~~~~~~~~~~~~~~~~~

Sell orders are orders where ``direction`` is set to
``TradeDirection.SELL_NFT``, which indicates that a *maker wishes
to*\ **sell**\ *an ERC721 token that they possess*.

For these orders, the maker must set the ``erc721Token`` and
``erc721TokenId`` fields to the ERC721 token contract address and the ID
of the ERC721 token they’re trying to sell, respectively. The
``erc20Token`` and ``erc20TokenAmount`` fields will be set to the ERC20
token and the ERC20 amount they wish to receive for their NFT.

ERC721 Buy Orders
~~~~~~~~~~~~~~~~~

Buy orders are where ``direction`` is set to ``TradeDirection.BUY_NFT``,
which indicates that a *maker wishes to*\ **buy**\ *an ERC721 token that
they do not possess*.

A buy order can be created for a known token ID or an unknown token ID.

Buying a Known NFT Token ID
^^^^^^^^^^^^^^^^^^^^^^^^^^^

This is when the maker knows exactly which NFT they want, down to the
token ID. These are fairly straight-forward and just require the maker
setting the ``erc721Token`` and ``erc721TokenId`` fields to the ERC721
token contract address and the ID of the token they want to buy,
respectively. The The ``erc20Token`` and ``erc20TokenAmount`` fields
will be set to the ERC20 token and the ERC20 amount they are willing to
pay for that particular NFT. The ``erc721TokenProperties`` field should
be set to the empty array.

Buying an Unknown NFT Token ID
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

This is when the maker will accept any token ID from an ERC721 contract.
In this scenario, the ``erc721TokenProperties`` order field is used to
signal and validate terms of this kind of order.

If a maker wishes to accept any token ID, regardless of any other
properties of that NFT, they should set the ``erc721TokenProperties``
field to an array with exactly one item in it:

.. code:: solidity

   [
       Property({
           propertyValidator: address(0),
           propertyData: ""
       })
   ]

If a maker wishes to accept any token ID, but only if that token also
satisfies some other properties (e.g., cryptokitty with green eyes),
they should set ``erc721TokenProperties`` to an array of callable
property validator contracts. Each ``propertyValidator`` contract must
implement the ``IPropertyValidator`` interface, which is defined as:

.. code:: solidity

   interface IPropertyValidator {
       function validateProperty(
           address tokenAddress,
           uint256 tokenId,
           bytes calldata propertyData
       )
           external
           view;
   }

Each entry in ``erc721TokenProperties`` with a non-null
``propertyValidator`` address will be called using this interface,
passing in the ``tokenAddress`` and ``tokenId`` of the ERC721 the taker
is trying to fill the order with. If the validator fails to validate the
requested properties of the NFT, it should revert.

The ``propertyData`` field of each property entry is supplied by the
maker and is also passed in. For example, if a property validator
contract was designed to check that a cryptokitty had a specific eye
color, the ``propertyData`` could simply be some encoding of
``"green"``, and the validator contract would parse this data and
perform the necessary checks on the token to ensure it has green eyes.

Taker Callbacks
~~~~~~~~~~~~~~~

Some fill functions accept a ``callbackData`` ``bytes`` parameter. If
this parameter is non-empty (``length > 0``), a call will be issued
against the caller using ``callbackData`` as the full call data. This
call happens after the transfer of the maker asset and before the
transfer of the taker asset. This allows a smart contract taker to
leverage the maker’s asset to fulfill their end of the trade. For
example, if a taker finds a compatible, complementary order on another
protocol they could fulfill that order with the maker’s asset, supply
the Exchange Proxy with the necessary opposing asset with the proceeds,
and pocket the difference.

Information Functions (read-only)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-  **``validateERC721OrderSignature(ERC721Order order, Signature signature)``**

   -  Check if ``signature`` is valid for ``order``. Reverts if not.
      \`` 

-  **``validateERC721OrderProperties(ERC721Order order, uint256 erc721TokenId)``**

   -  Validates that a given ``erc721TokenId`` satisifes a *buy* order.
   -  For orders with a known token ID, verifies that they match.
   -  For orders with an unknown token ID, checks that all property
      validators succeed for the token.
   -  Reverts if ``erc721TokenId`` does not satisfy the buy order.

-  **``getERC721OrderStatus(ERC721Order order) returns (OrderStatus status)``**

   -  Get the status of an ERC721 order. ``status`` will be one of:
      ``INVALID (0)``, ``FILLABLE (1)``, ``UNFILLABLE (2)``, or
      ``EXPIRED (3)``.

-  **getERC721OrderStatusBitVector(address maker, uint248 nonceRange)
   returns (uint256 bitVector)**

   -  Retrieve the fillable status word given a maker and a storage
      bucket defined in an order nonce. This will be a bit vector of
      filled/cancelled states for all orders by ``maker`` with a nonce
      whose upper 248 bits equal ``nonceRange``. See
      `#smart-nonces <erc721orders.md#smart-nonces>`__ for more details.

Maker Functions
~~~~~~~~~~~~~~~

-  **``preSignERC721Order(ERC721Order order)``**

   -  If called by ``order.maker``, marks the order as presigned, which
      means takers can simply pass in an empty signature with
      ``signatureType = PRESIGNED``.
   -  Must be called by the ``order.maker``.
   -  This can also be used to publish/broadcast orders on-chain, as it
      will emit an ``ERC721OrderPreSigned`` event.

-  **``cancelERC721Order(uint256 orderNonce)``**

   -  Cancels any order with ``nonce == orderNonce`` and where the
      ``maker`` is the caller.

-  **``batchCancelERC721Orders(uint256[] orderNonces)``**

   -  Batch version of ``cancelERC721Order()``.

Taker/Fill Functions
~~~~~~~~~~~~~~~~~~~~

-  **``sellERC721(ERC721Order buyOrder, Signature signature, uint256 erc721TokenId, bool unwrapNativeToken, bytes callbackData)``**

   -  Sell an ERC721 token ``erc721TokenId`` to a ``buyOrder``.
   -  The ``signature`` must be a valid signature for ``buyOrder``
      generated by ``buyOrder.maker``.
   -  If ``unwrapNativeToken`` is ``true`` and the ``erc20Token`` of the
      order is a wrapped version of the native token (e.g., WETH), this
      will also unwrap and transfer the native token to the taker.
   -  If ``callbackData`` is non-empty, the taker (``msg.sender``) will
      be called using this ``callbackData`` as call data. This happens
      after ``erc20Token`` is transferred to the taker, but before
      ``erc721TokenId`` is transferred to the maker.

-  **``buyERC721(ERC721Order sellOrder, Signature signature, bytes callbackData) payable``**

   -  Buy an ERC721 token being sold by ``sellOrder``.
   -  The ``signature`` must be a valid signature for ``sellOrder``
      generated by ``sellOrder.maker``.
   -  If the order’s ``erc20Token`` is the the native token
      (``0xeee...``), the native token (ETH on Ethereum) must be
      attached to the function call. 
   -  If ``callbackData`` is non-empty, the taker (``msg.sender``) will
      be called using this ``callbackData`` as call data. This happens
      after the ERC721 token is transferred to the taker, but before
      ``erc20Token`` is transferred to the maker.

-  **``batchBuyERC721s(ERC721Order[] sellOrders, Signature[] signatures, bytes[] callbackData, bool revertIfIncomplete) payable returns (bool[] successes)``**

   -  Batch version of ``buyERC721()``.
   -  If ``revertIfIncomplete`` is true, reverts if any of the
      individual buys fail.
   -  If ``revertIfIncomplete`` is ``false``, returns an array of which
      respective fill succeeded.

-  **``matchERC721Orders(ERC721Order sellOrder, ERC721Order buyOrder, Signature sellOrderSignature, Signature buyOrderSignature) returns (uint256 profit)``**

   -  Matches two complementary ERC721 buy and sell orders.
   -  The ``sellOrder`` must be willing to receive at least the
      ``erc20Token`` amount ``buyOrder`` is offering.
   -  The NFT being sold by ``sellOrder`` must be compatible with the
      requirements of ``buyOrder``.
   -  Returns the spread between the two orders (less fees), which will
      go to the caller of this function.
   -  If any fees are involved in either order, they will be taken from
      ``profit``.

-  **``batchMatchERC721Orders(ERC721Order[] sellOrders, ERC721Order[] buyOrders, Signature[] sellOrderSignatures, Signature[] buyOrderSignatures ) returns (uint256[] profits, bool[] successes)``**

   -  Batch version of ``matchERC721Orders()``.
   -  Returns the spread of each respective match operation (less fees).
   -  If ``revertIfIncomplete`` is ``true``, reverts if any of the
      individual match operations fail.
   -  If ``revertIfIncomplete`` is ``false``, returns an array of which
      respective operation succeeded.

Events
~~~~~~

.. code:: solidity

   /// @dev Emitted whenever an `ERC721Order` is filled.
   /// @param direction Whether the order is selling or
   ///        buying the ERC721 token.
   /// @param maker The maker of the order.
   /// @param taker The taker of the order.
   /// @param nonce The unique maker nonce in the order.
   /// @param erc20Token The address of the ERC20 token.
   /// @param erc20TokenAmount The amount of ERC20 token
   ///        to sell or buy.
   /// @param erc721Token The address of the ERC721 token.
   /// @param erc721TokenId The ID of the ERC721 asset.
   /// @param matcher If this order was matched with another using `matchERC721Orders()`,
   ///                this will be the address of the caller. If not, this will be `address(0)`.
   event ERC721OrderFilled(
       LibNFTOrder.TradeDirection direction,
       address maker,
       address taker,
       uint256 nonce,
       IERC20TokenV06 erc20Token,
       uint256 erc20TokenAmount,
       IERC721Token erc721Token,
       uint256 erc721TokenId,
       address matcher
   );

   /// @dev Emitted whenever an `ERC721Order` is cancelled.
   /// @param maker The maker of the order.
   /// @param nonce The nonce of the order that was cancelled.
   event ERC721OrderCancelled(
       address maker,
       uint256 nonce
   );

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



ERC1155Orders
=============

| This feature implements the ERC1155<->ERC20/ETH limit order type. The
  source code for
  `ERC1155OrdersFeature.sol <https://github.com/0xProject/protocol/blob/c1177416f50c2465ee030dacc14ff996eebd4e74/contracts/zero-ex/contracts/src/features/nft_orders/ERC1155OrdersFeature.sol>`__
  can be found
  `here <https://github.com/0xProject/protocol/blob/c1177416f50c2465ee030dacc14ff996eebd4e74/contracts/zero-ex/contracts/src/features/nft_orders/ERC1155OrdersFeature.sol>`__.
| Here are some highlights:

-  Limit orders in the 0x protocol are off-chain messages that define a
   fixed-rate trade signed by a “maker” and filled on-chain by a
   “taker.”
-  The protocol is non-custodial in that neither party needs to deposit
   assets into the protocol in advance. Instead, *both parties must
   first grant the protocol an ERC20/ERC115 allowance for the assets they intend to sell*, and the
   protocol will spend this allowance during settlement.
-  Due to the non-custodial nature of the protocol, the raw native asset
   (e.g., ETH) is only supported as a taker or fee token. Makers must
   use a wrapped variant (e.g., WETH) if trying to sell the network’s
   native asset.
-  Unlike ERC721 limit orders, ERC1155 limit orders have a quantity of
   the ERC1155 token being traded. These orders can be fully filled once
   or partially filled repeatedly until all quantities in the order have
   been exhausted.
-  Once a limit order is signed, anyone with the order and signature
   details can fill the order (unless the order restricts the ``taker``
   address). There is no way to un-sign an order so cancellations must
   be performed on-chain before a taker attempts to fill it.
-  An NFT order can be made for a ERC1155 token with an unknown ID.

The ERC1155 Limit Order Struct
------------------------------

.. code:: solidity

   struct ERC1155Order {
       TradeDirection direction;
       address maker;
       address taker;
       uint256 expiry;
       uint256 nonce;
       address erc20Token;
       uint256 erc20TokenAmount;
       Fee[] fees;
       address erc1155Token;
       uint256 erc1155TokenId;
       Property[] erc1155TokenProperties;
       uint128 erc1155TokenAmount;
   }

-  ``direction``: Whether this order is selling an NFT or buying an NFT.
-  ``maker``: The maker/signer of this limit order.
-  ``taker``: Who can fill this order. May be NULL (``0x000...``) to
   allow anyone.
-  ``expiry``: The block timestamp at which this trade is no longer
   valid.
-  ``nonce``: Usually a random nonce the maker sets to ensure the hash
   of this order is unique and to identify it during fills and
   cancellations. Carefully choosing this value can be used to reduce
   gas usage during cancellations.
-  ``erc20Token``: The ERC20 token (or native asset, if allowed) to
   exchange for the NFT. For eligible trades, the native asset may be
   specified as ``0xeee...``.
-  ``erc20TokenAmount``: The amount of ``erc20Token`` to exchange for
   the NFT.
-  ``fees``: Optional fees, denominated in ``erc20Token``, that are paid
   out to designated recipients when the order is filled. Fees are
   collected *in addition* to the ``erc20TokenAmount``.
-  ``erc1155Token``: The NFT’s ERC1155 token contract address being
   exchanged.
-  ``erc1155TokenId``: The ID of the ERC1155 token inside
   ``erc1155Token`` being exchanged. This will be ignored for buy
   orders with valid
   ``erc1155TokenProperties``.
-  ``erc1155TokenProperties``: A series of contracts that will be called
   to validate an unknown NFT token ID being bought at settlement.
-  ``erc1155TokenAmount``: The maximum total quantity of
   ``erc1155TokenId`` being traded. 

Where ``TradeDirection`` is:

.. code:: solidity

   enum TradeDirection {
       SELL_NFT,
       BUY_NFT
   }

``Fee`` is:

.. code:: solidity

   struct Fee {
       address recipient;
       uint256 amount;
       bytes feeData;
   }

``Property`` is:

.. code:: solidity

   struct Property {
       address propertyValidator;
       bytes propertyData;
   }

Order Hashes
------------

The protocol utilizes a canonical,
`EIP712 <https://eips.ethereum.org/EIPS/eip-712>`__ hash of the limit
order struct to verify the authenticity of the order. In typical usage,
this is the hash that the maker signs to make the order valid and
fillable.

Computing the hash of a limit order in solidity is given by:

.. code:: solidity

   bytes32[] memory feesStructHashArray = new bytes32[](order.fees.length);
   for (uint256 i = 0; i < order.fees.length; ++i) {
       feesStructHashArray[i] = keccak256(abi.encode(
           bytes32(0xe68c29f1b4e8cce0bbcac76eb1334bdc1dc1f293a517c90e9e532340e1e94115),
           order.fees[i].recipient,
           order.fees[i].amount,
           keccak256(order.fees[i].feeData)
       ));
   }
   bytes32 memory feesHash = keccak256(abi.encodePacked(
       feesStructHashArray
   ));
   bytes32[] memory propertiesStructHashArray = new bytes32[](order.erc11155TokenProperties.length);
   for (uint256 i = 0; i < order.erc1155TokenProperties.length; ++i) {
       propertiesStructHashArray[i] = keccak256(abi.encode(
           bytes32(0x6292cf854241cb36887e639065eca63b3af9f7f70270cebeda4c29b6d3bc65e8),
           order.erc1155TokenProperties[i].propertyValidator,
           keccak256(order.erc1155TokenProperties[i].propertyData)
       ));
   }
   bytes32 memory propertiesHash = keccak256(abi.encodePacked(
       propertiesStructHashArray
   ));
   keccak256(abi.encode(
       bytes32(0x930490b1bcedd2e5139e22c761fafd52e533960197c2283f3922c7fd8c880be9),
       order.direction,
       order.maker,
       order.taker,
       order.expiry,
       order.nonce,
       order.erc20Token,
       order.erc20TokenAmount,
       kecca256(abi,
       order.erc1155Token,
       order.erc1155TokenId,
       propertiesHash,
       order.erc1155TokenAmount
   ));

Another way to get the hash of an order is to simply call
``getERC1155OrderHash()`` on the Exchange Proxy.

Signatures
----------

To fill an order, the taker must (usually, see below) also submit an
ECDSA signature generated for that order, typically signed by the maker.
For information on the format an how to generate these signatures.

Smart Contract Makers
---------------------

Smart contracts do not have a private key associated with them so they
cannot generate a valid ECDSA signature. Yet they still can operate as
the ``maker`` of an order. To do this, they must call
``preSignERC1155Order()``, which will allow the order to be filled using
the ``PRESIGNED`` ``signatureType``.

Network Discoverable Orders
---------------------------

Another feature of the ``preSignERC1155Order()`` function is that it
will emit an event ``ERC1155OrderPreSigned`` (see
`#events <erc1155orders.md#events>`__) listing all the details of the
order. Anyone can listen for these events and potentially fill the order
without relying on off-chain sharing mechanisms.

Smart Nonces
------------

The ``nonce`` field in the order is a number the maker chooses to ensure
uniqueness of the order, but it also one other function:

-  To identify the order (in addition to the caller/maker) in
   cancellation functions (see
   `#maker-functions <erc1155orders.md#maker-functions>`__). This can
   make cancellations more efficient.

Gas Optimized Nonces
~~~~~~~~~~~~~~~~~~~~

The protocol marks ERC1155 orders as cancelled by setting a bit in a
256-bit word (cancellation bit vector) indexed by the order maker and
upper 248 bits of the order’s nonce. The lower 8 bits of the nonce
determine which bit in the cancellation bit vector corresponds to that
order. 

This allows for much cheaper cancellation for up to 256 simultaneous
orders. To take advantage of this gas optimization, makers should reuse
the upper 248 bits of their nonce across up to 256 different orders,
varying the value of the lower 8 bits between them.

.. image:: docs/_static/img/gas_optimized_nonces.png
  :width: 400

ERC1155 Sell Orders
-------------------

Sell orders are orders where ``direction`` is set to
``TradeDirection.SELL_NFT``, which indicates that a *maker wishes to*
**sell** *an ERC1155 token that they possess*.

For these orders, the maker must set the ``erc1155Token`` and
``erc1155TokenId`` fields to the ERC1155 token contract address and the
ID of the ERC1155 token they’re trying to sell, respectively. The
``erc20Token`` and ``erc20TokenAmount`` fields will be set to the ERC20
token and the ERC20 amount they wish to receive for their NFT.

ERC1155 Buy Orders
------------------

Buy orders are where ``direction`` is set to ``TradeDirection.BUY_NFT``,
which indicates that a *maker wishes to* **buy** *an ERC1155 token that
they do not possess*.

A buy order can be created for a known token ID or an unknown token ID.

Buying a Known NFT Token ID
~~~~~~~~~~~~~~~~~~~~~~~~~~~

This is when the maker knows exactly which NFT they want, down to the
token ID. These are fairly straight-forward and just require the maker
setting the ``erc1155Token`` and ``erc1155TokenId`` fields to the
ERC1155 token contract address and the ID of the token they want to buy,
respectively. The The ``erc20Token`` and ``erc20TokenAmount`` fields
will be set to the ERC20 token and the ERC20 amount they are willing to
pay for that particular NFT. The ``erc1155TokenProperties`` field should
be set to the empty array.

Buying an Unknown NFT Token ID
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

This is when the maker will accept any token ID from an ERC1155
contract. In this scenario, the ``erc1155TokenProperties`` order field
is used to signal and validate terms of this kind of order.

If a maker wishes to accept any token ID, regardless of any other
properties of that NFT, they should set the ``erc1155TokenProperties``
field to an array with exactly one item in it:

.. code:: solidity

   [
       Property({
           propertyValidator: address(0),
           propertyData: ""
       })
   ]

If a maker wishes to accept any token ID, but only if that token also
satisfies some other properties (e.g., cryptokitty with green eyes),
they should set ``erc1155TokenProperties`` to an array of callable
property validator contracts. Each ``propertyValidator`` contract must
implement the ``IPropertyValidator`` interface, which is defined as:

.. code:: solidity

   interface IPropertyValidator {
       function validateProperty(
           address tokenAddress,
           uint256 tokenId,
           bytes calldata propertyData
       )
           external
           view;
   }

Each entry in ``erc1155TokenProperties`` with a non-null
``propertyValidator`` address will be called using this interface,
passing in the ``tokenAddress`` and ``tokenId`` of the ERC1155 the taker
is trying to fill the order with. If the validator fails to validate the
requested properties of the NFT, it should revert.

The ``propertyData`` field of each property entry is supplied by the
maker and is also passed in. For example, if a property validator
contract was designed to check that a cryptokitty had a specific eye
color, the ``propertyData`` could simply be some encoding of
``"green"``, and the validator contract would parse this data and
perform the necessary checks on the token to ensure it has green eyes.

Taker Callbacks
---------------

Some fill functions accept a ``callbackData`` ``bytes`` parameter. If
this parameter is non-empty (``length > 0``), a call will be issued
against the caller using ``callbackData`` as the full call data. This
call happens after the transfer of the maker asset and before the
transfer of the taker asset. This allows a smart contract taker to
leverage the maker’s asset to fulfill their end of the trade. For
example, if a taker finds a compatible, complementary order on another
protocol they could fulfill that order with the maker’s asset, supply
the Exchange Proxy with the necessary opposing asset with the proceeds,
and pocket the difference.

Information Functions (read-only)
---------------------------------

-  **``validateERC1155OrderSignature(ERC1155Order order, Signature signature)``**

   -  Check if ``signature`` is valid for ``order``. Reverts if not.
      \`` 

-  **``validateERC1155OrderProperties(ERC1155Order order, uint256 erc1155TokenId)``**

   -  Validates that a given ``erc1155TokenId`` satisfies a *buy* order.
   -  For orders with a known token ID, verifies that they match.
   -  For orders with an unknown token ID, checks that all property
      validators succeed for the token.
   -  Reverts if ``erc1155TokenId`` does not satisfy the buy order.

-  **``getERC1155OrderInfo(ERC1155Order order) returns (OrderInfo orderInfo)``**

   -  Retrieve information on an ERC1155 order. See
      `#orderinfo <erc1155orders.md#orderinfo>`__ for more details.

-  **``getERC1155OrderHash``\ (``ERC1155Order orde``) returns (bytes32
   orderHash)**

   -  Compute the canonical hash of an ``ERC1155`` order. See
      `#order-hashes <erc1155orders.md#order-hashes>`__.

Maker Functions
---------------

-  **``preSignERC1155Order(ERC1155Order order)``**

   -  If called by ``order.maker``, marks the order as presigned, which
      means takers can simply pass in an empty signature with
      ``signatureType = PRESIGNED``.
   -  Must be called by the ``order.maker``.
   -  This can also be used to publish/broadcast orders on-chain, as it
      will emit an ``ERC1155OrderPreSigned`` event.

-  **``cancelERC1155Order(uint256 orderNonce)``**

   -  Cancels any order with ``nonce == orderNonce`` and where the
      ``maker`` is the caller.

-  **``batchCancelERC1155Orders(uint256[] orderNonces)``**

   -  Batch version of ``cancelERC1155Order()``.

Taker/Fill Functions
--------------------

-  **``sellERC1155(ERC1155Order buyOrder, Signature signature, uint256 erc1155TokenId, uint256 erc1155SellAmount,bool unwrapNativeToken, bytes callbackData)``**

   -  Sell ``erc1155SellAmount`` amount of ERC1155 token
      ``erc1155TokenId`` to a ``buyOrder``.
   -  The ``signature`` must be a valid signature for ``buyOrder``
      generated by ``buyOrder.maker``.
   -  If ``unwrapNativeToken`` is ``true`` and the ``erc20Token`` of the
      order is a wrapped version of the native token (e.g., WETH), this
      will also unwrap and transfer the native token to the taker.
   -  If ``callbackData`` is non-empty, the taker (``msg.sender``) will
      be called using this ``callbackData`` as call data. This happens
      after ``erc20Token`` is transferred to the taker, but before
      ``erc1155SellAmount`` of ``erc1155TokenId`` is transferred to the
      maker.

-  **``buyERC1155(ERC1155Order sellOrder, uint128 erc1155BuyAmount, Signature signature, bytes callbackData) payable``**

   -  Buy ``erc1155BuyAmount`` quantity of an ERC1155 token being sold
      by ``sellOrder``.
   -  The ``signature`` must be a valid signature for ``sellOrder``
      generated by ``sellOrder.maker``.
   -  If the order’s ``erc20Token`` is the the native token
      (``0xeee...``), the native token (ETH on Ethereum) must be
      attached to the function call. 
   -  If ``callbackData`` is non-empty, the taker (``msg.sender``) will
      be called using this ``callbackData`` as call data. This happens
      after ``erc1155BuyAmount`` of ERC1155 token is transferred to the
      taker, but before ``erc20Token`` is transferred to the maker.

-  **``batchBuyERC1155s(ERC1155Order[] sellOrders, uint128[] ercc1155BuyAmounts, Signature[] signatures, bytes[] callbackData, bool revertIfIncomplete) payable returns (bool[] successes)``**

   -  Batch version of ``buyERC1155()``.
   -  If ``revertIfIncomplete`` is true, reverts if any of the
      individual buys fail.
   -  If ``revertIfIncomplete`` is ``false``, returns an array of which
      respective fill succeeded.

OrderInfo
---------

``getERC1155OrderInfo()`` returns a structure defined as:

.. code:: solidity

   struct OrderInfo {
     bytes32 orderHash;
     OrderStatus status;
     uint128 orderAmount;
     uint128 remainingAmount;
   }

Each field

-  ``orderHash`` - The canonical hash of the order (see
   `#order-hashes <erc1155orders.md#order-hashes>`__).
-  ``status``: One of ``INVALID: 0``, ``FILLABLE: 1``,
   ``UNFILLABLE: 2``, ``EXPIRED: 3``.
-  ``orderAmount``: Equal to ``order.erc1155TokenAmount``.
-  ``remainingAmount``: The portion of ``orderAmount`` that has yet to
   be filled.

Events
------

.. code:: solidity

   /// @dev Emitted whenever an `ERC1155Order` is filled.
   /// @param direction Whether the order is selling or
   ///        buying the ERC1155 token.
   /// @param maker The maker of the order.
   /// @param taker The taker of the order.
   /// @param nonce The unique maker nonce in the order.
   /// @param erc20Token The address of the ERC20 token.
   /// @param erc20FillAmount The amount of ERC20 token filled.
   /// @param erc1155Token The address of the ERC1155 token.
   /// @param erc1155TokenId The ID of the ERC1155 asset.
   /// @param erc1155FillAmount The amount of ERC1155 asset filled.
   /// @param matcher Currently unused.
   event ERC1155OrderFilled(
       LibNFTOrder.TradeDirection direction,
       address maker,
       address taker,
       uint256 nonce,
       IERC20TokenV06 erc20Token,
       uint256 erc20FillAmount,
       IERC1155Token erc1155Token,
       uint256 erc1155TokenId,
       uint128 erc1155FillAmount,
       address matcher
   );

   /// @dev Emitted whenever an `ERC1155Order` is cancelled.
   /// @param maker The maker of the order.
   /// @param nonce The nonce of the order that was cancelled.
   event ERC1155OrderCancelled(
       address maker,
       uint256 nonce
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

