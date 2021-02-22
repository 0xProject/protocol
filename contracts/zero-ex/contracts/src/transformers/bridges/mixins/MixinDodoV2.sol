// SPDX-License-Identifier: Apache-2.0

/*

  Copyright 2021 ZeroEx Intl.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.

*/

pragma solidity ^0.6.5;
pragma experimental ABIEncoderV2;

import "@0x/contracts-erc20/contracts/src/v06/LibERC20TokenV06.sol";
import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";
import "../IBridgeAdapter.sol";


interface IDODOV2 {
    function sellBase(address recipient)
        external
        returns (uint256);

    function sellQuote(address recipient)
        external
        returns (uint256);
}


contract MixinDodoV2 {

    using LibERC20TokenV06 for IERC20TokenV06;

    function _tradeDodoV2(
        IERC20TokenV06 sellToken,
        uint256 sellAmount,
        bytes memory bridgeData
    )
        internal
        returns (uint256 boughtAmount)
    {
        (IDODOV2 pool, bool isSellBase) =
            abi.decode(bridgeData, (IDODOV2, bool));

        // Transfer the tokens into the pool
        sellToken.compatTransfer(address(pool), sellAmount);

        boughtAmount = isSellBase ?
            pool.sellBase(address(this))
            : pool.sellQuote(address(this));
    }
}
