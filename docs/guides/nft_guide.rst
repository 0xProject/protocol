###############################
NFT Guides - Creating Orders
###############################

The easiest way of creating a 0x NFT order is to use the npm packages `@0x/protocol-utils` and `@0x/utils`

>>> yarn add @0x/protocol-utils @0x/utils
or
npm install @0x/protocol-utils @0x/utils


Create an ERC721Order
=====================

The following code snippet shows how to construct a basic ERC721 sell order in JavaScript. In the following example, the seller indicates that they would like to receive ether by providing the sentinel value `0xeee...`` as the `erc20Token`.

.. code-block:: javascript

    const { ERC721Order, NFTOrder } = require("@0x/protocol-utils");
    const utils = require("@0x/utils");

    // Construct sell order
    const sellOrder = new ERC721Order({
        // The EVM blockchain that this order is for, in this case Ethereum mainnet.
        chainId: 1, 
        // The address of the 0x v4 ExchangeProxy contract on Ethereum. 
        verifyingContract: '0xdef1c0ded9bec7f1a1670819833240f027b25eff', 
        // Whether to sell or buy the given NFT
        direction: NFTOrder.TradeDirection.SellNFT,
        // This indicates that the seller would like to receive ETH.
        erc20Token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        // The price, in this case 1 ETH. 
        erc20TokenAmount: utils.BigNumber('1e18'),
        // Address of the ERC721 contract. 
        erc721Token: '0x5180db8f5c931aae63c74266b211f580155ecac8',
        // Token ID of the NFT to sell. 
        erc721TokenId: 123,
        // Address of the seller. This is also the address that will be 
        // signing this order.
        maker: '0x6cc5f688a315f3dc28a7781717a9a798a59fda7b',
        // A null taker address allows anyone to fill this order
        taker: '0x0000000000000000000000000000000000000000',
        // A unique order nonce
        nonce: 420,
        // Order expires in one hour
        expiry: new utils.BigNumber(Math.floor(Date.now() / 1000 + 3600)),
    });

An ERC721 sell order can be created similarly. Note that buy orders must use WETH instead of ether, because the ERC20 `transferFrom` functionality is needed to execute a buy order. 

.. code-block:: javascript

    const { ERC721Order, NFTOrder } = require("@0x/protocol-utils");
    const utils = require("@0x/utils");

    // Construct buy order
    const buyOrder = new ERC721Order({
        // The EVM blockchain that this order is for, in this case Ethereum mainnet.
        chainId: 1, 
        // The address of the 0x v4 ExchangeProxy contract on Ethereum. 
        verifyingContract: '0xdef1c0ded9bec7f1a1670819833240f027b25eff', 
        // Whether to sell or buy the given NFT
        direction: NFTOrder.TradeDirection.BuyNFT,
        // Address of the ERC20 token to buy with, in this case WETH. 
        erc20Token: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        // The price, in this case 1 WETH. 
        erc20TokenAmount: utils.BigNumber('1e18'),
        // Address of the ERC721 contract. 
        erc721Token: '0x5180db8f5c931aae63c74266b211f580155ecac8',
        // Token ID of the NFT to buy. 
        erc721TokenId: 234,
        // Address of the buyer. This is also the address that will be 
        // signing this order.
        maker: '0x6cc5f688a315f3dc28a7781717a9a798a59fda7b',
        // A null taker address allows anyone to fill this order
        taker: '0x0000000000000000000000000000000000000000',
        // A unique order nonce
        nonce: 421,
        // Order expires in one hour
        expiry: new utils.BigNumber(Math.floor(Date.now() / 1000 + 3600)),
    });

**Choosing a nonce**

If two orders signed by the same maker have the same nonce, filling or cancelling one can result in the other becoming unfillable. 

::

    Two ERC721 orders with the same nonce cannot both be filled, but two ERC1155 orders with the same nonce can both be filled (as long as the orders are not identical). 

You can use a pseudorandom value or the current timestamp as the order nonce, but nonces can be chosen in a specific way to enable more gas-efficient fills and cancellations. See `Smart Nonces <./smart_nonce.rst>`_ for explanation.

We recommend using the most significant 128 bits of the nonce as an application/marketplace identifier. The least significant 128 bits of the nonce can be incremented from 0 for each order created by a particular maker. 

**Royalties and Fees**

0x V4 has flexible support for creator royalties and platform fees. Marketplaces can pay out royalties to creators in real-time, and even have the option to send fees to their own custom fee disbursement contract. 
Fees are paid by the **buyer**, denominated in the asset paid by the buyer, and are paid **in addition** to the `erc20TokenAmount` specified in the order. 
The following code snippet shows how to create an ERC721 order with a single fee. Multiple fees can be specified by providing multiple fee objects in the order fees field.

.. code-block:: javascript

    const { ERC721Order, NFTOrder } = require("@0x/protocol-utils");
    const utils = require("@0x/utils");

    const fee = {
        // Address to receive the fee. Can be a smart contract.
        recipient: '0x871dd7c2b4b25e1aa18728e9d5f2af4c4e431f5c', 
        amount: utils.BigNumber('1e17'), // 0.1 ETH
        // If the fee recipient is a contract, this field can be used
        // to invoke a callback. In this case, there is no callback. 
        feeData: '0x',
    };

    // Construct sell order
    const order = new ERC721Order({
        chainId: 1, 
        verifyingContract: '0xdef1c0ded9bec7f1a1670819833240f027b25eff', 
        direction: NFTOrder.TradeDirection.SellNFT,
        erc20Token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        erc20TokenAmount: utils.BigNumber('1e18'),
        erc721Token: '0x5180db8f5c931aae63c74266b211f580155ecac8',
        erc721TokenId: 123,
        maker: '0x6cc5f688a315f3dc28a7781717a9a798a59fda7b',
        taker: '0x0000000000000000000000000000000000000000',
        fees: [fee],
        nonce: 420,
        expiry: new utils.BigNumber(Math.floor(Date.now() / 1000 + 3600)),
    });

**Collection Offers**

In 0x V4, it is possible to create a bid for any NFT in a particular collection. The following code snippet shows how to create an order to buy any CryptoCoven $WITCH. 

.. code-block:: javascript

    const { ERC721Order, NFTOrder } = require("@0x/protocol-utils");
    const utils = require("@0x/utils");

    const property = {
        // Providing `address(0)` and `0x` serves as the sentinel 
        // values for a "null property", i.e. any token ID from the 
        // given collection can be used to fill the order.
        propertyValidator: '0x0000000000000000000000000000000000000000', 
        propertyData: '0x',
    };

    // Construct sell order
    const order = new ERC721Order({
        chainId: 1, 
        verifyingContract: '0xdef1c0ded9bec7f1a1670819833240f027b25eff', 
        direction: NFTOrder.TradeDirection.SellNFT,
        erc20Token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        erc20TokenAmount: utils.BigNumber('1e18'),
        erc721Token: '0x5180db8f5c931aae63c74266b211f580155ecac8',
        // If one or more properties are specified in the order, the 
        // `erc721TokenId` must be 0.
        erc721TokenId: 0,
        maker: '0x6cc5f688a315f3dc28a7781717a9a798a59fda7b',
        taker: '0x0000000000000000000000000000000000000000',
        erc721TokenProperties: [property],
        nonce: 420,
        expiry: new utils.BigNumber(Math.floor(Date.now() / 1000 + 3600)),
    }

Sign an ERC721 Order
====================

Off-chain orders must be signed by the order maker to be filled. For on-chain orders, refer to the next section. 

**Signing with a private key**

Signing an order with a private key is easy: the `ERC721Order` and `ERC1155Order` classes from `@0x/protocol-utils` expose a `getSignatureWithKey` function that take a 0x-prefixed private key string.

.. code-block:: javascript

    const { ERC721Order, NFTOrder, SignatureType } = require("@0x/protocol-utils");
    const utils = require("@0x/utils");

    // Construct order
    const order = new ERC721Order({
        chainId: 1, 
        verifyingContract: '0xdef1c0ded9bec7f1a1670819833240f027b25eff', 
        direction: NFTOrder.TradeDirection.SellNFT,
        erc20Token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        erc20TokenAmount: utils.BigNumber('1e18'),
        erc721Token: '0x5180db8f5c931aae63c74266b211f580155ecac8',
        erc721TokenId: 123,
        maker: '0x6cc5f688a315f3dc28a7781717a9a798a59fda7b',
        taker: '0x0000000000000000000000000000000000000000',
        nonce: 420,
        expiry: new utils.BigNumber(Math.floor(Date.now() / 1000 + 3600)),
    });

    // Sign order with private key
    const signature = await order.getSignatureWithKey(
        PRIVATE_KEY, // '0x123456789...'
        SignatureType.EIP712
    );

**Signing with ethers**

.. code-block:: javascript

    const { ERC721Order, NFTOrder, SignatureType } = require("@0x/protocol-utils");
    const utils = require("@0x/utils");
    const { ethers } = require("ethers");

    // Construct order
    const order = new ERC721Order({
        chainId: 1, 
        verifyingContract: '0xdef1c0ded9bec7f1a1670819833240f027b25eff', 
        direction: NFTOrder.TradeDirection.SellNFT,
        erc20Token: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        erc20TokenAmount: utils.BigNumber('1e18'),
        erc721Token: '0x5180db8f5c931aae63c74266b211f580155ecac8',
        erc721TokenId: 123,
        maker: '0x6cc5f688a315f3dc28a7781717a9a798a59fda7b',
        taker: '0x0000000000000000000000000000000000000000',
        nonce: 420,
        expiry: new utils.BigNumber(Math.floor(Date.now() / 1000 + 3600)),
    });

    // Get ethers Signer
    const provider = new ethers.providers.JsonRpcProvider(/* constructor params */);
    const signer = provider.getSigner(/* address */);

    const { domain, message } = order.getEIP712TypedData();
    const types = {
        [ERC721Order.STRUCT_NAME]: ERC721Order.STRUCT_ABI,
        ['Fee']: NFTOrder.FEE_ABI,
        ['Property']: NFTOrder.PROPERTY_ABI,
    };
    const rawSignature = await signer._signTypedData(
        domain,
        types,
        message
    );
    const { v, r, s } = ethers.utils.splitSignature(rawSignature);
    const signature = { 
        v,
        r, 
        s,
        signatureType: 2
    };

**On-chain Orders**

Orders can be simultaneously "signed" and listed on-chain using the `preSignERC721Order` or `preSignERC1155Order` functions. Orders can only be signed by the maker address specified in the order. 

.. code-block:: solidity

    /// @dev Approves an ERC721 order on-chain. After pre-signing
    ///      the order, the `PRESIGNED` signature type will become
    ///      valid for that order and signer.
    /// @param order An ERC721 order.
    function preSignERC721Order(LibNFTOrder.ERC721Order calldata order)
        external;
        
    /// @dev Approves an ERC1155 order on-chain. After pre-signing
    ///      the order, the `PRESIGNED` signature type will become
    ///      valid for that order and signer.
    /// @param order An ERC1155 order.
    function preSignERC1155Order(LibNFTOrder.ERC1155Order calldata order)
        external;

If an order has been pre-signed, it can be filled by providing a “null” signature with the PRESIGNED signature type (see `LibSignature.sol <https://github.com/0xProject/protocol/blob/refactor/nft-orders/contracts/zero-ex/contracts/src/features/libs/LibSignature.sol#L42-L61>`_):

