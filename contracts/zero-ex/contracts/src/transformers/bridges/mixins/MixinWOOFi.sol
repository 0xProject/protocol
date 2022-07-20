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
    function quoteToken() external view returns (IERC20TokenV06);

    function sellBase(
        IERC20TokenV06 baseToken,
        uint256 baseAmount,
        uint256 minQuoteAmount,
        address to,
        address rebateTo
    ) external returns (uint256 quoteAmount);
    function sellQuote(
        IERC20TokenV06 baseToken,
        uint256 quoteAmount,
        uint256 minBaseAmount,
        address to,
        address rebateTo
    ) external returns (uint256 baseAmount);

}

contract MixinWOOFi{

    using LibERC20TokenV06 for IERC20TokenV06;
    using LibERC20TokenV06 for IEtherTokenV06;
    using LibSafeMathV06 for uint256;

    uint internal constant UINT_MAX = type(uint).max;

    // /// @dev Swaps an exact amount of input tokens for as many output tokens as possible.
    // /// @param _amountIn Amount of input tokens to send
    // /// @param _minAmountOut The minimum amount of output tokens that must be received for the transaction not to revert.
    // /// @param _tokenIn Input token
    // /// @param _tokenOut Output token
    // /// @param _to recipient of tokens
    // /// @param pool WOOFi pool where the swap will happen
    function _swap(
        uint _amountIn, 
        uint _minAmountOut, 
        IERC20TokenV06 _tokenIn, 
        IERC20TokenV06 _tokenOut, 
        address _to,
        address pool
    ) internal {
        uint realToAmount;
        IERC20TokenV06 quoteToken = IWooPP(pool).quoteToken();
        if (_tokenIn == quoteToken) {
            realToAmount = IWooPP(pool).sellQuote(
                _tokenOut,
                _amountIn,
                _minAmountOut,
                _to,
                0xBfdcBB4C05843163F491C24f9c0019c510786304
            );
        } else if (_tokenOut == quoteToken) {
            realToAmount = IWooPP(pool).sellBase(
                _tokenIn, 
                _amountIn, 
                _minAmountOut, 
                _to, 
                0xBfdcBB4C05843163F491C24f9c0019c510786304
            );
        } else {
            uint256 quoteAmount = IWooPP(pool).sellBase(
                _tokenIn, 
                _amountIn, 
                0, 
                address(this), 
                0xBfdcBB4C05843163F491C24f9c0019c510786304
            );
            realToAmount = IWooPP(pool).sellQuote(
                _tokenOut, 
                quoteAmount, 
                _minAmountOut, 
                _to, 
                0xBfdcBB4C05843163F491C24f9c0019c510786304
            );
        }
    }

    function _tradeWOOFi(
        IERC20TokenV06 sellToken,
        IERC20TokenV06 buyToken,
        uint256 sellAmount,
        bytes memory bridgeData
    )
        public
        returns (uint256 boughtAmount)
    {
        (address _pool) = abi.decode(bridgeData, (address));

        // Grant the  pool an allowance to sell the first token.
        sellToken.approveIfBelow(address(_pool), sellAmount);
        //track the balance to know how much we bought
        uint256 beforeBalance = buyToken.balanceOf(address(this));
        _swap(
            sellAmount,
            1,
            sellToken,
            buyToken,
            address(this),
            _pool
        );

        //calculate the difference in balance from preswap->postswap to find how many tokens out
        boughtAmount = buyToken.balanceOf(address(this)).safeSub(beforeBalance);
    }
}