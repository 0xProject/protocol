Generating 0x Order Hashes
==========================

A 0x Order Hash acts as both the *identifier* for a 0x order, as well as
the *message* that gets signed to authorize the 0x smart contracts to
perform swaps.

0x Order Hashes are `EIP-712
hashes <https://eips.ethereum.org/EIPS/eip-712>`__.

Generating 0x Order Hashes with @0x/protocol-utils
--------------------------------------------------

The easiest way of generating 0x Order Hashes is using the npm packages
```@0x/protocol-utils`` <https://www.npmjs.com/package/@0x/protocol-utils>`__
and ```@0x/utils`` <https://www.npmjs.com/package/@0x/utils>`__\ \`\`

.. code:: bash

   yarn add @0x/protocol-utils @0x/utils

Use as follows:

.. code:: javascript

   const protocolUtils = require("@0x/protocol-utils");
   const utils = require("@0x/utils");

   // Construct Order
   const order = new protocolUtils.LimitOrder({ // or protocolUtils.RfqOrder
       makerToken: '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
       takerToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
       makerAmount: new utils.BigNumber(1e18),
       takerAmount: new utils.BigNumber(1e18),
       ... // Other fields
   })

   // Get hash
   const orderHash = order.getHash();

Protocol Utils supports the following order types:

-  ``LimitOrder``
-  ``RfqOrder``
-  ``OtcOrder``

As more order types are added to the protocol, this library will expand
to cover them as well.
