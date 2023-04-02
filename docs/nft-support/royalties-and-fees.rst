Royalties and Fees
=================

0x V4 has flexible support for creator royalties and platform fees. Marketplaces can pay out royalties to creators in real-time, and even have the option to send fees to their own custom fee disbursement contract. 

Fees are paid by the **buyer**, denominated in the asset paid by the buyer, and are paid **in addition** to the ``erc20TokenAmount`` specified in the order. 

The following code snippet shows how to create an ERC721 order with a single fee. Multiple fees can be specified by providing multiple fee objects in the order ``fees`` field.

.. code:: javascript

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
