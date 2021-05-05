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


interface IBalancerV2Vault {

    enum SwapKind { GIVEN_IN, GIVEN_OUT }
    /**
     * @dev Performs a swap with a single Pool.
     *
     * If the swap is given in (the number of tokens to send to the Pool is known), returns the amount of tokens
     * taken from the Pool, which must be greater than or equal to `limit`.
     *
     * If the swap is given out (the number of tokens to take from the Pool is known), returns the amount of
     * tokens sent to the Pool, which must be less than or equal to `limit`.
     *
     * Internal Balance usage and the recipient are determined by the `funds` struct.
     *
     * Emits a `Swap` event.
     * For full documentation see https://github.com/balancer-labs/balancer-core-v2/blob/master/contracts/vault/interfaces/IVault.sol
     */
    function swap(
        SingleSwap calldata request,
        FundManagement calldata funds,
        uint256 limit,
        uint256 deadline
    ) external payable returns (uint256);

    struct SingleSwap {
        bytes32 poolId;
        SwapKind kind;
        IERC20TokenV06 assetIn;
        IERC20TokenV06 assetOut;
        uint256 amount;
        bytes userData;
    }

    struct FundManagement {
        address sender;
        bool fromInternalBalance;
        address payable recipient;
        bool toInternalBalance;
    }
}

contract MixinBalancerV2 {

    using LibERC20TokenV06 for IERC20TokenV06;

    struct BalancerV2BridgeData {
        IBalancerV2Vault vault;
        bytes32 poolId;
    }

    function _tradeBalancerV2(
        IERC20TokenV06 sellToken,
        IERC20TokenV06 buyToken,
        uint256 sellAmount,
        bytes memory bridgeData
    )
        internal
        returns (uint256 boughtAmount)
    {
        // Decode the bridge data.
        BalancerV2BridgeData memory data = abi.decode(bridgeData, (BalancerV2BridgeData));

        // Grant an allowance to the exchange to spend `fromTokenAddress` token.
        sellToken.approveIfBelow(address(data.vault), sellAmount);

        // Sell the entire sellAmount
        IBalancerV2Vault.SingleSwap memory request = IBalancerV2Vault.SingleSwap({
            poolId: data.poolId,
            kind: IBalancerV2Vault.SwapKind.GIVEN_IN,
            assetIn: sellToken,
            assetOut: buyToken,
            amount: sellAmount, // amount in
            userData: ""
        });

        IBalancerV2Vault.FundManagement memory funds = IBalancerV2Vault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(address(this)),
            toInternalBalance: false
        });

        boughtAmount = data.vault.swap(
            request,
            funds,
            1, // min amount out
            block.timestamp // expires after this block
        );
        return boughtAmount;
    }
}
