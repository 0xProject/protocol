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

pragma solidity ^0.6.12;
pragma experimental ABIEncoderV2;

import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";
import "@0x/contracts-erc20/contracts/src/v06/LibERC20TokenV06.sol";
import "./IStaking.sol";


contract DefaultPoolOperator {
    using LibERC20TokenV06 for IERC20TokenV06;

    // Immutables
    IStaking public immutable stakingProxy;
    IERC20TokenV06 public immutable weth;
    bytes32 public immutable poolId;

    /// @dev Initializes this contract and creates a staking pool.
    /// @param stakingProxy_ The 0x staking proxy contract.
    /// @param weth_ The WETH token contract.
    constructor(
        IStaking stakingProxy_,
        IERC20TokenV06 weth_
    )
        public
    {
        stakingProxy = stakingProxy_;
        weth = weth_;
        // operator share = 100%
        poolId = stakingProxy_.createStakingPool(10 ** 6, false);
    }

    /// @dev Sends this contract's entire WETH balance to the
    ///      staking proxy contract. This function exists in case
    ///      someone joins the default staking pool and starts
    ///      market making for some reason, thus earning this contract
    ///      some staking rewards. Note that anyone can call this
    ///      function at any time.
    function returnStakingRewards()
        external
    {
        uint256 wethBalance = weth.compatBalanceOf(address(this));
        weth.compatTransfer(address(stakingProxy), wethBalance);
    }
}
