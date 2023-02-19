###############################
Events
###############################

This is a complete catalogue of 0x events emitted when interacting with the Exchange Proxy system of contracts. The diagram below
illustrates how events are emitted when trading through the Exchange Proxy.

.. warning::
    There are pending upgrades that impact these events. Please see the `Releases <../additional/releases.html>`_ page for more details.


.. image:: ../_static/img/events.png
    :scale: 42%


.. note::
    This catalogue does not include events emitted by tokens or other exchanges, like Uniswap. It also only lists 0x V3 events
    that are emitted during a Fill; for an extensive list of V3 events, see the `V3 Spec <https://github.com/0xProject/0x-protocol-specification/blob/master/v3/v3-specification.md#events>`_.

+-------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------+---------------------+
| **Event**                     | **Description**                                                                                                                                           | **Emitted By**      |
+-------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------+---------------------+
| `Deployed`_                   | Emitted by the `Transformer Deployer <../architecture/transformer_deployer.html>`_ when a `Transformer <../architecture/transformers.html>`_ is deployed. | TransformerDeployer |
+-------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------+---------------------+
| `ERC20BridgeTransfer`_        | Emitted when a trade occurs.                                                                                                                              | FlashWallet         |
+-------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------+---------------------+
| `Fill`_                       | Emitted by Exchange V3 when an order is filled.                                                                                                           | Exchange V3         |
+-------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------+---------------------+
| `Killed`_                     | Emitted by the `Transformer Deployer <../architecture/transformer_deployer.html>`_ when a `Transformer <../architecture/transformers.html>`_ is killed.   | TransformerDeployer |
+-------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------+---------------------+
| `LimitOrderFilled`_           | Emitted when a `V4 Limit Order <./orders.html#limit-orders>`_ is filled.                                                                                  | ExchangeProxy       |
+-------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------+---------------------+
| `LiquidityProviderSwap`_      | Emitted when a `PLP <../advanced/plp.html>`_ executes a swap.                                                                                             | ExchangeProxy       |
+-------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------+---------------------+
| `OrderCancelled`_             | Emitted when a V4 Limit or RFQ Order is cancelled.                                                                                                        | ExchangeProxy       |
+-------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------+---------------------+
| `MetaTransactionExecuted`_    | Emitted when a meta-transaction is executed on the Exchange Proxy.                                                                                        | ExchangeProxy       |
|                               | Note that this differs from meta-transactions that are executed on Exchange V3.                                                                           |                     |
+-------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------+---------------------+
| `Migrated`_                   | Emitted when `ExchangeProxy.migrate()` is called.                                                                                                         | ExchangeProxy       |
+-------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------+---------------------+
| `PairCancelledLimitOrders`_   | Emitted when a Market Pair is cancelled for Limit Orders (see `cancelPairLimitOrders <./functions.html#cancelpairlimitorders>`_).                         | ExchangeProxy       |
+-------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------+---------------------+
| `PairCancelledRfqOrders`_     | Emitted when a Market Pair is cancelled for RFQ Orders (see `cancelPairRfqOrders <./functions.html#cancelpairrfqorders>`_).                               | ExchangeProxy       |
+-------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------+---------------------+
| `ProtocolFeeUnfunded`_        | Emitted when an order is skipped due to a lack of funds to pay the 0x Protocol fee.                                                                       | FlashWallet         |
+-------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------+---------------------+
| `ProxyFunctionUpdated`_       | Emitted when a function is upgraded via `extend()` or `rollback()`                                                                                        | ExchangeProxy       |
+-------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------+---------------------+
| `QuoteSignerUpdated`_         | Emitted when `ExchangeProxy.setQuoteSigner()` is called.                                                                                                  | ExchangeProxy       |
+-------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------+---------------------+
| `RfqOrderFilled`_             | Emitted when a `V4 RFQ Order <./orders.html#rfq-orders>`_ is filled.                                                                                      | ExchangeProxy       |
+-------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------+---------------------+
| `RfqOrderOriginsAllowed`_     | Emitted when a tx.origin is added/removed for RFQ, via `registerAllowedRfqOrigins <./functions.html#registerallowedrfqorigins>`_                          | ExchangeProxy       |
+-------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------+---------------------+
| `OrderSignerRegistered`_      | Emitted when an order signer is added/removed for a maker, via `registerAllowedOrderSigner <./functions.html#registerallowedordersigner>`_                | ExchangeProxy       |
+-------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------+---------------------+
| `TransformedERC20`_           | Emitted when an `ERC20 Transformation <../advanced/erc20_transformations.html>`_ completes.                                                               | ExchangeProxy       |
+-------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------+---------------------+
| `TransformerDeployerUpdated`_ | Emitted when the Transformer Deployer is upgraded.                                                                                                        | ExchangeProxy       |
+-------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------+---------------------+
| `TransformerMetadata`_        | A general, customizable event emitted that can be emitted by transformers as-needed.                                                                      | FlashWallet         |
+-------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------+---------------------+
| `ERC1155OrderFilled`_         | Emitted when a `V4 ERC1155 Order <./orders.html#erc1155-orders>`_ is filled.                                                                              | ExchangeProxy       |
+-------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------+---------------------+
| `ERC721OrderFilled`_          | Emitted when a `V4 ERC721 Order <./orders.html#erc721-orders>`_ is filled.                                                                                | ExchangeProxy       |
+-------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------+---------------------+
| `ERC1155OrderCancelled`_      | Emitted when a `V4 ERC1155 Order <./orders.html#erc1155-orders>`_ is cancelled.                                                                           | ExchangeProxy       |
+-------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------+---------------------+
| `ERC721OrderCancelled`_       | Emitted when a `V4 ERC721 Order <./orders.html#erc721-orders>`_ is cancelled.                                                                             | ExchangeProxy       |
+-------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------+---------------------+
| `ERC1155OrderPreSigned`_      | Emitted when a `V4 ERC1155 Order <./orders.html#erc1155-orders>`_ is signed on-chain.                                                                     | ExchangeProxy       |
+-------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------+---------------------+
| `ERC721OrderPreSigned`_       | Emitted when a `V4 ERC721 Order <./orders.html#erc721-orders>`_ is signed on-chain.                                                                       | ExchangeProxy       |
+-------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------+---------------------+


