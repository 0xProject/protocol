Signing Orders
==============

Off-chain orders must be signed by the order maker to be filled. For
on-chain orders, refer to the next section. 

Signing with a private key
--------------------------

Signing an order with a private key is easy: the ``ERC721Order`` and
``ERC1155Order`` classes from ``@0x/protocol-utils`` expose a
``getSignatureWithKey`` function that take a ``0x``-prefixed private key
string.

.. code:: javascript

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

Signing with ethers
-------------------

.. code:: javascript

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
