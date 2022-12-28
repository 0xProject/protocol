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
    | BootstrapFeature           | Bootstraps the entire system.                                                                      | `Code <https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/features/BootstrapFeature.sol>`__; `Usage <./proxy.html#bootstrapping>`__                                     |
    +----------------------------+----------------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
    | LiquidityProviderFeature   | Connects the system to Pluggable Liquidity (PLP).                                                  | `Code <https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/features/LiquidityProviderFeature.sol>`__; `Usage <../advanced/plp.html#trading-with-a-liquidity-provider>`__ |
    +----------------------------+----------------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
    | MetaTransactionsFeature    | Executes Meta-Transactions.                                                                        | `Code <https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/features/MetaTransactionsFeature.sol>`__; `Usage <../advanced/mtx.html>`__                                    |
    +----------------------------+----------------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
    | NativeOrdersFeature     | Functions for native 0x orders (see `Orders <../basics/orders.html>`_).                         | `Code <https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/features/NativeOrdersFeature.sol>`__; `Usage <../basics/functions.html>`__                                    |
    +----------------------------+----------------------------------------------------------------------------------------------------+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
    | OwnableFeature             | An implementation of Ownable that is compatible with the delegate-call proxy pattern.              | `Code <https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/features/OwnableFeature.sol>`__; `Usage <./architecture/proxy.html#ownership>`__                              |
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
