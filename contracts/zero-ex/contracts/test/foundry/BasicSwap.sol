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

import "./utils/ForkUtils.sol";
import "./utils/TestUtils.sol";
import "./utils/DeployZeroEx.sol";
import "forge-std/Test.sol";
import "src/IZeroEx.sol";
import "@0x/contracts-erc20/contracts/src/v06/IEtherTokenV06.sol";
import "src/features/TransformERC20Feature.sol";
import "src/external/TransformerDeployer.sol";
import "src/transformers/WethTransformer.sol";
import "src/transformers/FillQuoteTransformer.sol";
import "src/transformers/bridges/BridgeProtocols.sol";
import "src/transformers/bridges/EthereumBridgeAdapter.sol";
import "src/IZeroEx.sol";

/*
    This test must be run in forked mode
    e.g forge test -vvvv -m 'testBasicSwap' -f ETH_RPC_URL
    It is also helpful to have an Etherscan API key exported
    export ETHERSCAN_API_KEY=
    as Foundry will fetch source code and names
*/

contract BasicSwapTest is 
    Test,
    ForkUtils,
    TestUtils
{  
    DeployZeroEx deployer;
    function setUp()
        public
    {
        deployer = new DeployZeroEx();
        deployer.deployZeroEx();
        vm.deal(address(this), 1e19);
        vm.deal(address(deployer.IZERO_EX().getTransformWallet()), 1e19);
    }

    function testTransformERC20()
        public
    {
        emit log_string("-----Preparing ETH->WETH transformation through TransformERC20()-----");
        emit log_string("   --Building Up Transformations--");
        ITransformERC20Feature.Transformation[] memory transformations = new ITransformERC20Feature.Transformation[](1);

        emit log_named_address("    Finding TransformerDeployer nonce @", address(deployer.transformerDeployer()));
        emit log_named_uint(
            "       Deployer nonce",
            _findTransformerNonce(
            address(deployer.wethTransformer()),
            address(deployer.transformerDeployer())
        ));
        transformations[0].deploymentNonce = _findTransformerNonce(address(deployer.wethTransformer()),address(deployer.transformerDeployer()));
        transformations[0].data = abi.encode(LibERC20Transformer.ETH_TOKEN_ADDRESS, 1e18);
        IZeroEx zrx = deployer.IZERO_EX();

        emit log_string("   ---Calling TransformERC20()---");
        uint256 balanceETHBefore = address(this).balance;
        uint256 balanceWETHBefore = deployer.weth().balanceOf(address(this));
        zrx.transformERC20{value: 1e18}(
            // input token
            IERC20TokenV06(LibERC20Transformer.ETH_TOKEN_ADDRESS),
            // output token
            IERC20TokenV06(address(deployer.weth())),
            // input token amount
            1e18,
            // min output token amount
            1e18,
            // list of transform
            transformations
        );
        assert(deployer.weth().balanceOf(address(this)) == 1e18);
        emit log_string("       Successful Transformation Complete");
        emit log_named_uint("           ETH BALANCE BEFORE:", balanceETHBefore);
        emit log_named_uint("           ETH BALANCE AFTER:", address(this).balance);
        emit log_named_uint("           WETH BALANCE BEFORE:", balanceWETHBefore);
        emit log_named_uint("           WETH BALANCE AFTER:", deployer.weth().balanceOf(address(this)));
    }


    
}
