Introduction
============

Support for NFT swaps is available on all 0x-deployed blockchains. This
section gives an overview of the NFT features. We invite you to join our
`Discord <https://discord.com/invite/YyG9fkK>`__ and share feedback in
the
`#dev-feedback <https://discord.com/channels/435912040142602260/936366257521954857>`__. 

.. note::
    New to 0x Protocol NFT swaps? Watch this video on `🛠 How to Build NFT Exchange in Your DApp <https://www.youtube.com/watch?v=oCEU_Jed2Fs>`__ . It covers and overview of how the NFT swap functionality works, how to use it, and project ideas. 

NFT Swap SDK
------------

We are working with our ecosystem partners on developer tooling and
integrations. If you are looking to quickly integrate NFT swap
functionality into your app, Trader’s `NFT Swap
SDK <https://swapsdk.xyz/>`__
(`github <https://github.com/trader-xyz/nft-swap-sdk>`__ \|
`docs <https://docs.swapsdk.xyz/>`__) is the best place to start. The
Swap SDK currently supports 0x v4 on all chains on which the protocol is
deployed. You can find code
examples\ `here <https://docs.swapsdk.xyz/>`__.

NFT Order Formats and Contract Interfaces
-----------------------------------------

For details on order formats and contract interfaces, refer to the
protocol documentation for
`ERC721Orders <../../protocol/docs/exchange-proxy/features/erc721orders.md>`__
and
`ERC1155Orders <../../protocol/docs/exchange-proxy/features/erc1155orders.md>`__.

0x Order Flow Basics
--------------------

For background, all 0x orders are created off-chain, and only the trade
settlement occurs on-chain. Read
`#how-does-0x-work <../../introduction/introduction-to-0x.md#how-does-0x-work>`__
for a more detailed explanation of this paradigm. 

NFT swap orders created on 0x also follow this paradigm. 

For an overview of creating a 0x order and adding NFT Swap functionality
int your DApp, checkout this
`video <https://www.youtube.com/watch?v=oCEU_Jed2Fs>`__.

Basics
------

Users can sign an off-chain order to indicate that they are interested
in:

-  **selling** a particular NFT for some amount of ERC20 token (or ETH),
   or
-  **buying** a particular NFT for some amount of ERC20 token.

There are two Solidity order ``structs``:

-  \`\ ``[``\ ERC721Order`](../../protocol/docs/exchange-proxy/features/erc721orders.md)
   for buying/selling ERC721 assets