Deployed
--------

.. code-block:: solidity

    /// @dev Emitted when a contract is deployed via `deploy()`.
    /// @param deployedAddress The address of the deployed contract.
    /// @param nonce The deployment nonce.
    /// @param sender The caller of `deploy()`.
    event Deployed(address deployedAddress, uint256 nonce, address sender);

ERC20BridgeTransfer
-------------------
.. code-block:: solidity

    /// @dev Emitted when a trade occurs.
    /// @param inputToken The token the bridge is converting from.
    /// @param outputToken The token the bridge is converting to.
    /// @param inputTokenAmount Amount of input token.
    /// @param outputTokenAmount Amount of output token.
    /// @param from The bridge address, indicating the underlying source of the fill.
    /// @param to The `to` address, currrently `address(this)`
    event ERC20BridgeTransfer(
        IERC20Token inputToken,
        IERC20Token outputToken,
        uint256 inputTokenAmount,
        uint256 outputTokenAmount,
        address from,
        address to
    );

Fill
----
.. code-block:: solidity

    event Fill(
        address indexed makerAddress,         // Address that created the order.
        address indexed feeRecipientAddress,  // Address that received fees.
        bytes makerAssetData,                 // Encoded data specific to makerAsset.
        bytes takerAssetData,                 // Encoded data specific to takerAsset.
        bytes makerFeeAssetData,              // Encoded data specific to makerFeeAsset.
        bytes takerFeeAssetData,              // Encoded data specific to takerFeeAsset.
        bytes32 indexed orderHash,            // EIP712 hash of order (see LibOrder.getTypedDataHash).
        address takerAddress,                 // Address that filled the order.
        address senderAddress,                // Address that called the Exchange contract (msg.sender).
        uint256 makerAssetFilledAmount,       // Amount of makerAsset sold by maker and bought by taker.
        uint256 takerAssetFilledAmount,       // Amount of takerAsset sold by taker and bought by maker.
        uint256 makerFeePaid,                 // Amount of makerFeeAssetData paid to feeRecipient by maker.
        uint256 takerFeePaid,                 // Amount of takerFeeAssetData paid to feeRecipient by taker.
        uint256 protocolFeePaid               // Amount of eth or weth paid to the staking contract.
    );


Killed
------

