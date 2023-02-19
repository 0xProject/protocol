###############################
ERC20 Transformations
###############################


The 0x Protocol is able to perform a variety of atomic transformations on ERC20 tokens, in addition to simply executing trades. This is made possible through composable smart contracts, called `Transformers <../architecture/transformers.html>`_. These trustless modules extend the core Exchange logic, enabling workflows like converting between ETH<>WETH or aggregating liquidity across DEX's. These operations can be combined with trade exeuction to create a seamlesss trading experience.

Anyone can run transformations using the ``transformERC20`` Exchange function.

.. code-block:: solidity

    /// @dev Executes a series of transformations to convert an ERC20 `inputToken`
    ///      to an ERC20 `outputToken`.
    /// @param inputToken The token being provided by the sender.
    ///        If `0xeee...`, ETH is implied and should be provided with the call.`
    /// @param outputToken The token to be acquired by the sender.
    ///        `0xeee...` implies ETH.
    /// @param inputTokenAmount The amount of `inputToken` to take from the sender.
    ///        If set to `uint256(-1)`, the entire spendable balance of the taker
    ///        will be solt.
    /// @param minOutputTokenAmount The minimum amount of `outputToken` the sender
    ///        must receive for the entire transformation to succeed. If set to zero,
    ///        the minimum output token transfer will not be asserted.
    /// @param transformations The transformations to execute on the token balance(s)
    ///        in sequence.
    /// @return outputTokenAmount The amount of `outputToken` received by the sender.
    function transformERC20(
        IERC20Token inputToken,
        IERC20Token outputToken,
        uint256 inputTokenAmount,
        uint256 minOutputTokenAmount,
        Transformation[] memory transformations
    )
        public
        override
        payable
        returns (uint256 outputTokenAmount);

A Transformation is defined by a ``deploymentNonce`` (which identifies the contract that implements the transformation) and ``data`` for that contract.

.. code-block:: solidity

    /// @dev Defines a transformation to run in `transformERC20()`.
    struct Transformation {
        // The deployment nonce for the transformer.
        // The address of the transformer contract will be derived from this
        // value.
        uint32 deploymentNonce;
        // Arbitrary data to pass to the transformer.
        bytes data;
    }

The transaction will revert if a transformation fails; the `inputTokenAmount` cannot be transferred from the sender; or the ``minOutputTokenAmount`` is not transferred to the sender. A single `TransformedERC20 <../basics/events.html#transformederc20>`_ event is be emitted upon successful execution of all transformations.

Liquidity Aggregation
---------------------

Liquidity can be pulled from other Decentralized Exchanges (DEX) to supplement native liquidity (0x orders). This is currently used by 0x API to provide the aggregate the best prices across the entire DEX Ecosystem. Check out `https://matcha.xyz <https://matcha.xyz>`_ to see this in action!

Below are just a few of the Supported DEX's on Ethereum:

* Balancer v1/v2
* Bancor v1/v2
* Curve
* Dodo v1/v2
* Kyber
* MakerPSM
* MStable
* Mooniswap
* Oasis
* Shell
* Sushiswap
* Shibaswap
* Smoothy
* Uniswap v1/v2/v3

This transformation is implemented by the `FillQuoteTransformer <../architecture/transformers.html>`_. Abi-Encode the following struct to get the ``data``:

.. warning::
    An upgrade is pending to this transformation. This currently uses Exchange V3 Orders, but will soon be updated to use `V4 Orders <../basics/orders.html>`_. - 11/26/2020

.. code-block:: solidity

    /// @dev Transform data to ABI-encode and pass into `transform()`.
    struct TransformData {
        // Whether we are performing a market sell or buy.
        Side side;
        // The token being sold.
        // This should be an actual token, not the ETH pseudo-token.
        IERC20Token sellToken;
        // The token being bought.
        // This should be an actual token, not the ETH pseudo-token.
        IERC20Token buyToken;
        // The orders to fill.
        IExchange.Order[] orders;
        // Signatures for each respective order in `orders`.
        bytes[] signatures;
        // Maximum fill amount for each order. This may be shorter than the
        // number of orders, where missing entries will be treated as `uint256(-1)`.
        // For sells, this will be the maximum sell amount (taker asset).
        // For buys, this will be the maximum buy amount (maker asset).
        uint256[] maxOrderFillAmounts;
        // Amount of `sellToken` to sell or `buyToken` to buy.
        // For sells, this may be `uint256(-1)` to sell the entire balance of
        // `sellToken`.
        uint256 fillAmount;
        // Who to transfer unused protocol fees to.
        // May be a valid address or one of:
        // `address(0)`: Stay in flash wallet.
        // `address(1)`: Send to the taker.
        // `address(2)`: Send to the sender (caller of `transformERC20()`).
        address payable refundReceiver;
        // Required taker address for RFQT orders.
        // Null means any taker can fill it.
        address rfqtTakerAddress;
    }

