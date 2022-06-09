// SPDX-License-Identifier: Apache-2.0
/*

  Copyright 2022 ZeroEx Intl.

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

pragma solidity ^0.6;
pragma experimental ABIEncoderV2;

import "src/features/OtcOrdersFeature.sol";
import "src/features/TransformERC20Feature.sol";
import "src/features/UniswapFeature.sol";
import "src/features/UniswapV3Feature.sol";
import "@0x/contracts-erc20/contracts/src/v06/IEtherTokenV06.sol";
import "../utils/DeployZeroEx.sol";

contract Architecture is DeployZeroEx {

    function testFeatureDeployment()
        public
    {
        deployZeroEx();
        // If we look up the address of the Uniswap Implementation, it will be empty
        // as it hasn't yet been registered.
        emit log_named_address("sellToUniswap implementation", ZERO_EX.getFunctionImplementation(UniswapFeature.sellToUniswap.selector));
        // Try registering the implementation
        // Technically the constructor argument is the WETH address, which doesn't yet exist in this environment
        UniswapFeature uniswapFeature = new UniswapFeature(IEtherTokenV06(address(0)));
        emit log_named_address("UniswapFeature deployed at", address(uniswapFeature));
        // As part of the migration, the UniswapFeature registers its own selectors
        IZERO_EX.migrate(address(uniswapFeature), abi.encodePacked(uniswapFeature.migrate.selector), address(this));
        // You will observe in the logs the following events
        //  ├─ emit ProxyFunctionUpdated(selector: 0xd9627aa4, oldImpl: 0x0000000000000000000000000000000000000000, newImpl: UniswapFeature: [0xf5a2fe45f4f1308502b1c136b9ef8af136141382])
        // sellToUniswap(address[],uint256,uint256,bool) = 0xd9627aa4
        // cast keccak 'sellToUniswap(address[],uint256,uint256,bool)'
        // > 0xd9627aa4...
        emit log_named_address("sellToUniswap implementation", ZERO_EX.getFunctionImplementation(UniswapFeature.sellToUniswap.selector));
        // From now on it will be possible to call 0xEP.sellToUniswap which will be registered.

        // Try deploying another Feature such as

        // OtcOrdersFeature
        // ...
        emit log_named_address("fillOtcOrder implementation", ZERO_EX.getFunctionImplementation(OtcOrdersFeature.fillOtcOrder.selector));

        // UniswapV3Feature
        // ...
        emit log_named_address("sellTokenForTokenToUniswapV3 implementation", ZERO_EX.getFunctionImplementation(UniswapV3Feature.sellTokenForTokenToUniswapV3.selector));

        // Or for extra credit, the TransformERC20Feature
        emit log_named_address("transformERC20 implementation", ZERO_EX.getFunctionImplementation(TransformERC20Feature.transformERC20.selector));
    }
}
