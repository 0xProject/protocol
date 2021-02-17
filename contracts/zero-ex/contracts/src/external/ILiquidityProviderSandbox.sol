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

import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";
import "../vendor/ILiquidityProvider.sol";


interface ILiquidityProviderSandbox {

    /// @dev Calls `sellTokenForToken` on the given `provider` contract to
    ///      trigger a trade.
    /// @param provider The address of the on-chain liquidity provider.
    /// @param inputToken The token being sold.
    /// @param outputToken The token being bought.
    /// @param recipient The recipient of the bought tokens.
    /// @param minBuyAmount The minimum acceptable amount of `outputToken` to buy.
    /// @param auxiliaryData Auxiliary data supplied to the `provider` contract.
    function executeSellTokenForToken(
        ILiquidityProvider provider,
        IERC20TokenV06 inputToken,
        IERC20TokenV06 outputToken,
        address recipient,
        uint256 minBuyAmount,
        bytes calldata auxiliaryData
    )
        external;

    /// @dev Calls `sellEthForToken` on the given `provider` contract to
    ///      trigger a trade.
    /// @param provider The address of the on-chain liquidity provider.
    /// @param outputToken The token being bought.
    /// @param recipient The recipient of the bought tokens.
    /// @param minBuyAmount The minimum acceptable amount of `outputToken` to buy.
    /// @param auxiliaryData Auxiliary data supplied to the `provider` contract.
    function executeSellEthForToken(
        ILiquidityProvider provider,
        IERC20TokenV06 outputToken,
        address recipient,
        uint256 minBuyAmount,
        bytes calldata auxiliaryData
    )
        external;

    /// @dev Calls `sellTokenForEth` on the given `provider` contract to
    ///      trigger a trade.
    /// @param provider The address of the on-chain liquidity provider.
    /// @param inputToken The token being sold.
    /// @param recipient The recipient of the bought tokens.
    /// @param minBuyAmount The minimum acceptable amount of ETH to buy.
    /// @param auxiliaryData Auxiliary data supplied to the `provider` contract.
    function executeSellTokenForEth(
        ILiquidityProvider provider,
        IERC20TokenV06 inputToken,
        address recipient,
        uint256 minBuyAmount,
        bytes calldata auxiliaryData
    )
        external;
}
