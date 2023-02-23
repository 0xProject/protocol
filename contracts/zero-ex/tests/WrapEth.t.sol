// SPDX-License-Identifier: Apache-2.0
/*
  Copyright 2023 ZeroEx Intl.
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

import {ForkUtils} from "utils/ForkUtils.sol";
import "utils/TestUtils.sol";
import "utils/DeployZeroEx.sol";
import "forge-std/Test.sol";
import "src/IZeroEx.sol";
import "@0x/contracts-erc20/src/IEtherToken.sol";
import "src/features/TransformERC20Feature.sol";
import "src/external/TransformerDeployer.sol";
import "src/transformers/WethTransformer.sol";
import "src/transformers/FillQuoteTransformer.sol";
import "src/transformers/bridges/BridgeProtocols.sol";
import "src/transformers/bridges/EthereumBridgeAdapter.sol";
import "src/IZeroEx.sol";

contract WrapEth is Test, ForkUtils, TestUtils {
    DeployZeroEx.ZeroExDeployed zeroExDeployed;

    function setUp() public {
        zeroExDeployed = new DeployZeroEx(
            DeployZeroEx.ZeroExDeployConfiguration(address(0), address(0), address(0), 0, 0, 0, true)
        ).deployZeroEx();
        vm.deal(address(this), 1e19);
    }

    function test_transformERC20() public {
        emit log_string("-----Preparing ETH->WETH transformation through TransformERC20()-----");
        emit log_string("   --Building Up Transformations--");
        ITransformERC20Feature.Transformation[] memory transformations = new ITransformERC20Feature.Transformation[](1);

        emit log_named_address("    Finding TransformerDeployer nonce @", address(zeroExDeployed.transformerDeployer));
        emit log_named_uint(
            "       Deployer nonce",
            _findTransformerNonce(
                address(zeroExDeployed.transformers.wethTransformer),
                address(zeroExDeployed.transformerDeployer)
            )
        );
        transformations[0].deploymentNonce = _findTransformerNonce(
            address(zeroExDeployed.transformers.wethTransformer),
            address(zeroExDeployed.transformerDeployer)
        );
        transformations[0].data = abi.encode(LibERC20Transformer.ETH_TOKEN_ADDRESS, 1e18);

        emit log_string("   ---Calling TransformERC20()---");
        uint256 balanceETHBefore = address(this).balance;
        uint256 balanceWETHBefore = zeroExDeployed.weth.balanceOf(address(this));
        zeroExDeployed.zeroEx.transformERC20{value: 1e18}(
            // input token
            IERC20Token(LibERC20Transformer.ETH_TOKEN_ADDRESS),
            // output token
            IERC20Token(address(zeroExDeployed.weth)),
            // input token amount
            1e18,
            // min output token amount
            1e18,
            // list of transform
            transformations
        );
        assert(zeroExDeployed.weth.balanceOf(address(this)) == 1e18);
        emit log_string("       Successful Transformation Complete");
        emit log_named_uint("           ETH BALANCE BEFORE:", balanceETHBefore);
        emit log_named_uint("           ETH BALANCE AFTER:", address(this).balance);
        emit log_named_uint("           WETH BALANCE BEFORE:", balanceWETHBefore);
        emit log_named_uint("           WETH BALANCE AFTER:", zeroExDeployed.weth.balanceOf(address(this)));
    }
}
