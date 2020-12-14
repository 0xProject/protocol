###############################
Transformers
###############################

Transformers extend the core protocol. They are trustless and permissioned by the `Transformer Deployer <./transformer_deployer.html>`_. A Transformer is identified by the nonce of the Transformer Deployer that corresponds to its address. These contracts are executed in the context of the `Flash Wallet <./flash_wallet.html>`_ (via ``delegatecall``). 

Below is a catalog of Transformers.

.. table::
    :widths: 20 60 10 10

    +--------------------------+------------------------------------------------------------------------------------------+-----------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
    | **Transformer**          | **Description**                                                                          | **Nonce** | **Resources**                                                                                                                                                                                                     |
    +--------------------------+------------------------------------------------------------------------------------------+-----------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
    | FillQuoteTransformer     | Aggregates Liquidity across DEXs and Native 0x Orders.                                   | 9         | `Code <https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/transformers/FillQuoteTransformer.sol>`__; `Usage <../advanced/erc20_transformations.html#liquidity-aggregation>`__ |
    +--------------------------+------------------------------------------------------------------------------------------+-----------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
    | AffiliateFeesTransformer | Allows integrators to charge an affiliate fee when an order is filled by their platform. | 8         | `Code <https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/transformers/AffiliateFeeTransformer.sol>`__; `Usage <../advanced/erc20_transformations.html#affiliate-fees>`__     |
    +--------------------------+------------------------------------------------------------------------------------------+-----------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
    | PayTakerTransformer      | Forwards funds in the Flash Wallet to the Taker.                                         | 7         | `Code <https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/transformers/PayTakerTransformer.sol>`__; `Usage <../advanced/erc20_transformations.html#pay-taker>`__              |
    +--------------------------+------------------------------------------------------------------------------------------+-----------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
    | WethTransformer          | Wraps ETH into WETH (and unwraps)                                                        | 6         | `Code <https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/transformers/WethTransformer.sol>`__; `Usage <../advanced/erc20_transformations.html#weth-wrapping>`__              |
    +--------------------------+------------------------------------------------------------------------------------------+-----------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+



Implementing a Transformer
==========================
Transformers are currently used by the `TransformERC20Feature <./features.html>`_ to aggregate liquidity and perform operations on ERC20 tokens (ex, wrapping ETH). Your transformer should inherit from `Transformer Contract <https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/transformers/Transformer.sol>`_ and implement the interface in `IERC20Transformer <https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/transformers/IERC20Transformer.sol>`_.

.. code-block:: solidity

    // @dev A transformation callback used in `TransformERC20.transformERC20()`.
    interface IERC20Transformer {

        /// @dev Context information to pass into `transform()` by `TransformERC20.transformERC20()`.
        struct TransformContext {
            // The caller of `TransformERC20.transformERC20()`.
            address payable sender;
            // taker The taker address, which may be distinct from `sender` in the case
            // meta-transactions.
            address payable taker;
            // Arbitrary data to pass to the transformer.
            bytes data;
        }

        /// @dev Called from `TransformERC20.transformERC20()`. This will be
        ///      delegatecalled in the context of the FlashWallet instance being used.
        /// @param context Context information.
        /// @return success The success bytes (`LibERC20Transformer.TRANSFORMER_SUCCESS`).
        function transform(TransformContext calldata context)
            external
            returns (bytes4 success);
        }