This transformation currently executes a Market Sell or Market Buy on a series of `0x V3 Orders <https://github.com/0xProject/0x-protocol-specification/blob/master/v3/v3-specification.md#orders>`_. The transaction will revert if the ``fillAmount`` is not reached; an individual order can fail without the entire transaction reverting. A `ProtocolFeeUnfunded <../basics/events.html#protocolfeeunfunded>`_ event will be emitted if an order failed to fill because the Taker did not send a sufficient protocol fee.


WETH Wrapping
-------------

This transformation is implemented by the `WethTransformer <../architecture/transformers.html>`_. Abi-Encode the following struct to get the ``data``:

.. code-block:: solidity

    /// @dev Transform data to ABI-encode and pass into `transform()`.
    struct TransformData {
        // The token to wrap/unwrap. Must be either ETH or WETH.
        IERC20Token token;
        // Amount of `token` to wrap or unwrap.
        // `uint(-1)` will unwrap the entire balance.
        uint256 amount;
    }

If the supplied token address is `WETH (etherToken) <../basics/addresses.html>`_ then the supplied WETH will be unwrapped to ``ETH``. If any other address is supplied the any ETH passed in will be wrapped into ``WETH``. No events are emitted by 0x during this transformation, although token contracts may have events. This will revert if ``allowances <../basics/allowances.html>_`` are not set or the available balance is less than ``amount``.

Affiliate Fees
--------------

This transformation is implemented by the `AffiliateFeeTransformer <../architecture/transformers.html>`_. Abi-Encode the following struct to get the ``data``:

.. code-block:: solidity

    /// @dev Information for a single fee.
    struct TokenFee {
        // The token to transfer to `recipient`.
        IERC20Token token;
        // Amount of each `token` to transfer to `recipient`.
        // If `amount == uint256(-1)`, the entire balance of `token` will be
        // transferred.
        uint256 amount;
        // Recipient of `token`.
        address payable recipient;
    }

This pays the ``recipient`` in the ``amount`` of ``token`` specified. This can be used by integrators who wish to add an additional fee on top of 0x Orders. No events are emitted by 0x during this transformation, although token contracts may have events. This will revert if `allowances <../basics/allowances.html>`_ are not set or the available balance is less than ``amount``.

Pay Taker
---------

This transformation is implemented by the `PayTakerTransformer <../architecture/transformers.html>`_. Abi-Encode the following struct to get the ``data``:

.. code-block:: solidity

    /// @dev Transform data to ABI-encode and pass into `transform()`.
    struct TransformData {
        // The tokens to transfer to the taker.
        IERC20Token[] tokens;
        // Amount of each token in `tokens` to transfer to the taker.
        // `uint(-1)` will transfer the entire balance.
        uint256[] amounts;
    }

This pays the ``taker`` in the ``amounts`` of each ``tokens`` specified. This is generally run at the end of all other transformations. For example, if you've swapped the taker's ETH for WETH then executed a trade through `Liquidity Aggregation`_, this transformation will can transfer the final output token back to the Taker.

No events are emitted by 0x during this transformation, although token contracts may have events. This will revert if `allowances <../basics/allowances.html>`_ are not set or the available balance is less than ``amount``.

Adding Custom Transformations
-----------------------------
Transformations are trustless, but at this time they are permissioned so only 0x Labs can deploy new Transformers. If you are interested in deploying your own transformation logic, please reach out to us on `Discord <https://discord.com/invite/d3FTX3M>`_. Learn more about why this is permissioned in the `Transformer Deployer <../architecture/transformer_deployer.html>`_ section.
