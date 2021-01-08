###############################
Releases
###############################

.. role:: strike
    :class: strike

This page outlines upcoming releases and expected changes.

.. table::
    :widths: 20 50 10 10 10

    +---------------------------------------------+---------------------------------------------------------------+----------------------+-------------+-----------------------------------------------------------------------------------------------------------------------------+
    | **Name**                                    | **Overview**                                                  | **Est Release Date** | **Status**  | **Additional**                                                                                                              |
    +---------------------------------------------+---------------------------------------------------------------+----------------------+-------------+-----------------------------------------------------------------------------------------------------------------------------+
    | `Panettone`_                                | Minor patches from Consensys Audit                            | 01/11/21             | Timelocked  |                                                                                                                             |
    +---------------------------------------------+---------------------------------------------------------------+----------------------+-------------+-----------------------------------------------------------------------------------------------------------------------------+
    | `Squire`_                                   | Aggregation for `V4 Orders <../basics/orders.html>`_          | TBA                  | Development | Depends on AssetSwapper / 0x API Upgrade                                                                                    |
    +---------------------------------------------+---------------------------------------------------------------+----------------------+-------------+-----------------------------------------------------------------------------------------------------------------------------+
    | `Babooshka`_                                | Connect Exchange Proxy to Staking                             | 01/24/21             | Vote        | Requires community vote                                                                                                     |
    +---------------------------------------------+---------------------------------------------------------------+----------------------+-------------+-----------------------------------------------------------------------------------------------------------------------------+
    | *The following releases have been deployed* |                                                               |                      |             |                                                                                                                             |
    +---------------------------------------------+---------------------------------------------------------------+----------------------+-------------+-----------------------------------------------------------------------------------------------------------------------------+
    | `cyberpants2077`_                           | `V4 Orders <../basics/orders.html>`_                          | 01/05/21             | Deployed    | `Release Notes <https://github.com/0xProject/0x-migrations/blob/main/src/exchange-proxy/migrations/LOG.md#cyberpants2077>`_ |
    +---------------------------------------------+---------------------------------------------------------------+----------------------+-------------+-----------------------------------------------------------------------------------------------------------------------------+
    | `Hot-Pants`_                                | Remove calldata signing / DeFi Saver Fix / Allowance on Proxy | 12/07/20             | Deployed    | `Release Notes <https://github.com/0xProject/0x-migrations/blob/main/src/exchange-proxy/migrations/LOG.md>`__               |
    +---------------------------------------------+---------------------------------------------------------------+----------------------+-------------+-----------------------------------------------------------------------------------------------------------------------------+
    | `Plop`_                                     | PLP VIP                                                       | 12/01/20             | Deployed    |                                                                                                                             |
    +---------------------------------------------+---------------------------------------------------------------+----------------------+-------------+-----------------------------------------------------------------------------------------------------------------------------+
    | `Tinker`_                                   | Set allowances directly on Exchange Proxy                     | 11/12/20             | Deployed    |                                                                                                                             |
    +---------------------------------------------+---------------------------------------------------------------+----------------------+-------------+-----------------------------------------------------------------------------------------------------------------------------+


Upcoming
========

Panettone
----------

- Minor patches from the Consensys Audit. No breaking changes.
- Decommissions the internal `_executeMetaTransaction` function.
- Extends deployment timelock from 24h to 48h.
- Decommission `SignatureValidationFeature <../architecture/features.html>`_.
- Decommission `TokenSpenderFeature <../architecture/features.html>`_.


Squire
-------

- Deploy updated `FillQuoteTransformer <../architecture/transformers.html>`_, which can fill `V4 Orders <../basics/orders.html>`_. This transformer will no longer call Exchange V3.
- This will replace the `ERC20BridgeTransfer Event <../basics/events.html#erc20bridgetransfer>`_


Babooshka
----------

- Register the 0x Exchange Proxy with the Staking Proxy, allowing protocol fees from V4 Orders to be paid to Staking Pools.


Past
=====

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