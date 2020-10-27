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


/// @dev Feature to swap directly with an on-chain liquidity provider.
interface ILiquidityProviderFeature {

    /// @dev Sells `sellAmount` of `takerToken` to the liquidity provider
    ///      at the given `target`.
    /// @param makerToken The token being bought.
    /// @param takerToken The token being sold.
    /// @param target The address of the on-chain liquidity provider
    ///        to trade with.
    /// @param recipient The recipient of the bought tokens. If equal to
    ///        address(0), `msg.sender` is assumed to be the recipient.
    /// @param sellAmount The amount of `takerToken` to sell.
    /// @param minBuyAmount The minimum acceptable amount of `makerToken` to
    ///        buy. Reverts if this amount is not satisfied.
    /// @param auxiliaryData Auxiliary data supplied to the `target` contract.
    /// @return boughtAmount The amount of `makerToken` bought.
    function sellToLiquidityProvider(
        address makerToken,
        address takerToken,
        address payable target,
        address recipient,
        uint256 sellAmount,
        uint256 minBuyAmount,
        bytes calldata auxiliaryData
    )
        external
        payable
        returns (uint256 boughtAmount);
}
