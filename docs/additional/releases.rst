###############################
Releases
###############################

.. role:: strike
    :class: strike

.. note::

    These releases are approved by the 0x Community. Come out and vote `HERE <https://0x.org/zrx/vote/>`_!

This page outlines upcoming releases and expected changes.

.. table::
    :widths: 20 50 10 10 10

    +---------------------------------------------+---------------------------------------------------------------+----------------------+-------------+-------------------------------------------------------------------------------------------------------------------------------------+
    | **Name**                                    | **Overview**                                                  | **Est Release Date** | **Status**  | **Additional**                                                                                                                      |
    +---------------------------------------------+---------------------------------------------------------------+----------------------+-------------+-------------------------------------------------------------------------------------------------------------------------------------+
    | `Nifty`_                                    | ERC721 and ERC1155 support                                    | 02/14/22             | Vote        |                                                                                                                                     |
    +---------------------------------------------+---------------------------------------------------------------+----------------------+-------------+-------------------------------------------------------------------------------------------------------------------------------------+
    | *The following releases have been deployed* |                                                               |                      |             |                                                                                                                                     |
    +---------------------------------------------+---------------------------------------------------------------+----------------------+-------------+-------------------------------------------------------------------------------------------------------------------------------------+
    | `Amaretto`_                                 | Protocol 4.1: Efficiency + Batch Fills                        | 03/15/21             | Deployed    |                                                                                                                                     |
    +---------------------------------------------+---------------------------------------------------------------+----------------------+-------------+-------------------------------------------------------------------------------------------------------------------------------------+
    | `Babooshka`_                                | Connect Exchange Proxy to Staking                             | 02/08/21             | Deployed    | `Release Notes <https://github.com/0xProject/0x-migrations/blob/main/src/exchange-proxy/migrations/log/9_babooshka.md>`__           |
    +---------------------------------------------+---------------------------------------------------------------+----------------------+-------------+-------------------------------------------------------------------------------------------------------------------------------------+
    | `Squire`_                                   | Aggregation for `V4 Orders <../basics/orders.html>`_          | 02/04/21             | Deployed    | N/A                                                                                                                                 |
    +---------------------------------------------+---------------------------------------------------------------+----------------------+-------------+-------------------------------------------------------------------------------------------------------------------------------------+
    | `big-pantsuit-energy`_                      | Patch batch ```getOrderRelevantState()``` functions           | 01/25/21             | Deployed    | `Release Notes <https://github.com/0xProject/0x-migrations/blob/main/src/exchange-proxy/migrations/log/8_big-pantsuit-energy.md>`__ |
    +---------------------------------------------+---------------------------------------------------------------+----------------------+-------------+-------------------------------------------------------------------------------------------------------------------------------------+
    | `Panettone`_                                | Minor patches from `Consensys Audit <./audits.html>`_         | 01/12/21             | Deployed    | `Release Notes <https://github.com/0xProject/0x-migrations/blob/main/src/exchange-proxy/migrations/log/7_panettone.md>`__           |
    +---------------------------------------------+---------------------------------------------------------------+----------------------+-------------+-------------------------------------------------------------------------------------------------------------------------------------+
    | `cyberpants2077`_                           | `V4 Orders <../basics/orders.html>`_                          | 01/05/21             | Deployed    | `Release Notes <https://github.com/0xProject/0x-migrations/blob/main/src/exchange-proxy/migrations/log/6_cyberpants2077.md>`__      |
    +---------------------------------------------+---------------------------------------------------------------+----------------------+-------------+-------------------------------------------------------------------------------------------------------------------------------------+
    | `Hot-Pants`_                                | Remove calldata signing / DeFi Saver Fix / Allowance on Proxy | 12/07/20             | Deployed    | `Release Notes <https://github.com/0xProject/0x-migrations/blob/main/src/exchange-proxy/migrations/log/5_hot_pants.md>`__           |
    +---------------------------------------------+---------------------------------------------------------------+----------------------+-------------+-------------------------------------------------------------------------------------------------------------------------------------+
    | `Plop`_                                     | PLP VIP                                                       | 12/01/20             | Deployed    | `Release Notes <https://github.com/0xProject/0x-migrations/blob/main/src/exchange-proxy/migrations/log/4_plop.md>`__                |
    +---------------------------------------------+---------------------------------------------------------------+----------------------+-------------+-------------------------------------------------------------------------------------------------------------------------------------+
    | `Tinker`_                                   | Set allowances directly on Exchange Proxy                     | 11/12/20             | Deployed    | `Release Notes <https://github.com/0xProject/0x-migrations/blob/main/src/exchange-proxy/migrations/log/3_tinker.md>`__              |
    +---------------------------------------------+---------------------------------------------------------------+----------------------+-------------+-------------------------------------------------------------------------------------------------------------------------------------+
    | `Elphaba`_                                  | Meta-Transactions + Uniswap VIP                               |                      | Deployed    | `Release Notes <https://github.com/0xProject/0x-migrations/blob/main/src/exchange-proxy/migrations/log/2_elphaba.md>`__             |
    +---------------------------------------------+---------------------------------------------------------------+----------------------+-------------+-------------------------------------------------------------------------------------------------------------------------------------+
    | `Champagne-Problems`_                       | Signed Calldata                                               |                      | Deployed    | `Release Notes <https://github.com/0xProject/0x-migrations/blob/main/src/exchange-proxy/migrations/log/1_champagne_problems.md>`__  |
    +---------------------------------------------+---------------------------------------------------------------+----------------------+-------------+-------------------------------------------------------------------------------------------------------------------------------------+

