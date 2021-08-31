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

import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";
import "@0x/contracts-erc20/contracts/src/v06/IEtherTokenV06.sol";
import "../vendor/IUniswapV3Pool.sol";
import "../migrations/LibMigrate.sol";
import "../fixins/FixinCommon.sol";
import "../fixins/FixinTokenSpender.sol";
import "./interfaces/IFeature.sol";
import "./interfaces/IEpFundRecoveryFeature.sol";
import "../transformers/LibERC20Transformer.sol";

contract EpFundRecoveryFeature is
    IFeature,
    IEpFundRecoveryFeature,
    FixinCommon,
    FixinTokenSpender
{
    /// @dev Name of this feature.
    string public constant override FEATURE_NAME = "EpFundRecoveryFeature";
    /// @dev Version of this feature.
    uint256 public immutable override FEATURE_VERSION = _encodeVersion(1, 0, 0);
    /// @dev Deployed exchange proxy address.
    address private immutable ZEROEX_EP_ADDRESS;
    
    /// @dev Construct this contract.
    /// @param exchangeProxy Exchange Proxy contract address
    constructor(address exchangeProxy) public {
        ZEROEX_EP_ADDRESS = exchangeProxy; 
    }

    // solhint-enable state-visibility
    /// @dev recovers WETH from the 0x Exchange Proxy contract
    function recoverToDesignatedWallet(
        IERC20TokenV06 erc20,
        uint256 amountOut,
        address payable designatedWallet
    )
        external
        override
    {
        if(amountOut == uint256(-1)) {
            amountOut = erc20.balanceOf(ZEROEX_EP_ADDRESS);
        }
        if(LibERC20Transformer.isTokenETH(erc20))
        {
            payable(designatedWallet).transfer(amountOut);
        }
        else{
            erc20.transferFrom(ZEROEX_EP_ADDRESS,designatedWallet,amountOut);
        }
    }

    /// @dev Initialize and register this feature.
    ///      Should be delegatecalled by `Migrate.migrate()`.
    /// @return success `LibMigrate.SUCCESS` on success.
    function migrate()
        external
        returns (bytes4 success)
    {
        //_registerFeatureFunction(this.sellEthForTokenToUniswapV3.selector);
        _registerFeatureFunction(this.recoverToDesignatedWallet.selector);
        return LibMigrate.MIGRATE_SUCCESS;
    }
}