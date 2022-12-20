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

/// @dev Minimal interface for minting StETH
interface IStETH {
    /// @dev Adds eth to the pool
    /// @param _referral optional address for referrals
    /// @return StETH Amount of shares generated
    function submit(address _referral) external payable returns (uint256 StETH);

    /// @dev Retrieve the current pooled ETH representation of the shares amount
    /// @param _sharesAmount amount of shares
    /// @return amount of pooled ETH represented by the shares amount
    function getPooledEthByShares(uint256 _sharesAmount) external view returns (uint256);
}

/// @dev Minimal interface for wrapping/unwrapping stETH.
interface IWstETH {
    /**
     * @notice Exchanges stETH to wstETH
     * @param _stETHAmount amount of stETH to wrap in exchange for wstETH
     * @dev Requirements:
     *  - `_stETHAmount` must be non-zero
     *  - msg.sender must approve at least `_stETHAmount` stETH to this
     *    contract.
     *  - msg.sender must have at least `_stETHAmount` of stETH.
     * User should first approve _stETHAmount to the WstETH contract
     * @return Amount of wstETH user receives after wrap
     */
    function wrap(uint256 _stETHAmount) external returns (uint256);

    /**
     * @notice Exchanges wstETH to stETH
     * @param _wstETHAmount amount of wstETH to uwrap in exchange for stETH
     * @dev Requirements:
     *  - `_wstETHAmount` must be non-zero
     *  - msg.sender must have at least `_wstETHAmount` wstETH.
     * @return Amount of stETH user receives after unwrap
     */
    function unwrap(uint256 _wstETHAmount) external returns (uint256);
}

contract MixinLido {
    using LibERC20TokenV06 for IERC20TokenV06;
    using LibERC20TokenV06 for IEtherTokenV06;

    IEtherTokenV06 private immutable WETH;
    IStETH private immutable StETH;
    IWstETH private immutable WstETH;

    constructor(IEtherTokenV06 weth, address steth, address wsteth) public {
        WETH = weth;
        StETH = IStETH(steth);
        WstETH = IWstETH(wsteth);
    }

    function _tradeLido(
        IERC20TokenV06 sellToken,
        IERC20TokenV06 buyToken,
        uint256 sellAmount
    ) internal returns (uint256 boughtAmount) {
        if (address(sellToken) == address(WETH) && address(buyToken) == address(StETH)) {
            WETH.withdraw(sellAmount);
            return StETH.getPooledEthByShares(StETH.submit{value: sellAmount}(address(0)));
        }
        if (address(sellToken) == address(StETH) && address(buyToken) == address(WstETH)) {
            sellToken.approveIfBelow(address(WstETH), sellAmount);
            return WstETH.wrap(sellAmount);
        }
        if (address(sellToken) == address(WstETH) && address(buyToken) == address(StETH)) {
            return WstETH.unwrap(sellAmount);
        }

        revert("MixinLido/UNSUPPORTED_TOKEN_PAIR");
    }
}