Upcoming
========

Nifty
--------

- ERC721 and ERC1155 order types
- Batch fills for NFT orders
- Property based orders
- Ability to receive ETH in NFT orders



Past
=====

Amaretto
--------

- RFQ VIP (fallback to DEX if RFQ orders is unfillable)
- Batch fills for native orders
- Mooniswap VIP
- Curve / Swerve VIP (via PLP Sandbox)

Babooshka
----------

- Register the 0x Exchange Proxy with the Staking Proxy, allowing protocol fees from V4 Orders to be paid to Staking Pools.


Squire
-------

- Deploy updated `FillQuoteTransformer <../architecture/transformers.html>`_, which can fill `V4 Orders <../basics/orders.html>`_. This transformer will no longer call Exchange V3.
- This will replace the `ERC20BridgeTransfer Event <../basics/events.html#erc20bridgetransfer>`_

big-pantsuit-energy
-------------------

- Swallow reverts in `batchGetRfqOrderRelevantStates()` and `batchGetLimitOrderRelevantStates()` functions.

Panettone
----------

- Minor patches from the Consensys Audit. No breaking changes.
- Decommissions the internal `_executeMetaTransaction` function.
- Extends deployment timelock from 24h to 48h.
- Decommission `SignatureValidationFeature <../architecture/features.html>`_.
- Decommission `TokenSpenderFeature <../architecture/features.html>`_.

cyberpants2077
---------------

- Deploy `NativeLiquidityFeature <../architecture/features.html>`_. This incldues order validation that was previously in Dev-Utils.
- Introduces `new events <../basics/events.html>`_.

Hot-Pants
----------

- Removes calldata signing from ``TransformERC20`` Feature.
- Redeploying all `Transformers <../architecture/transformers.html>`_ (new interface w/o ``calldataHash``)
- Allowances can now be set on the `Proxy <../architecture/features/proxy.html>`_. See more on the `Allowances Page <../basics/allowances.html>`_. This involves redeploying the following `Features <../architecture/features.html>`_: ``MetaTransactionsFeature``, ``TransformERC20Feature``, ``UniswapFeature``.

Plop
----

- Deploy the `LiquidityProviderFeature <../architecture/features.html>`_, which enables optimized trades directly with `PLP <../advanced/plp.html>`_

Tinker
------

.. note::

    This release was partially rolled back due to breaking allowances for some `Exceptional ERC20 Tokens <./exceptional_erc20s.html>`_. These features were fixed and re-deployed in the Hot-Pants release, above.

- Upgrade any features that transfer user funds to use allowances on the Proxy contract. Transfers will still fallback to the Allowance Target, but integrators will get reduced transaction costs from setting their allowance on the Proxy. This involves redeploying the following `Features <../architecture/features.html>`_: ``MetaTransactionsFeature``, ``TransformERC20Feature``, ``UniswapFeature``.


Elphaba
-------

- Updates for Meta-Transactions Feature
- Uniswap VIP for efficient fills through Uniswap.


Champagne-Problems
------------------

- Signed Calldata for Meta-Transactions

