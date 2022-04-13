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


interface IBalancerV2BatchSwapVault {

    enum SwapKind { GIVEN_IN, GIVEN_OUT }

    struct BatchSwapStep {
        bytes32 poolId;
        uint256 assetInIndex;
        uint256 assetOutIndex;
        uint256 amount;
        bytes userData;
    }

    struct FundManagement {
        address sender;
        bool fromInternalBalance;
        address payable recipient;
        bool toInternalBalance;
    }

    function batchSwap(
        SwapKind kind,
        BatchSwapStep[] calldata swaps,
        IERC20TokenV06[] calldata assets,
        FundManagement calldata funds,
        int256[] calldata limits,
        uint256 deadline
    ) external returns (int256[] memory amounts);
}

contract MixinBalancerV2Batch {

    using LibERC20TokenV06 for IERC20TokenV06;

    struct BalancerV2BatchBridgeData {
        IBalancerV2BatchSwapVault vault;
        IBalancerV2BatchSwapVault.BatchSwapStep[] swapSteps;
        IERC20TokenV06[] assets;
    }

    function _tradeBalancerV2Batch(
        uint256 sellAmount,
        bytes memory bridgeData
    )
        internal
        returns (uint256 boughtAmount)
    {
        // Decode the bridge data.
        BalancerV2BatchBridgeData memory data = abi.decode(bridgeData, (BalancerV2BatchBridgeData));

        // Grant an allowance to the exchange to spend `fromTokenAddress` token.
        data.assets[0].approveIfBelow(address(data.vault), sellAmount);

        data.swapSteps[0].amount = sellAmount;
        int256[] memory limits = new int256[](data.assets.length);
        for (uint256 i = 0; i < limits.length; ++i) {
            limits[i] = i == 0 ? int256(sellAmount) : type(int256).min;
        }

        int256[] memory amounts = data.vault.batchSwap(
            IBalancerV2BatchSwapVault.SwapKind.GIVEN_IN,
            data.swapSteps,
            data.assets,
            IBalancerV2BatchSwapVault.FundManagement({
                sender: address(this),
                fromInternalBalance: false,
                recipient: payable(address(this)),
                toInternalBalance: false
            }),
            limits,
            block.timestamp + 1
        );
        return uint256(amounts[amounts.length - 1] * -1);
    }
}
