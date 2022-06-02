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

/*
    BancorV3
*/
interface IBancorV3 {
    /**
     * @dev performs a trade by providing the source amount and returns the target amount and the associated fee
     *
     * requirements:
     *
     * - the caller must be the network contract
     */
    function tradeBySourceAmount(
        address sourceToken,
        address targetToken,
        uint256 sourceAmount,
        uint256 minReturnAmount,
        uint256 deadline,
        address beneficiary
    ) external returns (uint256 amount);
}

contract MixinBancorV3 {

    using LibERC20TokenV06 for IERC20TokenV06;

    function _tradeBancorV3(
        IERC20TokenV06 buyToken,
        uint256 sellAmount,
        bytes memory bridgeData
    )
        public
        returns (uint256 amountOut)

    {
        IBancorV3 router;
        IERC20TokenV06[] memory path;
        address[] memory _path;
        {
            (router, _path) = abi.decode(bridgeData, (IBancorV3, address[]));
            // To get around `abi.decode()` not supporting interface array types.
            assembly { path := _path }
        }

        require(path.length >= 2, "MixinBancorV3/PATH_LENGTH_MUST_BE_AT_LEAST_TWO");
        require(
            path[path.length - 1] == buyToken,
            "MixinBancorV3/LAST_ELEMENT_OF_PATH_MUST_MATCH_OUTPUT_TOKEN"
        );
        // Grant the BancorV3 router an allowance to sell the first token.
        path[0].approveIfBelow(address(router), sellAmount);


        uint256 amountOut = router.tradeBySourceAmount(
            _path[0],
            _path[1],
             // Sell all tokens we hold.
            sellAmount,
             // Minimum buy amount.
            1,
            //deadline
            block.timestamp + 1,
            // address of the mixin
            address(this)
        );

        return amountOut;
    }
}