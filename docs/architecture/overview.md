---
title: Overview
---

The 0x Exchange implements a delegate-call proxy pattern to create a
system of composable smart contracts. This architecture enables 0x to
innovate with minimal friction alongside the growing DeFi ecosystem.

The diagram below illustrates our system (click to enlarge).

![image](../_static/img/architecture.png)

------------------------------------------------------------------------

The table below defines our smart contract nomenclature.

  ---------------------------------------- ------------------------------------------------------
  **Term**                                 **Definition**

  [Proxy](./proxy.html)                    The point of entry into the system. This contract
                                           delegate-calls into Features.

  [Features](./features.html)              These contracts implement the core feature set of the
                                           0x Protocol. They are trusted with user allowances and
                                           permissioned by the 0x Governor.

  [Transformers](./transformers.html)      These contracts extend the core protocol. They are
                                           trustless and permissioned by the Transformer
                                           Deployer.

  [Flash Wallet](./flash_wallet.html)      The Flash Wallet is a sandboxed escrow contract that
                                           holds funds for Transformers to operate on. For
                                           example, the `WETHtransformer` wraps any Ether in the
                                           Flash Wallet.

  [Allowance                               Users set their allowances on this contract. It is
  Target](../basics/allowances.html)       scheduled to be deprecated after the official V4
                                           release in January, 2021. After which point allowances
                                           will be set directly on the Proxy.

  [Governor](./governor.html)              A MultiSig that governs trusted contracts in the
                                           system: Proxy, Features, Flash Wallet.

  [Transformer                             Deploys Transformers. A transformer is authenticated
  Deployer](./transformer_deployer.html)   using a nonce of the Transformer Deployer.

  [Fee Collectors](./fee_collectors.html)  [Protocol fees](../basics/protocol_fees.html) are paid
                                           into these contracts at time-of-fill.

  [PLP Sandbox](./plp_sandbox.html)        [PLP](../advanced/plp.html) liquidity providers are
                                           called from this sandbox.
  ---------------------------------------- ------------------------------------------------------
