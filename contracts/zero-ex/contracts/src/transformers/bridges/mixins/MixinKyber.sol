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

interface IKyberNetworkProxy {

    /// @dev Sells `sellTokenAddress` tokens for `buyTokenAddress` tokens
    /// using a hint for the reserve.
    /// @param sellToken Token to sell.
    /// @param sellAmount Amount of tokens to sell.
    /// @param buyToken Token to buy.
    /// @param recipientAddress Address to send bought tokens to.
    /// @param maxBuyTokenAmount A limit on the amount of tokens to buy.
    /// @param minConversionRate The minimal conversion rate. If actual rate
    ///        is lower, trade is canceled.
    /// @param walletId The wallet ID to send part of the fees
    /// @param hint The hint for the selective inclusion (or exclusion) of reserves
    /// @return boughtAmount Amount of tokens bought.
    function tradeWithHint(
        IERC20TokenV06 sellToken,
        uint256 sellAmount,
        IERC20TokenV06 buyToken,
        address payable recipientAddress,
        uint256 maxBuyTokenAmount,
        uint256 minConversionRate,
        address payable walletId,
        bytes calldata hint
    )
        external
        payable
        returns (uint256 boughtAmount);

    function getExpectedRateAfterFee(
        address src,
        address dest,
        uint256 srcQty,
        uint256 platformFeeBps,
        bytes calldata hint
    )
        external
        view
        returns (uint256 expectedRate);
}

contract MixinKyber {

    using LibERC20TokenV06 for IERC20TokenV06;

    /// @dev Address indicating the trade is using ETH
    IERC20TokenV06 private immutable KYBER_ETH_ADDRESS =
        IERC20TokenV06(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);
    /// @dev Mainnet address of the WETH contract.
    IEtherTokenV06 private immutable WETH;

    constructor(IEtherTokenV06 weth)
        public
    {
        WETH = weth;
    }

    function _tradeKyber(
        IERC20TokenV06 sellToken,
        IERC20TokenV06 buyToken,
        uint256 sellAmount,
        bytes memory bridgeData
    )
        internal
        returns (uint256 boughtAmount)
    {
        return _tradeKyberInternal(KYBER_ETH_ADDRESS, WETH, sellToken, buyToken, sellAmount, bridgeData);
    }

    function _tradeKyberInternal(
        IERC20TokenV06 kyberEthAddress,
        IEtherTokenV06 weth,
        IERC20TokenV06 sellToken,
        IERC20TokenV06 buyToken,
        uint256 sellAmount,
        bytes memory bridgeData
    )
        internal
        returns (uint256 boughtAmount)
    {
        (IKyberNetworkProxy kyber, bytes memory hint) =
            abi.decode(bridgeData, (IKyberNetworkProxy, bytes));

        uint256 payableAmount = 0;
        if (sellToken != weth) {
            // If the input token is not WETH, grant an allowance to the exchange
            // to spend them.
            sellToken.approveIfBelow(
                address(kyber),
                sellAmount
            );
        } else {
            // If the input token is WETH, unwrap it and attach it to the call.
            payableAmount = sellAmount;
            weth.withdraw(payableAmount);
        }

        // Try to sell all of this contract's input token balance through
        // `KyberNetworkProxy.trade()`.
        boughtAmount = kyber.tradeWithHint{ value: payableAmount }(
            // Input token.
            sellToken == weth ? kyberEthAddress : sellToken,
            // Sell amount.
            sellAmount,
            // Output token.
            buyToken == weth ? kyberEthAddress : buyToken,
            // Transfer to this contract
            address(uint160(address(this))),
            // Buy as much as possible.
            uint256(-1),
            // Lowest minimum conversion rate
            1,
            // No affiliate address.
            address(0),
            hint
        );
        // If receving ETH, wrap it to WETH.
        if (buyToken == weth) {
            weth.deposit{ value: boughtAmount }();
        }
        return boughtAmount;
    }
}
