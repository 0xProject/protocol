
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
import "../IBridgeAdapter.sol";

interface IDODOHelper {

    function querySellQuoteToken(address dodo, uint256 amount) external view returns (uint256);
}


interface IDODO {

    function sellBaseToken(uint256 amount, uint256 minReceiveQuote, bytes calldata data) external returns (uint256);

    function buyBaseToken(uint256 amount, uint256 maxPayQuote, bytes calldata data) external returns (uint256);

}


contract MixinDodo {
    using LibERC20TokenV06 for IERC20TokenV06;

    /// @dev Mainnet address of the `DOODO Helper` contract.
    IDODOHelper private immutable DODO_HELPER;

    constructor(IBridgeAdapter.Addresses memory addresses)
        public
    {
        DODO_HELPER = IDODOHelper(addresses.dodoHelper);
    }

    function _tradeDodo(
        address poolAddress,
        IERC20TokenV06 sellToken,
        uint256 sellAmount,
        bytes memory bridgeData
    )
        internal
        returns (uint256 boughtAmount)
    {
        (bool isSellBase) = abi.decode(bridgeData, (bool));

        // Grant the Dodo pool contract an allowance to sell the first token.
        sellToken.approveIfBelow(poolAddress, sellAmount);

        if (isSellBase) {
            // Sell the Base token directly against the contract
            boughtAmount = IDODO(poolAddress).sellBaseToken(
                // amount to sell
                sellAmount,
                // min receive amount
                1,
                new bytes(0)
            );
        } else {
            // Need to re-calculate the sell quote amount into buyBase
            boughtAmount = DODO_HELPER.querySellQuoteToken(
                poolAddress,
                sellAmount
            );
            IDODO(poolAddress).buyBaseToken(
                // amount to buy
                boughtAmount,
                // max pay amount
                sellAmount,
                new bytes(0)
            );
        }

        return boughtAmount;
    }
}
