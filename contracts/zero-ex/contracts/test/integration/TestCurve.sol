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

import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";
import "../tokens/TestMintableERC20Token.sol";

contract TestCurve {
    event CurveCalled(
        uint256 value,
        bytes4 selector,
        int128 fromCoinIdx,
        int128 toCoinIdx,
        uint256 sellAmount,
        uint256 minBuyAmount
    );

    // The lower 16 bits of the selector are reserved for flags.
    bytes4 public constant BASE_SWAP_SELECTOR = 0x12340000;
    bytes4 public constant RETURN_BOUGHT_AMOUNT_SELECTOR_FLAG = 0x00000001;

    int128 public constant SELL_TOKEN_COIN_IDX = 0;
    int128 public constant BUY_TOKEN_COIN_IDX = 1;
    int128 public constant ETH_COIN_IDX = 2;

    uint256 public buyAmount;
    IERC20TokenV06 public sellToken;
    TestMintableERC20Token public buyToken;

    constructor(
        IERC20TokenV06 sellToken_,
        TestMintableERC20Token buyToken_,
        uint256 buyAmount_
    ) public payable {
        sellToken = sellToken_;
        buyToken = buyToken_;
        buyAmount = buyAmount_;
    }

    receive() external payable {}

    fallback() external payable {
        bytes4 selector = abi.decode(msg.data, (bytes4));
        bool shouldReturnBoughtAmount = (selector &
            RETURN_BOUGHT_AMOUNT_SELECTOR_FLAG) != 0x0;
        bytes4 baseSelector = selector & 0xffff0000;
        require(baseSelector == BASE_SWAP_SELECTOR, "TestCurve/REVERT");
        (
            int128 fromCoinIdx,
            int128 toCoinIdx,
            uint256 sellAmount,
            uint256 minBuyAmount
        ) = abi.decode(msg.data[4:], (int128, int128, uint256, uint256));
        if (fromCoinIdx == SELL_TOKEN_COIN_IDX) {
            sellToken.transferFrom(msg.sender, address(this), sellAmount);
        }
        if (toCoinIdx == BUY_TOKEN_COIN_IDX) {
            buyToken.mint(msg.sender, buyAmount);
        } else if (toCoinIdx == ETH_COIN_IDX) {
            msg.sender.transfer(buyAmount);
        }
        emit CurveCalled(
            msg.value,
            selector,
            fromCoinIdx,
            toCoinIdx,
            sellAmount,
            minBuyAmount
        );
        if (shouldReturnBoughtAmount) {
            assembly {
                mstore(0, sload(buyAmount_slot))
                return(0, 32)
            }
        }
        assembly {
            return(0, 0)
        }
    }
}
