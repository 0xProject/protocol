###############################
Protocol Fees
###############################

An ETH protocol fee is paid by the Taker each time a `Limit Order <./orders.html#limit-orders>`_ is `filled <./functions.html>`_.
The fee is proportional to the gas cost of filling an order and scales linearly with gas price. The cost is currently ``70k * tx.gasprice``. 
At the end of every Staking Epoch, these fees are aggregated and distributed to the makers as a liquidity reward: the reward is proportional to the maker's collected fees and staked ZRX relative to other makers.
To learn more about protocol fees and liquidity incentives, see the `Official Spec <https://github.com/0xProject/0x-protocol-specification/blob/master/staking/staking-specification.md>`_.

.. note::

    `RFQ Orders <./orders.html#rfq-orders>`_ are introduced in Exchange V4, and there is currently no protocol fee for filling this type of order.
    The existing fee mechanics work well for limit orders, where arb bots pay to compete for liquidity; however, it does not translate well to RFQ where makers are matched with a specific taker.
    We are researching fee models that could be used for RFQ and will keep the community up-to-date on our `Forum <https://forum.0x.org/>`_.

.. warning::

    In Exchange V3, protocol fees could be paid in ETH or WETH. As of V4, they can only be paid in ETH. 