.. code-block:: solidity

    LibSignature.Signature({
    signatureType: LibSignature.SignatureType.PRESIGNED,
    v: uint8(0),
    r: bytes32(0),
    s: bytes32(0)
    });

The pre-sign functions emit the entire order as an event, so that the order is easily indexable by subgraphs and thus easily indexable by subgraphs and thus easily discoverable without the need for an off-chain database.

.. code-block:: solidity

    /// @dev Emitted when an `ERC721Order` is pre-signed.
    ///      Contains all the fields of the order.
    event ERC721OrderPreSigned(
        LibNFTOrder.TradeDirection direction,
        address maker,
        address taker,
        uint256 expiry,
        uint256 nonce,
        IERC20TokenV06 erc20Token,
        uint256 erc20TokenAmount,
        LibNFTOrder.Fee[] fees,
        IERC721Token erc721Token,
        uint256 erc721TokenId,
        LibNFTOrder.Property[] erc721TokenProperties
    );

    /// @dev Emitted when an `ERC1155Order` is pre-signed.
    ///      Contains all the fields of the order.
    event ERC1155OrderPreSigned(
        LibNFTOrder.TradeDirection direction,
        address maker,
        address taker,
        uint256 expiry,
        uint256 nonce,
        IERC20TokenV06 erc20Token,
        uint256 erc20TokenAmount,
        LibNFTOrder.Fee[] fees,
        IERC1155Token erc1155Token,
        uint256 erc1155TokenId,
        LibNFTOrder.Property[] erc1155TokenProperties,
        uint128 erc1155TokenAmount
    );

