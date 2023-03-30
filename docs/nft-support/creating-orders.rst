Creating Orders
===============

The easiest way of creating a 0x NFT order is to use the npm packages
```@0x/protocol-utils`` <https://www.npmjs.com/package/@0x/protocol-utils>`__
and ```@0x/utils`` <https://www.npmjs.com/package/@0x/utils>`__

.. code:: bash

   yarn add @0x/protocol-utils @0x/utils
   or
   npm install @0x/protocol-utils @0x/utils

Create an ERC721Order
---------------------

The following code snippet shows how to construct a basic ERC721 sell
order in JavaScript. In the following example, the seller indicates that
they would like to receive ether by providing the sentinel value
``0xeee...`` as the ``erc20Token``. 

.. code:: javascript

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

An ERC721 sell order can be created similarly. Note that buy orders must
use WETH instead of ether, because the ERC20 ``transferFrom``
functionality is needed to execute a buy order. 

.. code:: javascript

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

Choosing a nonce
----------------

If two orders signed by the same maker have the same nonce, filling or
cancelling one can result in the other becoming unfillable. 

{% hint style=“warning” %} Two ERC721 orders with the same nonce cannot
both be filled, but two ERC1155 orders with the same nonce **can** both
be filled (as long as the orders are not identical).  {% endhint %}

You can use a pseudorandom value or the current timestamp as the order
nonce, but nonces can be chosen in a specific way to enable more
gas-efficient fills and cancellations. See `Smart
Nonces <../../../protocol/docs/exchange-proxy/features/erc721orders.md#smart-nonces>`__
for explanation.

We recommend using the most significant 128 bits of the nonce as an
application/marketplace identifier. The least significant 128 bits of
the nonce can be incremented from 0 for each order created by a
particular maker. 
