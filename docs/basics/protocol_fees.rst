###############################
Protocol Fees
###############################

.. note::

    As of September 29, 2021, protocol fees have been removed for all order types in both Exchange V4 and V3 in accordance with `ZEIP-91 <https://0x.org/zrx/vote/zeip-91>`_.

An ETH protocol fee is paid by the Taker each time a `Limit Order <./orders.html#limit-orders>`_ is `filled <./functions.html>`_.
The fee is proportional to the gas cost of filling an order and scales linearly with gas price. The cost is currently ``0 * tx.gasprice``. 
At the end of every Staking Epoch, these fees are aggregated and distributed to the makers as a liquidity reward: the reward is proportional to the maker's collected fees and staked ZRX relative to other makers.
To learn more about protocol fees and liquidity incentives, see the `Official Spec <https://github.com/0xProject/0x-protocol-specification/blob/master/staking/staking-specification.md>`_.

.. warning::

    In Exchange V3, protocol fees could be paid in ETH or WETH. As of V4, they can only be paid in ETH. 