###############################
Allowances
###############################

.. _Allowance Target Address: https://github.com/0xProject/protocol/blob/development/packages/contract-addresses/addresses.json#L40

After the official release, allowances will be set directly on the Exchange V4 Proxy contract.
Presently, while we are in beta, allowances should be set on the `Allowance Target <./addresses.html#exchange-v4>`_.

The motivation for eliminating the separate Allowance Target in the official release is
to reduce transaction costs. Depending on the operational overhead for our integrators,
we may support allowances on both the Exchange V4 & the Allowance Target after the official release, which is slated for January, 2021.