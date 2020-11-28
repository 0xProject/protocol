###############################
Pluggable Liquidity (PLP)
###############################

PLP (Pluggable Liquidity PLP) enables anyone to extend the 0x Protocol with their own on-chain liquidity provider, like an AMM (Automated Market Maker). Liquidity providers are sandboxed so their code can be totally closed-source; they are executed via the `LiquidityProviderFeature <../architecture/features.html>`_


Implementing a Liquidity Provider
=================================
The only requirement is that the provider implements the interface in `ILiquidityProviderSandbox <https://github.com/0xProject/protocol/blob/development/contracts/zero-ex/contracts/src/external/ILiquidityProviderSandbox.sol>`_.

.. code-block:: solidity

    /// @dev Calls `sellTokenForToken` on the given `provider` contract to
    ///      trigger a trade.
    /// @param provider The address of the on-chain liquidity provider.
    /// @param inputToken The token being sold.
    /// @param outputToken The token being bought.
    /// @param recipient The recipient of the bought tokens.
    /// @param minBuyAmount The minimum acceptable amount of `outputToken` to buy.
    /// @param auxiliaryData Auxiliary data supplied to the `provider` contract.
    function executeSellTokenForToken(
        address provider,
        address inputToken,
        address outputToken,
        address recipient,
        uint256 minBuyAmount,
        bytes calldata auxiliaryData
    )
        external;

    /// @dev Calls `sellEthForToken` on the given `provider` contract to
    ///      trigger a trade.
    /// @param provider The address of the on-chain liquidity provider.
    /// @param outputToken The token being bought.
    /// @param recipient The recipient of the bought tokens.
    /// @param minBuyAmount The minimum acceptable amount of `outputToken` to buy.
    /// @param auxiliaryData Auxiliary data supplied to the `provider` contract.
    function executeSellEthForToken(
        address provider,
        address outputToken,
        address recipient,
        uint256 minBuyAmount,
        bytes calldata auxiliaryData
    )
        external;

    /// @dev Calls `sellTokenForEth` on the given `provider` contract to
    ///      trigger a trade.
    /// @param provider The address of the on-chain liquidity provider.
    /// @param inputToken The token being sold.
    /// @param recipient The recipient of the bought tokens.
    /// @param minBuyAmount The minimum acceptable amount of ETH to buy.
    /// @param auxiliaryData Auxiliary data supplied to the `provider` contract.
    function executeSellTokenForEth(
        address provider,
        address inputToken,
        address recipient,
        uint256 minBuyAmount,
        bytes calldata auxiliaryData
    )
        external;


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