-  \`\ ``[``\ ERC1155Order`](https://docs.0x.org/protocol/docs/exchange-proxy/features/erc1155orders)
   for buying/selling ERC1155 assets.

``ERC1155Order`` has one additional field compared to ``ERC721Order``,
used to specify the amount of the ERC1155 being bought or sold. This
would be used for fungible ERC1155 assets.

The ``TradeDirection`` enum is used to indicate whether an order is a
bid or an ask:

.. code:: solidity

   enum TradeDirection {
       SELL_NFT,
       BUY_NFT
   }

Collection Offers
-----------------

In lieu of specifying a particular token ID, buy orders can specify a
list of properties that an NFT asset must satisfy to be used to fill the
order.

These properties are encoded using the following struct:

.. code:: solidity

   struct Property {
       IPropertyValidator propertyValidator;
       bytes propertyData;
   }

where ``propertyValidator`` implements the following function:

.. code:: solidity

   /// @dev Checks that the given ERC721/ERC1155 asset satisfies the properties encoded in `propertyData`.
   ///      Should revert if the asset does not satisfy the specified properties.
   /// @param tokenAddress The ERC721/ERC1155 token contract address.
   /// @param tokenId The ERC721/ERC1155 tokenId of the asset to check.
   /// @param propertyData Encoded properties or auxiliary data needed to perform the check.
   function validateProperty(
       address tokenAddress,
       uint256 tokenId,
       bytes calldata propertyData
   )
       external
       view;

A property validator contract could check that the provided tokenId has
a particular attribute, which would be encoded in ``propertyData``.

Properties are validated as follows:

.. code:: solidity

   // Validate each property
   for (uint256 i = 0; i < order.nftProperties.length; i++) {
       LibNFTOrder.Property memory property = order.nftProperties[i];
       // `address(0)` is interpreted as a no-op. Any token ID
       // will satisfy a property with `propertyValidator == address(0)`.
       if (address(property.propertyValidator) == address(0)) {
           continue;
       }

       // Call the property validator and throw a descriptive error
       // if the call reverts.
       try property.propertyValidator.validateProperty(
           order.nft,
           tokenId,
           property.propertyData
       ) {} catch (bytes memory errorData) {
           LibNFTOrdersRichErrors.PropertyValidationFailedError(
               address(property.propertyValidator),
               order.nft,
               tokenId,
               property.propertyData,
               errorData
           ).rrevert();
       }
   }

By using a single ``Property`` with ``propertyValidator = address(0)``,
one can create “collection” or “floor” orders –– these orders can be
filled using any NFT from a particular collection.

Fees
----

An order can specify fees to be paid out during settlement, denominated
in the ERC20 token of the order. Both ``ERC721Order`` and
``ERC1155Order`` have a ``Fee[] fees`` field, where ``Fee`` is the
following ``struct``:

.. code:: solidity

   struct Fee {
       address recipient;
       uint256 amount;
       bytes feeData;
   }

For each ``Fee`` specified in an order, the **buyer** of the NFT will
pay the fee recipient the given amount of ETH/ERC20 tokens. This is in
*addition* to the ``erc20TokenAmount`` that the buyer is paying for the
NFT itself. There is an optional callback for each fee:

.. code:: solidity

   // Note that the fee callback is _not_ called if zero
   // `feeData` is provided. If `feeData` is provided, we assume
   // the fee recipient is a contract that implements the
   // `IFeeRecipient` interface.
   if (fee.feeData.length > 0) {
       // Invoke the callback
       bytes4 callbackResult = IFeeRecipient(fee.recipient).receiveZeroExFeeCallback(
           useNativeToken ? NATIVE_TOKEN_ADDRESS : address(order.erc20Token),
           feeFillAmount,
           fee.feeData
       );
       // Check for the magic success bytes
       require(
           callbackResult == FEE_CALLBACK_MAGIC_BYTES,
           "NFTOrders::_payFees/CALLBACK_FAILED"
       );
   }

Disbursing multiple fees during order settlement can be costly, so
instead an order can specify a single ``Fee``, the ``recipient`` of
which is a contract that would handle splitting the fee between multiple
recipients using a withdrawal model.

Handling Native Tokens
----------------------

0x V4 gracefully handles wrapping and unwrapping of native tokens. In
the following, we refer to ETH and WETH, but those are interchangeable
with whatever the native token and wrapped native token equivalents are
for your chain of choice (e.g. BNB and WBNB on BSC). 

A **buy** order must use WETH instead of ETH, since we require the ERC20
``transferFrom`` functionality to transfer WETH from the maker to the
taker. Even so, the taker can choose to *receive* ETH when filling a
WETH sell order by setting the ``unwrapNativeToken`` parameter to
``true`` in ``sellERC721`` or ``sellERC1155``.

A **sell** order can specify either ETH or WETH, i.e. the buyer can
indicate whether they would like to receive ETH or WETH. A **WETH** sell
order can be filled by a taker using ETH: the ``buyERC721`` and
``buyERC1155`` functions are ``payable`` and the ``msg.value`` can be
used to fill a WETH sell order.

``onERC721Received`` and ``onERC1155Received``
----------------------------------------------

0x V4 implements the ERC721 and ERC1155 callback functions. If an order
and signature are encoded in the ``data`` parameter of a
``safeTransferFrom`` call, the 0x contract will try to fill the given
order using the NFT asset transferred to it. This allows takers to fill
an NFT buy order without needing to first approving the 0x contract.

Order Matching
--------------

The ``matchERC721Orders`` function can be used to simultaneously fill a
sell order and a buy order if:

-  They are buying/selling the same ERC721 asset, or the sell order is
   selling an asset that satisfies the properties specified by the buy
   order
-  There is a profitable spread (*after* fees), i.e. the following
   quantity is non-negative:
   ``profit = buyOrder.erc20TokenAmount - sellOrder.erc20TokenAmount - sellOrderFees``

Order matching is currently only supported for ERC721 orders. Support
for ERC1155 order matching will be added at a future date if there is
sufficient interest.

On-chain Listings
-----------------

Orders can be simultaneously “signed” and listed on-chain using the
``preSignERC721Order`` or ``preSignERC1155Order`` functions.

If an order has been pre-signed, it can be filled by providing a “null”
signature with the ``PRESIGNED`` signature type (see
`LibSignature.sol <https://github.com/0xProject/protocol/blob/refactor/nft-orders/contracts/zero-ex/contracts/src/features/libs/LibSignature.sol#L42-L61>`__):

.. code:: solidity

   LibSignature.Signature({
      signatureType: LibSignature.SignatureType.PRESIGNED,
      v: uint8(0),
      r: bytes32(0),
      s: bytes32(0)
   });

The pre-sign functions emits the entire order as an event, so that the
order is easily indexable by subgraphs and thus easily discoverable
without the need for an off-chain database.

Smart contracts cannot sign orders in the traditional sense, but the
pre-sign functions enable them to create NFT orders.
