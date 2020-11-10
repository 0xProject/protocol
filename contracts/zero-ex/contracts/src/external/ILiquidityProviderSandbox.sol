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


interface ILiquidityProviderSandbox {

    /// @dev Calls `sellTokenForToken` on the given `target` contract to
    ///      trigger a trade.
    /// @param target The address of the on-chain liquidity provider.
    /// @param takerToken The token being sold.
    /// @param makerToken The token being bought.
    /// @param recipient The recipient of the bought tokens.
    /// @param minBuyAmount The minimum acceptable amount of `makerToken` to buy.
    /// @param auxiliaryData Auxiliary data supplied to the `target` contract.
    function executeSellTokenForToken(
        address target,
        address takerToken,
        address makerToken,
        address recipient,
        uint256 minBuyAmount,
        bytes calldata auxiliaryData
    )
        external;

    /// @dev Calls `sellEthForToken` on the given `target` contract to
    ///      trigger a trade.
    /// @param target The address of the on-chain liquidity provider.
    /// @param makerToken The token being bought.
    /// @param recipient The recipient of the bought tokens.
    /// @param minBuyAmount The minimum acceptable amount of `makerToken` to buy.
    /// @param auxiliaryData Auxiliary data supplied to the `target` contract.
    function executeSellEthForToken(
        address target,
        address makerToken,
        address recipient,
        uint256 minBuyAmount,
        bytes calldata auxiliaryData
    )
        external;

    /// @dev Calls `sellTokenForEth` on the given `target` contract to
    ///      trigger a trade.
    /// @param target The address of the on-chain liquidity provider.
    /// @param takerToken The token being sold.
    /// @param recipient The recipient of the bought tokens.
    /// @param minBuyAmount The minimum acceptable amount of ETH to buy.
    /// @param auxiliaryData Auxiliary data supplied to the `target` contract.
    function executeSellTokenForEth(
        address target,
        address takerToken,
        address recipient,
        uint256 minBuyAmount,
        bytes calldata auxiliaryData
    )
        external;
}
