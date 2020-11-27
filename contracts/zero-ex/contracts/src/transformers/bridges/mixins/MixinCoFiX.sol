
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
import "@0x/contracts-erc20/contracts/src/v06/IEtherTokenV06.sol";
import "./MixinAdapterAddresses.sol";


interface ICoFiXRouter {
    // msg.value = fee
    function swapExactTokensForETH(
        address token,
        uint amountIn,
        uint amountOutMin,
        address to,
        address rewardTo,
        uint deadline
    ) external payable returns (uint _amountIn, uint _amountOut);

    // msg.value = amountIn + fee
    function swapExactETHForTokens(
        address token,
        uint amountIn,
        uint amountOutMin,
        address to,
        address rewardTo,
        uint deadline
    ) external payable returns (uint _amountIn, uint _amountOut);
}

contract MixinCoFiX is
    MixinAdapterAddresses
{
    using LibERC20TokenV06 for IERC20TokenV06;

    /// @dev Mainnet address of the `CoFiX Router` contract.
    ICoFiXRouter private immutable COFIX_ROUTER;
    /// @dev Mainnet address of the WETH contract.
    IEtherTokenV06 private immutable WETH;


    constructor(AdapterAddresses memory addresses)
        public
    {
        WETH = IEtherTokenV06(addresses.weth);
        COFIX_ROUTER = ICoFiXRouter(addresses.cofixRouter);
    }

    function _tradeCoFiX(
        IERC20TokenV06 buyToken,
        uint256 sellAmount,
        bytes memory bridgeData
    )
        internal
        returns (uint256 boughtAmount)
    {
        (address fromTokenAddress, uint256 fee) = abi.decode(bridgeData, (address, uint256));

        // Grant the CoFiX Router contract an allowance to sell the first token.
        if (fromTokenAddress == address(WETH)) {
            // TODO we may be able to get away with Pair direct trade and avoid WETH/deposit withdraw
            /*
                // this low-level function should be called from a contract which performs important safety checks
                function swapWithExact(address outToken, address to)
                    external
                    payable override lock
                    returns (uint amountIn, uint amountOut, uint oracleFeeChange, uint256[4] memory tradeInfo)
        */
            // Selling WETH, need to withdraw
            WETH.withdraw(sellAmount);
            uint256 payableAmount = sellAmount + fee;
            (/*amount in */, boughtAmount) = COFIX_ROUTER.swapExactETHForTokens{value: payableAmount}(
                address(buyToken),
                sellAmount,
                1,
                address(this),
                address(this),
                block.timestamp
            );
        } else {
            // Selling token for ETH
            IERC20TokenV06(fromTokenAddress).approveIfBelow(address(COFIX_ROUTER), sellAmount);
            (/*amount in */, boughtAmount) = COFIX_ROUTER.swapExactTokensForETH{value: fee}(
                address(fromTokenAddress),
                sellAmount,
                1,
                address(this),
                address(this),
                block.timestamp
            );
            WETH.deposit{value: boughtAmount}();
        }

        return boughtAmount;
    }
}
