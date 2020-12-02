###############################
Pluggable Liquidity (PLP)
###############################

PLP (Pluggable Liquidity PLP) enables anyone to extend the 0x Protocol with their own on-chain liquidity provider, like an AMM (Automated Market Maker). Liquidity providers are sandboxed so their code can be totally closed-source; they are executed via the `LiquidityProviderFeature <../architecture/features.html>`_


Implementing a Liquidity Provider
=================================
The only requirement is that the provider implements the interface in `ILiquidityProvider <https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/vendor/ILiquidityProvider.sol>`_.
Note that ``sellEthForToken`` and ``sellTokenForEth`` do not need to be implemented if the liquidity provider does not trade ETH/WETH.

.. code-block:: solidity

    /// @dev Trades `inputToken` for `outputToken`. The amount of `inputToken`
    ///      to sell must be transferred to the contract prior to calling this
    ///      function to trigger the trade.
    /// @param inputToken The token being sold.
    /// @param outputToken The token being bought.
    /// @param recipient The recipient of the bought tokens.
    /// @param minBuyAmount The minimum acceptable amount of `outputToken` to buy.
    /// @param auxiliaryData Arbitrary auxiliary data supplied to the contract.
    /// @return boughtAmount The amount of `outputToken` bought.
    function sellTokenForToken(
        address inputToken,
        address outputToken,
        address recipient,
        uint256 minBuyAmount,
        bytes calldata auxiliaryData
    )
        external
        returns (uint256 boughtAmount);

    /// @dev Trades ETH for token. ETH must either be attached to this function
    ///      call or sent to the contract prior to calling this function to
    ///      trigger the trade.
    /// @param outputToken The token being bought.
    /// @param recipient The recipient of the bought tokens.
    /// @param minBuyAmount The minimum acceptable amount of `outputToken` to buy.
    /// @param auxiliaryData Arbitrary auxiliary data supplied to the contract.
    /// @return boughtAmount The amount of `outputToken` bought.
    function sellEthForToken(
        address outputToken,
        address recipient,
        uint256 minBuyAmount,
        bytes calldata auxiliaryData
    )
        external
        payable
        returns (uint256 boughtAmount);

    /// @dev Trades token for ETH. The token must be sent to the contract prior
    ///      to calling this function to trigger the trade.
    /// @param inputToken The token being sold.
    /// @param recipient The recipient of the bought tokens.
    /// @param minBuyAmount The minimum acceptable amount of ETH to buy.
    /// @param auxiliaryData Arbitrary auxiliary data supplied to the contract.
    /// @return boughtAmount The amount of ETH bought.
    function sellTokenForEth(
        address inputToken,
        address payable recipient,
        uint256 minBuyAmount,
        bytes calldata auxiliaryData
    )
        external
        returns (uint256 boughtAmount);

    /// @dev Quotes the amount of `outputToken` that would be obtained by
    ///      selling `sellAmount` of `inputToken`.
    /// @param inputToken Address of the taker token (what to sell). Use
    ///        the wETH address if selling ETH.
    /// @param outputToken Address of the maker token (what to buy). Use
    ///        the wETH address if buying ETH.
    /// @param sellAmount Amount of `inputToken` to sell.
    /// @return outputTokenAmount Amount of `outputToken` that would be obtained.
    function getSellQuote(
        address inputToken,
        address outputToken,
        uint256 sellAmount
    )
        external
        view
        returns (uint256 outputTokenAmount);


Trading with a Liquidity Provider
=================================

To trade with a liquidity provider use the ``sellToLiquidityProvider`` function.

.. code-block:: solidity

    /// @dev Sells `sellAmount` of `inputToken` to the liquidity provider
    ///      at the given `provider` address.
    /// @param inputToken The token being sold.
    /// @param outputToken The token being bought.
    /// @param provider The address of the on-chain liquidity provider
    ///        to trade with.
    /// @param recipient The recipient of the bought tokens. If equal to
    ///        address(0), `msg.sender` is assumed to be the recipient.
    /// @param sellAmount The amount of `inputToken` to sell.
    /// @param minBuyAmount The minimum acceptable amount of `outputToken` to
    ///        buy. Reverts if this amount is not satisfied.
    /// @param auxiliaryData Auxiliary data supplied to the `provider` contract.
    /// @return boughtAmount The amount of `outputToken` bought.
    function sellToLiquidityProvider(
        address inputToken,
        address outputToken,
        address payable provider,
        address recipient,
        uint256 sellAmount,
        uint256 minBuyAmount,
        bytes calldata auxiliaryData
    )
        external
        override
        payable
        returns (uint256 boughtAmount);

This function transfers tokens from ``msg.sender`` to the liquidity provider then executes the trade through a sandboxed contract external to the Exchange Proxy. The sandbox then executes the trade through the provider. This function then transfers the output tokens to the ``recipient``.

This function will emit a `LiquidityProviderSwap <../basics/events.html#liquidityproviderswap>`_ event if the trade succeeds. It will revert if the amount of ``outputToken`` returned by the Liquidity Provider is less than ``minBuyAmount``.
