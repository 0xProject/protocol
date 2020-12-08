###############################
Releases
###############################

.. role:: strike
    :class: strike

This page outlines upcoming releases and expected changes.

.. table::
    :widths: 20 50 10 10 10

    +--------------+---------------------------------------------------------------+----------------------+------------+---------------------------------------------------------------------------------------------------------------+
    | **Release**  | **Overview**                                                  | **Est Release Date** | **Status** | **Additional**                                                                                                |
    +--------------+---------------------------------------------------------------+----------------------+------------+---------------------------------------------------------------------------------------------------------------+
    | `Tinker`_    | `V4 Orders <../basics/orders.html>`_                          | 01/05/21             | In Audits  |                                                                                                               |
    +--------------+---------------------------------------------------------------+----------------------+------------+---------------------------------------------------------------------------------------------------------------+
    | `Hot-Pants`_ | Remove calldata signing / DeFi Saver Fix / Allowance on Proxy | 12/07/20             | Deployed   | `Release Notes <https://github.com/0xProject/0x-migrations/blob/main/src/exchange-proxy/migrations/LOG.md>`__ |
    +--------------+---------------------------------------------------------------+----------------------+------------+---------------------------------------------------------------------------------------------------------------+
    | `Plop`_      | PLP VIP                                                       | 12/01/20             | Deployed   |                                                                                                               |
    +--------------+---------------------------------------------------------------+----------------------+------------+---------------------------------------------------------------------------------------------------------------+


Upcoming
========

Tinker
------

- Deploy `NativeLiquidityFeature <../architecture/features.html>`_.
- Deploy updated `FillQuoteTransformer <../architecture/transformers.html>`_, which can fill `V4 Orders <../basics/orders.html>`_. This transformer will no longer call Exchange V3.
- Introduce `new events <../basics/events.html>`_.
- Decommission `SignatureValidationFeature <../architecture/features.html>`_.
- Decommission `TokenSpenderFeature <../architecture/features.html>`_.


Past
=====

Hot-Pants
----------

- Removes calldata signing from ``TransformERC20`` Feature.
- Redeploying all `Transformers <../architecture/transformers.html>`_ (new interface w/o ``calldataHash``)
- Allowances can now be set on the `Proxy <../architecture/features/proxy.html>`_. See more on the `Allowances Page <../basics/allowances.html>`_. This involves redeploying the following `Features <../architecture/features.html>`_: ``MetaTransactionsFeature``, ``TransformERC20Feature``, ``UniswapFeature``.

Plop
----

- Deploy the `LiquidityProviderFeature <../architecture/features.html>`_, which enables optimized trades directly with `PLP <../advanced/plp.html>`_

