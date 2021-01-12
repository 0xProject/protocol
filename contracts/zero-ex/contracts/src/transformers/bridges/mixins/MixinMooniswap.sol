// SPDX-License-Identifier: Apache-2.0

/*

  Copyright 2020 ZeroEx Intl.

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
import "@0x/contracts-erc20/contracts/src/v06/IEtherTokenV06.sol";
import "../IBridgeAdapter.sol";


/// @dev Moooniswap pool interface.
interface IMooniswapPool {

    function swap(
        IERC20TokenV06 sellToken,
        IERC20TokenV06 buyToken,
        uint256 sellAmount,
        uint256 minBoughtAmount,
        address referrer
    )
        external
        payable
        returns (uint256 boughtAmount);
}

/// @dev BridgeAdapter mixin for mooniswap.
contract MixinMooniswap {

    using LibERC20TokenV06 for IERC20TokenV06;
    using LibERC20TokenV06 for IEtherTokenV06;

    /// @dev WETH token.
    IEtherTokenV06 private immutable WETH;

    constructor(IEtherTokenV06 weth)
        public
    {
        WETH = weth;
    }

    function _tradeMooniswap(
        IERC20TokenV06 sellToken,
        IERC20TokenV06 buyToken,
        uint256 sellAmount,
        bytes memory bridgeData
    )
        internal
        returns (uint256 boughtAmount)
    {
        (IMooniswapPool pool) = abi.decode(bridgeData, (IMooniswapPool));

        // Convert WETH to ETH.
        uint256 ethValue = 0;
        if (sellToken == WETH) {
            WETH.withdraw(sellAmount);
            ethValue = sellAmount;
        } else {
            // Grant the pool an allowance.
            sellToken.approveIfBelow(
                address(pool),
                sellAmount
            );
        }

        boughtAmount = pool.swap{value: ethValue}(
            sellToken == WETH ? IERC20TokenV06(0) : sellToken,
            buyToken == WETH ? IERC20TokenV06(0) : buyToken,
            sellAmount,
            1,
            address(0)
        );

        // Wrap ETH to WETH.
        if (buyToken == WETH) {
            WETH.deposit{value:boughtAmount}();
        }
    }
}
