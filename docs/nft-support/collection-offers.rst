Collection Offers
=================

In 0x V4, it is possible to create a bid for any NFT in a particular
collection. The following code snippet shows how to create an order to
buy any CryptoCoven $WITCH. 

.. code:: javascript

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