The pre-sign functions also enable smart contracts to create and "sign" NFT orders, opening the door for potential integrations with e.g. multisig wallets.

Filling an ERC721 Order
=======================

The basic functions used for filling NFT orders are the following:

.. code-block:: solidity

    /// @dev Sells an ERC721 asset to fill the given order.
    /// @param buyOrder The ERC721 buy order.
    /// @param signature The order signature from the maker.
    /// @param erc721TokenId The ID of the ERC721 asset being
    ///        sold. If the given order specifies properties,
    ///        the asset must satisfy those properties. Otherwise,
    ///        it must equal the tokenId in the order.
    /// @param unwrapNativeToken If this parameter is true and the
    ///        ERC20 token of the order is e.g. WETH, unwraps the
    ///        token before transferring it to the taker.
    /// @param callbackData If this parameter is non-zero, invokes
    ///        `zeroExERC721OrderCallback` on `msg.sender` after
    ///        the ERC20 tokens have been transferred to `msg.sender`
    ///        but before transferring the ERC721 asset to the buyer.
    function sellERC721(
        LibNFTOrder.ERC721Order calldata buyOrder,
        LibSignature.Signature calldata signature,
        uint256 erc721TokenId,
        bool unwrapNativeToken,
        bytes calldata callbackData
    )
        external;

    /// @dev Buys an ERC721 asset by filling the given order.
    /// @param sellOrder The ERC721 sell order.
    /// @param signature The order signature.
    /// @param callbackData If this parameter is non-zero, invokes
    ///        `zeroExERC721OrderCallback` on `msg.sender` after
    ///        the ERC721 asset has been transferred to `msg.sender`
    ///        but before transferring the ERC20 tokens to the seller.
    ///        Native tokens acquired during the callback can be used
    ///        to fill the order.
    function buyERC721(
        LibNFTOrder.ERC721Order calldata sellOrder,
        LibSignature.Signature calldata signature,
        bytes calldata callbackData
    )
        external
        payable;
        
    /// @dev Sells an ERC1155 asset to fill the given order.
    /// @param buyOrder The ERC1155 buy order.
    /// @param signature The order signature from the maker.
    /// @param erc1155TokenId The ID of the ERC1155 asset being
    ///        sold. If the given order specifies properties,
    ///        the asset must satisfy those properties. Otherwise,
    ///        it must equal the tokenId in the order.
    /// @param erc1155SellAmount The amount of the ERC1155 asset
    ///        to sell.
    /// @param unwrapNativeToken If this parameter is true and the
    ///        ERC20 token of the order is e.g. WETH, unwraps the
    ///        token before transferring it to the taker.
    /// @param callbackData If this parameter is non-zero, invokes
    ///        `zeroExERC1155OrderCallback` on `msg.sender` after
    ///        the ERC20 tokens have been transferred to `msg.sender`
    ///        but before transferring the ERC1155 asset to the buyer.
    function sellERC1155(
        LibNFTOrder.ERC1155Order calldata buyOrder,
        LibSignature.Signature calldata signature,
        uint256 erc1155TokenId,
        uint128 erc1155SellAmount,
        bool unwrapNativeToken,
        bytes calldata callbackData
    )
        external;

    /// @dev Buys an ERC1155 asset by filling the given order.
    /// @param sellOrder The ERC1155 sell order.
    /// @param signature The order signature.
    /// @param erc1155BuyAmount The amount of the ERC1155 asset
    ///        to buy.
    /// @param callbackData If this parameter is non-zero, invokes
    ///        `zeroExERC1155OrderCallback` on `msg.sender` after
    ///        the ERC1155 asset has been transferred to `msg.sender`
    ///        but before transferring the ERC20 tokens to the seller.
    ///        Native tokens acquired during the callback can be used
    ///        to fill the order.
    function buyERC1155(
        LibNFTOrder.ERC1155Order calldata sellOrder,
        LibSignature.Signature calldata signature,
        uint128 erc1155BuyAmount,
        bytes calldata callbackData
    )
        external
        payable;

