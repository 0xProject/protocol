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
import "@0x/contracts-erc20/contracts/src/v06/IEtherTokenV06.sol";
import "../IBridgeAdapter.sol";
import "../../../vendor/ILiquidityProvider.sol";

contract MixinClipper {

    using LibERC20TokenV06 for IERC20TokenV06;

    /// @dev Mainnet address of the WETH contract.
    IEtherTokenV06 private immutable WETH;

    constructor(IEtherTokenV06 weth)
        public
    {
        WETH = weth;
    }

    function _tradeClipper(
        IERC20TokenV06 sellToken,
        IERC20TokenV06 buyToken,
        uint256 sellAmount,
        bytes memory bridgeData
    )
        internal
        returns (uint256 boughtAmount)
    {
        // We can only use ETH with Clipper, no WETH available
        (ILiquidityProvider clipper, bytes memory auxiliaryData) =
            abi.decode(bridgeData, (ILiquidityProvider, bytes));

        if (sellToken == WETH) {
            boughtAmount = _executeSellEthForToken(
                clipper,
                buyToken,
                sellAmount,
                auxiliaryData
            );
        } else if (buyToken == WETH) {
            boughtAmount = _executeSellTokenForEth(
                clipper,
                sellToken,
                sellAmount,
                auxiliaryData
            );
        } else {
            boughtAmount = _executeSellTokenForToken(
                clipper,
                sellToken,
                buyToken,
                sellAmount,
                auxiliaryData
            );
        }

        return boughtAmount;
    }

    function _executeSellEthForToken(
        ILiquidityProvider clipper,
        IERC20TokenV06 buyToken,
        uint256 sellAmount,
        bytes memory auxiliaryData
    )
        private
        returns (uint256 boughtAmount)
    {
        // Clipper requires ETH and doesn't support WETH
        WETH.withdraw(sellAmount);
        boughtAmount = clipper.sellEthForToken{ value: sellAmount }(
            buyToken,
            address(this),
            1,
            auxiliaryData
        );
    }

    function _executeSellTokenForEth(
        ILiquidityProvider clipper,
        IERC20TokenV06 sellToken,
        uint256 sellAmount,
        bytes memory auxiliaryData
    )
        private
        returns (uint256 boughtAmount)
    {
        // Optimization: We can transfer the tokens into clipper rather than
        // have an allowance updated
        sellToken.compatTransfer(address(clipper), sellAmount);

        boughtAmount = clipper.sellTokenForEth(
            sellToken,
            payable(address(this)),
            1,
            auxiliaryData
        );

        // we want WETH for possible future trades
        WETH.deposit{ value: boughtAmount }();
    }

    function _executeSellTokenForToken(
        ILiquidityProvider clipper,
        IERC20TokenV06 sellToken,
        IERC20TokenV06 buyToken,
        uint256 sellAmount,
        bytes memory auxiliaryData
    )
        private
        returns (uint256 boughtAmount)
    {
        // Optimization: We can transfer the tokens into clipper rather than
        // have an allowance updated
        sellToken.compatTransfer(address(clipper), sellAmount);

        boughtAmount = clipper.sellTokenForToken(
            sellToken,
            buyToken,
            address(this),
            1,
            auxiliaryData
        );
    }
}
