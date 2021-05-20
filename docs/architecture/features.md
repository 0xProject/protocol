---
title: Features
---

Features implement the core feature set of the 0x Protocol. They are
trusted with user allowances and permissioned by the [0x
Governor](./governor.html). Features are run in the context of the
[Proxy](../proxy.html), via a `delegatecall`.

Below is a catalog of Features.

  ---------------------------- ----------------------------------------------------------- --------------------------------------------------------------------------------------------------------------------------------------------
  **Feature**                  **Description**                                             **Resources**

  BootstrapFeature             Bootstraps the entire system.                               [Code](https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/features/BootstrapFeature.sol);
                                                                                           [Usage](./proxy.html#bootstrapping)

  LiquidityProviderFeature     Connects the system to Pluggable Liquidity (PLP).           [Code](https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/features/LiquidityProviderFeature.sol);
                                                                                           [Usage](../advanced/plp.html#trading-with-a-liquidity-provider)

  MetaTransactionsFeature      Executes Meta-Transactions.                                 [Code](https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/features/MetaTransactionsFeature.sol);
                                                                                           [Usage](../advanced/mtx.html)

  NativeLiquidityFeature       Functions for native 0x liquidity (see                      [Code](https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/features/NativeOrdersFeature.sol);
                               [Orders](../basics/orders.html)).                           [Usage](../basics/functions.html)

  OwnableFeature               An implementation of Ownable that is compatible with the    [Code](https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/features/OwnableFeature.sol);
                               delegate-call proxy pattern.                                [Usage](./architecture/proxy.html#ownership)

  SignatureValidationFeature   *This feature is deprecated. Its code will be removed after [Code](https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/features/SignatureValidatorFeature.sol)
                               the contract is decommissioned.*                            

  SimpleFunctionRegistry       Implements the registry of functions/features available in  [Code](https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/features/SimpleFunctionRegistryFeature.sol);
                               the system.                                                 [Usage](./proxy.html#function-registry)

  TokenSpenderFeature          *This feature is deprecated. Its code will be removed after [Code](https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/features/TokenSpenderFeature.sol)
                               the contract is decommissioned.*                            

  TransformERC20Feature        Executes [Transformers](./transformers.html) to aggregate   [Code](https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/features/TransformERC20Feature.sol);
                               liquidity and operate on ERC20 tokens.                      [Usage](../advanced/erc20_transformations.html)

  UniswapFeature               A highly-optimized UniswapV2 router; used to source         [Code](https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/features/UniswapFeature.sol);
                               liquidity from Uniswap.                                     [Usage](../advanced/uniswap.html)
  ---------------------------- ----------------------------------------------------------- --------------------------------------------------------------------------------------------------------------------------------------------

# Implementing a Feature

The only requirement is that the Feature implements the interface in
[IFeature](https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/features/IFeature.sol).
Review the [Proxy Section](./proxy.html) for details on how to write a
smart contract that is compatible with our architecture (ex, how to
properly manage state).

``` {.solidity}
/// @dev Basic interface for a feature contract.
interface IFeature {

    // solhint-disable func-name-mixedcase

    /// @dev The name of this feature set.
    function FEATURE_NAME() external view returns (string memory name);

    /// @dev The version of this feature set.
    function FEATURE_VERSION() external view returns (uint256 version);
}
```

# Best Practices

We use this checklist to review the safety of new Features.

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
