###############################
Optimized Uniswap Router
###############################

The 0x Protocol is equipped with a highly optimized `UniswapV2 Router <https://uniswap.org/docs/v2/smart-contracts/router02/>`_, which can reduce the transaction cost of trading with Uniswap. Call the ``sellToUniswap`` function to execute a trade on Uniswap through the 0x Protocol.

.. code-block:: solidity

    /// @dev Efficiently sell directly to uniswap/sushiswap.
    /// @param tokens Sell path.
    /// @param sellAmount of `tokens[0]` Amount to sell.
    /// @param minBuyAmount Minimum amount of `tokens[-1]` to buy.
    /// @param isSushi Use sushiswap if true.
    /// @return buyAmount Amount of `tokens[-1]` bought.
    function sellToUniswap(
        IERC20Token[] calldata tokens,
        uint256 sellAmount,
        uint256 minBuyAmount,
        bool isSushi
    )
        external
        payable
        returns (uint256 buyAmount);

This function sells ``sellAmount`` of ``tokens[0]`` for at least ``minBuyAmount`` of ``tokens[-1]``. The ``tokens`` array defines how to route the trade between Uniswap pools. This function does not emit any events, although Uniswap pools will emit their own events. This function reverts if amount bought from Uniswap is less than ``minBuyAmount``, or if Uniswap reverts.

See the source code for our router `here <https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/features/UniswapFeature.sol>`_.

See the official `Uniswap V2 Documentation <https://uniswap.org/docs/v2/>`_ for information on events/reverts/allowances.

.. note::
    This function does not use allowances set on 0x. The ``msg.sender`` must have allowances set on Uniswap (or SushiSwap).
