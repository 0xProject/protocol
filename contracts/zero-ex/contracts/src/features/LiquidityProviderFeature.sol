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
import "@0x/contracts-utils/contracts/src/v06/errors/LibRichErrorsV06.sol";
import "@0x/contracts-utils/contracts/src/v06/LibSafeMathV06.sol";
import "../errors/LibLiquidityProviderRichErrors.sol";
import "../external/ILiquidityProviderSandbox.sol";
import "../external/LiquidityProviderSandbox.sol";
import "../fixins/FixinCommon.sol";
import "../migrations/LibMigrate.sol";
import "./IFeature.sol";
import "./ILiquidityProviderFeature.sol";
import "./libs/LibTokenSpender.sol";


contract LiquidityProviderFeature is
    IFeature,
    ILiquidityProviderFeature,
    FixinCommon
{
    using LibSafeMathV06 for uint256;
    using LibRichErrorsV06 for bytes;

    /// @dev Name of this feature.
    string public constant override FEATURE_NAME = "LiquidityProviderFeature";
    /// @dev Version of this feature.
    uint256 public immutable override FEATURE_VERSION = _encodeVersion(1, 0, 0);

    /// @dev ETH pseudo-token address.
    address constant internal ETH_TOKEN_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    /// @dev The sandbox contract address.
    ILiquidityProviderSandbox public immutable sandbox;

    constructor(address zeroEx)
        public
        FixinCommon()
    {
        sandbox = new LiquidityProviderSandbox(zeroEx);
    }

    /// @dev Initialize and register this feature.
    ///      Should be delegatecalled by `Migrate.migrate()`.
    /// @return success `LibMigrate.SUCCESS` on success.
    function migrate()
        external
        returns (bytes4 success)
    {
        _registerFeatureFunction(this.sellToLiquidityProvider.selector);
        return LibMigrate.MIGRATE_SUCCESS;
    }

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
        override
        payable
        returns (uint256 boughtAmount)
    {
        if (recipient == address(0)) {
            recipient = msg.sender;
        }

        if (takerToken == ETH_TOKEN_ADDRESS) {
            target.transfer(sellAmount);
        } else {
            LibTokenSpender.spendERC20Tokens(
                IERC20TokenV06(takerToken),
                msg.sender,
                target,
                sellAmount
            );
        }

        if (takerToken == ETH_TOKEN_ADDRESS) {
            uint256 balanceBefore = IERC20TokenV06(makerToken).balanceOf(recipient);
            sandbox.executeSellEthForToken(
                target,
                makerToken,
                recipient,
                minBuyAmount,
                auxiliaryData
            );
            boughtAmount = IERC20TokenV06(makerToken).balanceOf(recipient).safeSub(balanceBefore);
        } else if (makerToken == ETH_TOKEN_ADDRESS) {
            uint256 balanceBefore = recipient.balance;
            sandbox.executeSellTokenForEth(
                target,
                takerToken,
                recipient,
                minBuyAmount,
                auxiliaryData
            );
            boughtAmount = recipient.balance.safeSub(balanceBefore);
        } else {
            uint256 balanceBefore = IERC20TokenV06(makerToken).balanceOf(recipient);
            sandbox.executeSellTokenForToken(
                target,
                takerToken,
                makerToken,
                recipient,
                minBuyAmount,
                auxiliaryData
            );
            boughtAmount = IERC20TokenV06(makerToken).balanceOf(recipient).safeSub(balanceBefore);
        }

        if (boughtAmount < minBuyAmount) {
            LibLiquidityProviderRichErrors.LiquidityProviderIncompleteSellError(
                target,
                makerToken,
                takerToken,
                sellAmount,
                boughtAmount,
                minBuyAmount
            ).rrevert();
        }
    }
}