.. code-block:: solidity

    /// @dev Emitted when a contract is killed via `kill()`.
    /// @param target The address of the contract being killed..
    /// @param sender The caller of `kill()`.
    event Killed(address target, address sender);

LimitOrderFilled
----------------
.. code-block:: solidity

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


MetaTransactionExecuted
-----------------------

.. code-block:: solidity

    /// @dev Emitted whenever a meta-transaction is executed via
    ///      `executeMetaTransaction()` or `executeMetaTransactions()`.
    /// @param hash The meta-transaction hash.
    /// @param selector The selector of the function being executed.
    /// @param signer Who to execute the meta-transaction on behalf of.
    /// @param sender Who executed the meta-transaction.
    event MetaTransactionExecuted(
        bytes32 hash,
        bytes4 indexed selector,
        address signer,
        address sender
    );

LiquidityProviderSwap
---------------------

.. code-block:: solidity

    event LiquidityProviderSwap(
        address inputToken,
        address outputToken,
        uint256 inputTokenAmount,
        uint256 outputTokenAmount,
        address provider,
        address recipient
    );

Migrated
--------

.. code-block:: solidity

    /// @dev Emitted when `migrate()` is called.
    /// @param caller The caller of `migrate()`.
    /// @param migrator The migration contract.
    /// @param newOwner The address of the new owner.
    event Migrated(address caller, address migrator, address newOwner);

OrderCancelled
--------------

.. code-block:: solidity

    /// @dev Emitted whenever a limit or RFQ order is cancelled.
    /// @param orderHash The canonical hash of the order.
    /// @param maker The order maker.
    event OrderCancelled(
        bytes32 orderHash,
        address maker
    );

PairCancelledLimitOrders
------------------------

.. code-block:: solidity

    /// @dev Emitted whenever limit or RFQ orders are cancelled by pair by a maker.
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

PairCancelledRfqOrders
----------------------

.. code-block:: solidity

    /// @dev Emitted whenever limit or RFQ orders are cancelled by pair by a maker.
    /// @param maker The maker of the order.
    /// @param makerToken The maker token in a pair for the orders cancelled.
    /// @param takerToken The taker token in a pair for the orders cancelled.
    /// @param minValidSalt The new minimum valid salt an order with this pair must
    ///        have.
    event PairCancelledRfqOrders(
        address maker,
        address makerToken,
        address takerToken,
        uint256 minValidSalt
    );

ProtocolFeeUnfunded
-------------------

.. code-block:: solidity

    /// @dev Emitted when a trade is skipped due to a lack of funds
    ///      to pay the 0x Protocol fee.
    /// @param orderHash The hash of the order that was skipped.
    event ProtocolFeeUnfunded(bytes32 orderHash);

ProxyFunctionUpdated
--------------------

.. code-block:: solidity

    /// @dev A function implementation was updated via `extend()` or `rollback()`.
    /// @param selector The function selector.
    /// @param oldImpl The implementation contract address being replaced.
    /// @param newImpl The replacement implementation contract address.
    event ProxyFunctionUpdated(bytes4 indexed selector, address oldImpl, address newImpl);

QuoteSignerUpdated
------------------
.. code-block:: solidity

    /// @dev Raised when `setQuoteSigner()` is called.
    /// @param quoteSigner The new quote signer.
    event QuoteSignerUpdated(address quoteSigner);

RfqOrderFilled
--------------
.. code-block:: solidity

    /// @dev Emitted whenever an `RfqOrder` is filled.
    /// @param orderHash The canonical hash of the order.
    /// @param maker The maker of the order.
    /// @param taker The taker of the order.
    /// @param takerTokenFilledAmount How much taker token was filled.
    /// @param makerTokenFilledAmount How much maker token was filled.
    /// @param pool The fee pool associated with this order.
    event RfqOrderFilled(
        bytes32 orderHash,
        address maker,
        address taker,
        address makerToken,
        address takerToken,
        uint128 takerTokenFilledAmount,
        uint128 makerTokenFilledAmount,
        bytes32 pool
    );

RfqOrderOriginsAllowed
-------------------------