`sellERC721` and `sellERC1155` are used when the caller is **selling** an NFT, so the order being filled is a **buy** order.
`buyERC721` and `buyERC1155` are used when the caller is **buying** an NFT, so the order being filled is a **sell** order. 
Note that the only difference in parameters between the ERC721 and ERC1155 functions is `erc1155BuyAmount`. This value specifies the amount of the ERC1155 asset to sell/buy from the given order, which may be greater than one in the case of semi-fungible ERC1155 assets.

Cancelling an ERC721 Order
==========================

All orders, whether off-chain or on-chain, can only be cancelled on-chain. The following contract functions are used to cancel individual ERC721 and ERC1155 orders. 

.. code-block:: solidity

    /// @dev Cancel a single ERC721 order by its nonce. The caller
    ///      should be the maker of the order. Silently succeeds if
    ///      an order with the same nonce has already been filled or
    ///      cancelled.
    /// @param orderNonce The order nonce.
    function cancelERC721Order(uint256 orderNonce)
        external;

    /// @dev Cancel a single ERC1155 order by its nonce. The caller
    ///      should be the maker of the order. Silently succeeds if
    ///      an order with the same nonce has already been filled or
    ///      cancelled.
    /// @param orderNonce The order nonce.
    function cancelERC1155Order(uint256 orderNonce)
        external;

