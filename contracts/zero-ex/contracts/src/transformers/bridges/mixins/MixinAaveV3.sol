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

// Minimal Aave V3 Pool interface
interface IPool {
    /**
     * @notice Supplies an `amount` of underlying asset into the reserve, receiving in return overlying aTokens.
     * - E.g. User supplies 100 USDC and gets in return 100 aUSDC
     * @param asset The address of the underlying asset to supply
     * @param amount The amount to be supplied
     * @param onBehalfOf The address that will receive the aTokens, same as msg.sender if the user
     *   wants to receive them on his own wallet, or a different address if the beneficiary of aTokens
     *   is a different wallet
     * @param referralCode Code used to register the integrator originating the operation, for potential rewards.
     *   0 if the action is executed directly by the user, without any middle-man
     **/
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;

    /**
     * @notice Withdraws an `amount` of underlying asset from the reserve, burning the equivalent aTokens owned
     * E.g. User has 100 aUSDC, calls withdraw() and receives 100 USDC, burning the 100 aUSDC
     * @param asset The address of the underlying asset to withdraw
     * @param amount The underlying amount to be withdrawn
     *   - Send the value type(uint256).max in order to withdraw the whole aToken balance
     * @param to The address that will receive the underlying, same as msg.sender if the user
     *   wants to receive it on his own wallet, or a different address if the beneficiary is a
     *   different wallet
     * @return The final amount withdrawn
     **/
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

// Minimal Aave V3 L2Pool interface
interface IL2Pool {
    /**
     * @notice Calldata efficient wrapper of the supply function on behalf of the caller
     * @param args Arguments for the supply function packed in one bytes32
     *    96 bits       16 bits         128 bits      16 bits
     * | 0-padding | referralCode | shortenedAmount | assetId |
     * @dev the shortenedAmount is cast to 256 bits at decode time, if type(uint128).max the value will be expanded to
     * type(uint256).max
     * @dev assetId is the index of the asset in the reservesList.
     */
    function supply(bytes32 args) external;

    /**
     * @notice Calldata efficient wrapper of the withdraw function, withdrawing to the caller
     * @param args Arguments for the withdraw function packed in one bytes32
     *    112 bits       128 bits      16 bits
     * | 0-padding | shortenedAmount | assetId |
     * @dev the shortenedAmount is cast to 256 bits at decode time, if type(uint128).max the value will be expanded to
     * type(uint256).max
     * @dev assetId is the index of the asset in the reservesList.
     */
    function withdraw(bytes32 args) external;
}

contract MixinAaveV3 {
    using LibERC20TokenV06 for IERC20TokenV06;

    bool private immutable _isL2;

    constructor() public {
        uint256 chain;
        assembly { 
            chain := chainid()
        }
        _isL2 = (chain == 42161 || chain == 10); // is arbitrum or optimism
    }

    function _tradeAaveV3(
        IERC20TokenV06 sellToken,
        IERC20TokenV06 buyToken,
        uint256 sellAmount,
        bytes memory bridgeData
    ) internal returns (uint256) {
        if (_isL2) {
            (IL2Pool pool, address aToken, bytes32 l2Params) = abi.decode(bridgeData, (IL2Pool, address, bytes32));

            sellToken.approveIfBelow(address(pool), sellAmount);

            if (address(buyToken) == aToken) {
                pool.supply(l2Params);
                // 1:1 mapping token --> aToken and have the same number of decimals as the underlying token
                return sellAmount;
            } else if (address(sellToken) == aToken) {
                pool.withdraw(l2Params);
                return sellAmount;
            }

            revert("MixinAaveV3/UNSUPPORTED_TOKEN_PAIR");
        }
        (IPool pool, address aToken, ) = abi.decode(bridgeData, (IPool, address, bytes32));

        sellToken.approveIfBelow(address(pool), sellAmount);

        if (address(buyToken) == aToken) {
            pool.supply(address(sellToken), sellAmount, address(this), 0);
            // 1:1 mapping token -> aToken and have the same number of decimals as the underlying token
            return sellAmount;
        } else if (address(sellToken) == aToken) {
            return pool.withdraw(address(buyToken), sellAmount, address(this));
        }

        revert("MixinAaveV3/UNSUPPORTED_TOKEN_PAIR");
    }
}
