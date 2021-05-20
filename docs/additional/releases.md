---
title: Releases
---

::: {.note}
::: {.title}
Note
:::

These releases are approved by the 0x Community. Come out and vote
[HERE](https://0x.org/zrx/vote/)!
:::

This page outlines upcoming releases and expected changes.

  --------------------------------------------- ------------------------------------------------- ---------- ------------- -------------------------------------------------------------------------------------------------------------------------
  **Name**                                      **Overview**                                      **Est      **Status**    **Additional**
                                                                                                  Release                  
                                                                                                  Date**                   

  [Amaretto](#amaretto)                         Protocol 4.1: Efficiency + Batch Fills            03/15/21   Development   

  *The following releases have been deployed*                                                                              

  [Babooshka](#babooshka)                       Connect Exchange Proxy to Staking                 02/08/21   Deployed      [Release Notes](https://github.com/0xProject/0x-migrations/blob/main/src/exchange-proxy/migrations/log/9_babooshka.md)

  [Squire](#squire)                             Aggregation for [V4                               02/04/21   Deployed      N/A
                                                Orders](../basics/orders.html)                                             

  [big-pantsuit-energy](#big-pantsuit-energy)   Patch batch `` `getOrderRelevantState() ``\`      01/25/21   Deployed      [Release
                                                functions                                                                  Notes](https://github.com/0xProject/0x-migrations/blob/main/src/exchange-proxy/migrations/log/8_big-pantsuit-energy.md)

  [Panettone](#panettone)                       Minor patches from [Consensys                     01/12/21   Deployed      [Release Notes](https://github.com/0xProject/0x-migrations/blob/main/src/exchange-proxy/migrations/log/7_panettone.md)
                                                Audit](./audits.html)                                                      

  [cyberpants2077](#cyberpants2077)             [V4 Orders](../basics/orders.html)                01/05/21   Deployed      [Release
                                                                                                                           Notes](https://github.com/0xProject/0x-migrations/blob/main/src/exchange-proxy/migrations/log/6_cyberpants2077.md)

  [Hot-Pants](#hot-pants)                       Remove calldata signing / DeFi Saver Fix /        12/07/20   Deployed      [Release Notes](https://github.com/0xProject/0x-migrations/blob/main/src/exchange-proxy/migrations/log/5_hot_pants.md)
                                                Allowance on Proxy                                                         

  [Plop](#plop)                                 PLP VIP                                           12/01/20   Deployed      [Release Notes](https://github.com/0xProject/0x-migrations/blob/main/src/exchange-proxy/migrations/log/4_plop.md)

  [Tinker](#tinker)                             Set allowances directly on Exchange Proxy         11/12/20   Deployed      [Release Notes](https://github.com/0xProject/0x-migrations/blob/main/src/exchange-proxy/migrations/log/3_tinker.md)

  [Elphaba](#elphaba)                           Meta-Transactions + Uniswap VIP                              Deployed      [Release Notes](https://github.com/0xProject/0x-migrations/blob/main/src/exchange-proxy/migrations/log/2_elphaba.md)

  [Champagne-Problems](#champagne-problems)     Signed Calldata                                              Deployed      [Release
                                                                                                                           Notes](https://github.com/0xProject/0x-migrations/blob/main/src/exchange-proxy/migrations/log/1_champagne_problems.md)
  --------------------------------------------- ------------------------------------------------- ---------- ------------- -------------------------------------------------------------------------------------------------------------------------

# Upcoming

## Amaretto

-   RFQ VIP (fallback to DEX if RFQ orders is unfillable)
-   Batch fills for native orders
-   Mooniswap VIP
-   Curve / Swerve VIP (via PLP Sandbox)

# Past

## Babooshka

-   Register the 0x Exchange Proxy with the Staking Proxy, allowing
    protocol fees from V4 Orders to be paid to Staking Pools.

## Squire

-   Deploy updated
    [FillQuoteTransformer](../architecture/transformers.html), which can
    fill [V4 Orders](../basics/orders.html). This transformer will no
    longer call Exchange V3.
-   This will replace the [ERC20BridgeTransfer
    Event](../basics/events.html#erc20bridgetransfer)

## big-pantsuit-energy

-   Swallow reverts in [batchGetRfqOrderRelevantStates()]{.title-ref}
    and [batchGetLimitOrderRelevantStates()]{.title-ref} functions.

## Panettone

-   Minor patches from the Consensys Audit. No breaking changes.
-   Decommissions the internal [\_executeMetaTransaction]{.title-ref}
    function.
-   Extends deployment timelock from 24h to 48h.
-   Decommission
    [SignatureValidationFeature](../architecture/features.html).
-   Decommission [TokenSpenderFeature](../architecture/features.html).

## cyberpants2077

-   Deploy [NativeLiquidityFeature](../architecture/features.html). This
    incldues order validation that was previously in Dev-Utils.
-   Introduces [new events](../basics/events.html).

## Hot-Pants

-   Removes calldata signing from `TransformERC20` Feature.
-   Redeploying all [Transformers](../architecture/transformers.html)
    (new interface w/o `calldataHash`)
-   Allowances can now be set on the
    [Proxy](../architecture/features/proxy.html). See more on the
    [Allowances Page](../basics/allowances.html). This involves
    redeploying the following [Features](../architecture/features.html):
    `MetaTransactionsFeature`, `TransformERC20Feature`,
    `UniswapFeature`.

## Plop

-   Deploy the
    [LiquidityProviderFeature](../architecture/features.html), which
    enables optimized trades directly with [PLP](../advanced/plp.html)

## Tinker

::: {.note}
::: {.title}
Note
:::

This release was partially rolled back due to breaking allowances for
some [Exceptional ERC20 Tokens](./exceptional_erc20s.html). These
features were fixed and re-deployed in the Hot-Pants release, above.
:::

-   Upgrade any features that transfer user funds to use allowances on
    the Proxy contract. Transfers will still fallback to the Allowance
    Target, but integrators will get reduced transaction costs from
    setting their allowance on the Proxy. This involves redeploying the
    following [Features](../architecture/features.html):
    `MetaTransactionsFeature`, `TransformERC20Feature`,
    `UniswapFeature`.

## Elphaba

-   Updates for Meta-Transactions Feature
-   Uniswap VIP for efficient fills through Uniswap.

## Champagne-Problems

-   Signed Calldata for Meta-Transactions
