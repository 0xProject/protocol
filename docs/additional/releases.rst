###############################
Releases
###############################

.. role:: strike
    :class: strike

This page outlines upcoming releases and expected changes.

+-------------+---------------------------------------------------------------+----------------------+------------+
| **Release** | **Overview**                                                  | **Est Release Date** | **Status** |
+-------------+---------------------------------------------------------------+----------------------+------------+
| `VIP`_      | PLP VIP                                                       | 12/01/20             | Timelocked |
+-------------+---------------------------------------------------------------+----------------------+------------+
| `Hancock`_  | Remove calldata signing / DeFi Saver Fix / Allowance on Proxy | 12/07/20             | Testing    |
+-------------+---------------------------------------------------------------+----------------------+------------+
| `Tinker`_   | V4 Orders                                                     | Early January 2021   | In Audits  |
+-------------+---------------------------------------------------------------+----------------------+------------+

VIP
----

- Deploy the `LiquidityProviderFeature <../architecture/features.html>`_, which enables optimized trades directly with `PLP <../advanced/plp.html>`_


Hancock
-------

- Removes calldata signing from ``TransformERC20`` Feature.
- Redeploying all `Transformers <../architecture/transformers.html>`_ (new interface w/o ``calldataHash``)
- Allowances can now be set on the `Proxy <../architecture/features/proxy.html>`_. See more on the `Allowances Page <../basics/allowances.html>`_. This involves redeploying the following `Features <../architecture/features.html>`_: ``MetaTransactionsFeature``, ``TransformERC20Feature``, ``UniswapFeature``.


Tinker
------

- Deploy `NativeLiquidityFeature <../architecture/features.html>`_.
- Deploy updated `FillQuoteTransformer <../architecture/transformers.html>`_, which can fill `V4 Orders <../basics/orders.html>`_. This transformer will no longer call Exchange V3.
- Introduce `new events <../basics/events.html>`_.
- Decommission `SignatureValidationFeature <../architecture/features.html>`_.
- Decommission `TokenSpenderFeature <../architecture/features.html>`_.