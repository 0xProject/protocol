###############################
Releases
###############################

.. role:: strike
    :class: strike

This page outlines upcoming releases and expected changes.

+-------------+----------------------+-----------------------------------------+
| **Release** | **Est Release Date** | **Status**                              |
+-------------+----------------------+-----------------------------------------+
|  Tinker     | TBA                  | In Audits                               |
+-------------+----------------------+-----------------------------------------+


Tinker (Official V4 Release)
----------------------------

- Upgrade any features that transfer user funds to use allowances on the Proxy contract. Transfers will still fallback to the Allowance Target, but integrators will get reduced transaction costs from setting their allowance on the Proxy.. See more on the `Allowances Page <../basics/allowances.html>`_.
- Deploy `LiquidityProviderFeature <../architecture/features.html>`_.
- Deploy `NativeLiquidityFeature <../architecture/features.html>`_.
- Deploy updated `FillQuoteTransformer <../architecture/transformers.html>`_, which can fill `V4 Orders <../basics/orders.html>`_. This transformer will no longer call Exchange V3.
- Introduce `new events <../basics/events.html>`_.
- Decommission `SignatureValidationFeature <../architecture/features.html>`_.
- Decommission `TokenSpenderFeature <../architecture/features.html>`_.