.. code-block:: solidity

    /// @dev Emitted when new addresses are allowed or disallowed to fill
    ///      orders with a given txOrigin.
    /// @param origin The address doing the allowing.
    /// @param addrs The address being allowed/disallowed.
    /// @param allowed Indicates whether the address should be allowed.
    event RfqOrderOriginsAllowed(
        address origin,
        address[] addrs,
        bool allowed
    );

OrderSignerRegistered
-------------------------

.. code-block:: solidity

    /// @dev Emitted when new order signers are registered
    /// @param maker The maker address that is registering a designated signer.
    /// @param signer The address that will sign on behalf of maker.
    /// @param allowed Indicates whether the address should be allowed.
    event OrderSignerRegistered(
        address maker,
        address signer,
        bool allowed
    );


TransformedERC20
----------------

.. code-block:: solidity

    /// @dev Raised upon a successful `transformERC20`.
    /// @param taker The taker (caller) address.
    /// @param inputToken The token being provided by the taker.
    ///        If `0xeee...`, ETH is implied and should be provided with the call.`
    /// @param outputToken The token to be acquired by the taker.
    ///        `0xeee...` implies ETH.
    /// @param inputTokenAmount The amount of `inputToken` to take from the taker.
    /// @param outputTokenAmount The amount of `outputToken` received by the taker.
    event TransformedERC20(
        address indexed taker,
        address inputToken,
        address outputToken,
        uint256 inputTokenAmount,
        uint256 outputTokenAmount
    );

TransformerDeployerUpdated
--------------------------

.. code-block:: solidity

    /// @dev Raised when `setTransformerDeployer()` is called.
    /// @param transformerDeployer The new deployer address.
    event TransformerDeployerUpdated(address transformerDeployer);


TransformerMetadata
-------------------

.. code-block:: solidity

    /// @dev A transformer that just emits an event with an arbitrary byte payload.
    event TransformerMetadata(
        bytes32 callDataHash,
        address sender,
        address taker,
        bytes data
    );


ERC721OrderFilled
-------------------

.. code-block:: solidity

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
        IERC20Token erc20Token,
        uint256 erc20TokenAmount,
        IERC721Token erc721Token,
        uint256 erc721TokenId,
        address matcher
    );

ERC721OrderCancelled
---------------------

.. code-block:: solidity

    /// @dev Emitted whenever an `ERC721Order` is cancelled.
    /// @param maker The maker of the order.
    /// @param nonce The nonce of the order that was cancelled.
    event ERC721OrderCancelled(
        address maker,
        uint256 nonce
    );

ERC721OrderPreSigned
---------------------

.. code-block:: solidity


    /// @dev Emitted when an `ERC721Order` is pre-signed.
    ///      Contains all the fields of the order.
    event ERC721OrderPreSigned(
        LibNFTOrder.TradeDirection direction,
        address maker,
        address taker,
        uint256 expiry,
        uint256 nonce,
        IERC20Token erc20Token,
        uint256 erc20TokenAmount,
        LibNFTOrder.Fee[] fees,
        IERC721Token erc721Token,
        uint256 erc721TokenId,
        LibNFTOrder.Property[] erc721TokenProperties
    );

ERC1155OrderFilled
-------------------

.. code-block:: solidity

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
        IERC20Token erc20Token,
        uint256 erc20FillAmount,
        IERC1155Token erc1155Token,
        uint256 erc1155TokenId,
        uint128 erc1155FillAmount,
        address matcher
    );

ERC1155OrderCancelled
---------------------

.. code-block:: solidity

    /// @dev Emitted whenever an `ERC1155Order` is cancelled.
    /// @param orderHash The hash the order.
    /// @param maker The maker of the order.
    event ERC1155OrderCancelled(
        bytes32 orderHash,
        address maker
    );

ERC1155OrderPreSigned
---------------------

.. code-block:: solidity

    /// @dev Emitted when an `ERC1155Order` is pre-signed.
    ///      Contains all the fields of the order.
    event ERC1155OrderPreSigned(
        LibNFTOrder.TradeDirection direction,
        address maker,
        address taker,
        uint256 expiry,
        uint256 nonce,
        IERC20Token erc20Token,
        uint256 erc20TokenAmount,
        LibNFTOrder.Fee[] fees,
        IERC1155Token erc1155Token,
        uint256 erc1155TokenId,
        LibNFTOrder.Property[] erc1155TokenProperties,
        uint128 erc1155TokenAmount
    );
















