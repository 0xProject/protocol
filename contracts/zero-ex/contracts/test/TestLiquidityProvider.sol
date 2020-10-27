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

import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";


contract TestLiquidityProvider {
    event SellTokenForToken(
        address takerToken,
        address makerToken,
        address recipient,
        uint256 minBuyAmount,
        uint256 takerTokenBalance
    );

    event SellEthForToken(
        address makerToken,
        address recipient,
        uint256 minBuyAmount,
        uint256 ethBalance
    );

    event SellTokenForEth(
        address takerToken,
        address recipient,
        uint256 minBuyAmount,
        uint256 takerTokenBalance
    );

    IERC20TokenV06 public immutable xAsset;
    IERC20TokenV06 public immutable yAsset;

    constructor(IERC20TokenV06 xAsset_, IERC20TokenV06 yAsset_)
        public
    {
        xAsset = xAsset_;
        yAsset = yAsset_;
    }

    receive() external payable {}

    /// @dev Trades `takerToken` for `makerToken`. The amount of `takerToken`
    ///      to sell must be transferred to the contract prior to calling this
    ///      function to trigger the trade.
    /// @param takerToken The token being sold.
    /// @param makerToken The token being bought.
    /// @param recipient The recipient of the bought tokens.
    /// @param minBuyAmount The minimum acceptable amount of `makerToken` to buy.
    /// @param auxiliaryData Arbitrary auxiliary data supplied to the contract.
    /// @return boughtAmount The amount of `makerToken` bought.
    function sellTokenForToken(
        address takerToken,
        address makerToken,
        address recipient,
        uint256 minBuyAmount,
        bytes calldata auxiliaryData
    )
        external
        returns (uint256 boughtAmount)
    {
        emit SellTokenForToken(
            takerToken,
            makerToken,
            recipient,
            minBuyAmount,
            IERC20TokenV06(takerToken).balanceOf(address(this))
        );
    }

    /// @dev Trades ETH for token. ETH must be sent to the contract prior to
    ///      calling this function to trigger the trade.
    /// @param makerToken The token being bought.
    /// @param recipient The recipient of the bought tokens.
    /// @param minBuyAmount The minimum acceptable amount of `makerToken` to buy.
    /// @param auxiliaryData Arbitrary auxiliary data supplied to the contract.
    /// @return boughtAmount The amount of `makerToken` bought.
    function sellEthForToken(
        address makerToken,
        address recipient,
        uint256 minBuyAmount,
        bytes calldata auxiliaryData
    )
        external
        returns (uint256 boughtAmount)
    {
        emit SellEthForToken(
            makerToken,
            recipient,
            minBuyAmount,
            address(this).balance
        );
    }

    /// @dev Trades token for ETH. The token must be sent to the contract prior
    ///      to calling this function to trigger the trade.
    /// @param takerToken The token being sold.
    /// @param recipient The recipient of the bought tokens.
    /// @param minBuyAmount The minimum acceptable amount of ETH to buy.
    /// @param auxiliaryData Arbitrary auxiliary data supplied to the contract.
    /// @return boughtAmount The amount of ETH bought.
    function sellTokenForEth(
        address takerToken,
        address payable recipient,
        uint256 minBuyAmount,
        bytes calldata auxiliaryData
    )
        external
        returns (uint256 boughtAmount)
    {
        emit SellTokenForEth(
            takerToken,
            recipient,
            minBuyAmount,
            IERC20TokenV06(takerToken).balanceOf(address(this))
        );
    }
}
