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

pragma solidity ^0.6;
pragma experimental ABIEncoderV2;

import "@0x/contracts-erc20/contracts/src/v06/LibERC20TokenV06.sol";
import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";
import "@0x/contracts-erc20/contracts/src/v06/IEtherTokenV06.sol";
import "../IBridgeAdapter.sol";
import "@0x/contracts-utils/contracts/src/v06/LibSafeMathV06.sol";

/// @dev WooFI pool interface.
interface IWooPP {
    function quoteToken() external view returns (address);

    function sellBase(
        address baseToken,
        uint256 baseAmount,
        uint256 minQuoteAmount,
        address to,
        address rebateTo
    ) external returns (uint256 quoteAmount);

    function sellQuote(
        address baseToken,
        uint256 quoteAmount,
        uint256 minBaseAmount,
        address to,
        address rebateTo
    ) external returns (uint256 baseAmount);

    /// @dev Query the amount for selling the base token amount.
    /// @param baseToken the base token to sell
    /// @param baseAmount the amount to sell
    /// @return quoteAmount the swapped quote amount
    function querySellBase(address baseToken, uint256 baseAmount) external view returns (uint256 quoteAmount);
}

contract MixinWOOFi {
    using LibERC20TokenV06 for IERC20TokenV06;
    using LibERC20TokenV06 for IEtherTokenV06;
    using LibSafeMathV06 for uint256;

    address constant rebateAddress = 0xBfdcBB4C05843163F491C24f9c0019c510786304;

    // /// @dev Swaps an exact amount of input tokens for as many output tokens as possible.
    // /// @param _amountIn Amount of input tokens to send
    // /// @param _minAmountOut The minimum amount of output tokens that must be received for the transaction not to revert.
    // /// @param _tokenIn Input token
    // /// @param _tokenOut Output token
    // /// @param _to recipient of tokens
    // /// @param pool WOOFi pool where the swap will happen
    function _tradeWOOFi(
        IERC20TokenV06 sellToken,
        IERC20TokenV06 buyToken,
        uint256 sellAmount,
        bytes memory bridgeData
    ) public returns (uint256 boughtAmount) {
        IWooPP _pool = abi.decode(bridgeData, (IWooPP));
        uint256 beforeBalance = buyToken.balanceOf(address(this));

        sellToken.approveIfBelow(address(_pool), sellAmount);

        _swap(sellAmount, address(sellToken), address(buyToken), _pool);
        boughtAmount = buyToken.balanceOf(address(this)).safeSub(beforeBalance);
    }

    function _swap(
        uint256 _amountIn,
        address _tokenIn,
        address _tokenOut,
        IWooPP pool
    ) internal {
        address quoteToken = pool.quoteToken();
        if (_tokenIn == quoteToken) {
            pool.sellQuote(_tokenOut, _amountIn, 1, address(this), rebateAddress);
        } else if (_tokenOut == quoteToken) {
            pool.sellBase(_tokenIn, _amountIn, 1, address(this), rebateAddress);
        } else {
            uint256 quoteAmount = pool.sellBase(_tokenIn, _amountIn, 0, address(this), rebateAddress);
            IERC20TokenV06(pool.quoteToken()).approveIfBelow(address(pool), quoteAmount);
            pool.sellQuote(_tokenOut, quoteAmount, 1, address(this), rebateAddress);
        }
    }
}
