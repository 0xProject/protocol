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
import "@0x/contracts-utils/contracts/src/v06/LibSafeMathV06.sol";


/// @dev Minimal CToken interface
interface ICToken {
    /// @dev deposits specified amount underlying tokens and mints cToken for the sender
    /// @param mintAmountInUnderlying amount of underlying tokens to deposit to mint cTokens
    /// @return status code of whether the mint was successful or not
    function mint(uint256 mintAmountInUnderlying) external returns (uint256);
    /// @dev redeems specified amount of cTokens and returns the underlying token to the sender
    /// @param redeemTokensInCtokens amount of cTokens to redeem for underlying collateral
    /// @return status code of whether the redemption was successful or not
    function redeem(uint256 redeemTokensInCtokens) external returns (uint256);
}
/// @dev Minimal CEther interface
interface ICEther {
    /// @dev deposits the amount of Ether sent as value and return mints cEther for the sender
    function mint() payable external;
    /// @dev redeems specified amount of cETH and returns the underlying ether to the sender
    /// @dev redeemTokensInCEther amount of cETH to redeem for underlying ether
    /// @return status code of whether the redemption was successful or not
    function redeem(uint256 redeemTokensInCEther) external returns (uint256);
}

contract MixinCompound {
    using LibERC20TokenV06 for IERC20TokenV06;
    using LibSafeMathV06 for uint256;

    IEtherTokenV06 private immutable WETH;

    constructor(IEtherTokenV06 weth)
        public
    {
        WETH = weth;
    }

    uint256 constant private COMPOUND_SUCCESS_CODE = 0;

    function _tradeCompound(
        IERC20TokenV06 sellToken,
        IERC20TokenV06 buyToken,
        uint256 sellAmount,
        bytes memory bridgeData
    )
        internal
        returns (uint256)
    {
        (address cTokenAddress) = abi.decode(bridgeData, (address));
        uint256 beforeBalance = buyToken.balanceOf(address(this));

        if (address(buyToken) == cTokenAddress) {
            if (address(sellToken) == address(WETH)) {
                // ETH/WETH -> cETH
                ICEther cETH = ICEther(cTokenAddress);
                // Compound expects ETH to be sent with mint call
                WETH.withdraw(sellAmount);
                // NOTE: cETH mint will revert on failure instead of returning a status code
                cETH.mint{value: sellAmount}();
            } else {
                sellToken.approveIfBelow(
                    cTokenAddress,
                    sellAmount
                );
                // Token -> cToken
                ICToken cToken = ICToken(cTokenAddress);
                require(cToken.mint(sellAmount) == COMPOUND_SUCCESS_CODE, "MixinCompound/FAILED_TO_MINT_CTOKEN");
            }
        } else if (address(sellToken) == cTokenAddress) {
            if (address(buyToken) == address(WETH)) {
                // cETH -> ETH/WETH
                uint256 etherBalanceBefore = address(this).balance;
                ICEther cETH = ICEther(cTokenAddress);
                require(cETH.redeem(sellAmount) == COMPOUND_SUCCESS_CODE, "MixinCompound/FAILED_TO_REDEEM_CETHER");
                uint256 etherBalanceAfter = address(this).balance;
                uint256 receivedEtherBalance = etherBalanceAfter.safeSub(etherBalanceBefore);
                WETH.deposit{value: receivedEtherBalance}();
            } else {
                ICToken cToken = ICToken(cTokenAddress);
                require(cToken.redeem(sellAmount) == COMPOUND_SUCCESS_CODE, "MixinCompound/FAILED_TO_REDEEM_CTOKEN");
            }
        }

        return buyToken.balanceOf(address(this)).safeSub(beforeBalance);
    }
}
