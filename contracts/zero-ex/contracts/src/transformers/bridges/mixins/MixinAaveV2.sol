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

// Minimal Aave V2 LendingPool interface
interface ILendingPool {
    /**
   * @dev Deposits an `amount` of underlying asset into the reserve, receiving in return overlying aTokens.
   * - E.g. User deposits 100 USDC and gets in return 100 aUSDC
   * @param asset The address of the underlying asset to deposit
   * @param amount The amount to be deposited
   * @param onBehalfOf The address that will receive the aTokens, same as msg.sender if the user
   *   wants to receive them on his own wallet, or a different address if the beneficiary of aTokens
   *   is a different wallet
   * @param referralCode Code used to register the integrator originating the operation, for potential rewards.
   *   0 if the action is executed directly by the user, without any middle-man
   **/
  function deposit(
    address asset,
    uint256 amount,
    address onBehalfOf,
    uint16 referralCode
  ) external;

  /**
   * @dev Withdraws an `amount` of underlying asset from the reserve, burning the equivalent aTokens owned
   * E.g. User has 100 aUSDC, calls withdraw() and receives 100 USDC, burning the 100 aUSDC
   * @param asset The address of the underlying asset to withdraw
   * @param amount The underlying amount to be withdrawn
   *   - Send the value type(uint256).max in order to withdraw the whole aToken balance
   * @param to Address that will receive the underlying, same as msg.sender if the user
   *   wants to receive it on his own wallet, or a different address if the beneficiary is a
   *   different wallet
   * @return The final amount withdrawn
   **/
  function withdraw(
    address asset,
    uint256 amount,
    address to
  ) external returns (uint256);

    /**
   * @dev Returns the state and configuration of the reserve
   * @param asset The address of the underlying asset of the reserve
   * @return The state of the reserve
   **/
  function getReserveData(address asset) external view returns (IReserveData memory);

}

struct IReserveData {
  //stores the reserve configuration
  IReserveConfigurationMap configuration;
  //the liquidity index. Expressed in ray
  uint128 liquidityIndex;
  //variable borrow index. Expressed in ray
  uint128 variableBorrowIndex;
  //the current supply rate. Expressed in ray
  uint128 currentLiquidityRate;
  //the current variable borrow rate. Expressed in ray
  uint128 currentVariableBorrowRate;
  //the current stable borrow rate. Expressed in ray
  uint128 currentStableBorrowRate;
  uint40 lastUpdateTimestamp;
  //tokens addresses
  address aTokenAddress;
  address stableDebtTokenAddress;
  address variableDebtTokenAddress;
  //address of the interest rate strategy
  address interestRateStrategyAddress;
  //the id of the reserve. Represents the position in the list of the active reserves
  uint8 id;
}

struct IReserveConfigurationMap {
  uint256 data;
}

contract MixinAaveV2 {

    using LibERC20TokenV06 for IERC20TokenV06;

    function _tradeAaveV2(
        IERC20TokenV06 sellToken,
        IERC20TokenV06 buyToken,
        uint256 sellAmount,
        bytes memory bridgeData
    )
        internal
        returns (uint256 boughtAmount)
    {
        (ILendingPool lendingPool) = abi.decode(bridgeData, (ILendingPool));
        IReserveData memory sellTokenReserve = lendingPool.getReserveData(address(sellToken));
        IReserveData memory buyTokenReserve = lendingPool.getReserveData(address(buyToken));


        if (address(buyToken) == sellTokenReserve.aTokenAddress) {
            sellToken.approveIfBelow(
                address(lendingPool),
                sellAmount
            );
            lendingPool.deposit(address(sellToken), sellAmount, address(this), 0);
            // 1:1 mapping token -> aToken and have the same number of decimals as the underlying token
            boughtAmount = sellAmount;
        } else if (address(sellToken) == buyTokenReserve.aTokenAddress) {
            sellToken.approveIfBelow(
                address(lendingPool),
                sellAmount
            );
            boughtAmount = lendingPool.withdraw(address(buyToken), sellAmount, address(this));
        }
    }
}
