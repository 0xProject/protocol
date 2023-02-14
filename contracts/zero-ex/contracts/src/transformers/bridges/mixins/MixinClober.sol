// SPDX-License-Identifier: Apache-2.0
/*
  Copyright 2023 ZeroEx Intl.
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
import "@0x/contracts-utils/contracts/src/v06/LibSafeMathV06.sol";

interface ICloberOrderBook {
    function quoteToRaw(uint256 quoteAmount, bool roundingUp) external view returns (uint64 rawAmount);
}

interface ICloberRouter {
    struct MarketOrderParams {
        address market;
        uint64 deadline;
        address user;
        uint16 limitPriceIndex;
        uint64 rawAmount;
        bool expendInput;
        bool useNative;
        uint256 baseAmount;
    }

    function marketBid(MarketOrderParams calldata params) external payable;

    function marketAsk(MarketOrderParams calldata params) external payable;
}

contract MixinClober {
    using LibERC20TokenV06 for IERC20TokenV06;
    using LibSafeMathV06 for uint256;

    IEtherTokenV06 private immutable WETH;

    constructor(IEtherTokenV06 weth) public {
        WETH = weth;
    }

    function _tradeClober(
        IERC20TokenV06 sellToken,
        IERC20TokenV06 buyToken,
        uint256 sellAmount,
        bytes memory bridgeData
    ) internal returns (uint256 boughtAmount) {
        (ICloberRouter router, ICloberOrderBook market, bool isTakingBid) = abi.decode(
            bridgeData,
            (ICloberRouter, ICloberOrderBook, bool)
        );

        // Grant the Clober router an allowance to sell the sell token.
        sellToken.approveIfBelow(address(router), sellAmount);

        ICloberRouter.MarketOrderParams memory params = ICloberRouter.MarketOrderParams({
            market: address(market),
            deadline: uint64(block.timestamp + 100),
            user: msg.sender,
            limitPriceIndex: isTakingBid ? 0 : type(uint16).max,
            rawAmount: isTakingBid ? 0 : market.quoteToRaw(sellAmount, true),
            expendInput: true,
            useNative: address(sellToken) == address(WETH) ? true : false,
            baseAmount: isTakingBid ? sellAmount : 0
        });

        uint256 beforeBalance = buyToken.balanceOf(address(this));
        if (isTakingBid) {
            router.marketAsk(params);
        } else {
            router.marketBid(params);
        }
        return buyToken.balanceOf(address(this)).safeSub(beforeBalance);
    }
}