Note that if there are multiple outstanding orders with the same nonce, calling `cancelERC721Order` or `cancelERC1155Order` would cancel all those orders.
The following functions can be used to cancel multiple orders.

.. code-block:: solidity
    
    /// @dev Cancel multiple ERC721 orders by their nonces. The caller
    ///      should be the maker of the orders. Silently succeeds if
    ///      an order with the same nonce has already been filled or
    ///      cancelled.
    /// @param orderNonces The order nonces.
    function batchCancelERC721Orders(uint256[] calldata orderNonces)
        external;
        
    /// @dev Cancel multiple ERC1155 orders by their nonces. The caller
    ///      should be the maker of the orders. Silently succeeds if
    ///      an order with the same nonce has already been filled or
    ///      cancelled.
    /// @param orderNonces The order nonces.
    function batchCancelERC1155Orders(uint256[] calldata orderNonces)
        external;

Fetching NFT Order Data
=======================

To fetch collection-level NFT stats from 0x orders (e.g. floor price, total volume), checkout the following tools:

- `https://module.readme.io/reference/retrieve-collection-floor <https://module.readme.io/reference/retrieve-collection-floor>`_
- `https://api.reservoir.tools/#/2.%20Aggregator/getEventsCollectionsFlooraskV1 <https://api.reservoir.tools/#/2.%20Aggregator/getEventsCollectionsFlooraskV1>`_

These tools are not 0x specific but NFT data is somewhat universal so these tools should do the trick.