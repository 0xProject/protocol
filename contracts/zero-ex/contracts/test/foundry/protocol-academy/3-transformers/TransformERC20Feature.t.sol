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

import "../utils/DeployZeroEx.sol";
import "@0x/contracts-erc20/contracts/src/v06/IEtherTokenV06.sol";
import "src/features/TransformERC20Feature.sol";
import "src/external/TransformerDeployer.sol";
import "src/transformers/WethTransformer.sol";
import "src/transformers/FillQuoteTransformer.sol";

import "@0x/contracts-erc20/contracts/src/v06/WETH9.sol";

contract TransformERC20FeatureTest is DeployZeroEx {
    IEtherTokenV06 WETH;

    TransformerDeployer transformerDeployer;
    WethTransformer wethTransformer;
    TransformERC20Feature transformERC20Feature;

    function setUp() public {
        deployZeroEx();
        // Deploy from bytecode as this is Solidity v5
        WETH = IEtherTokenV06(deployCode("foundry-artifacts/WETH9.sol/WETH9.json"));
        emit log_named_address("WETH deployed at", address(WETH));
    }

    function testMigration()
        public
    {
        // Note there is a lot here, so feel free to comment out further sections
        // so you can read the logs and traces

        /*
            Deploy TransformERC20Feature
        */

        // Create a new TransformerDeployer, which will deploy all future transformers
        // Owners are typically EOA which are allowed to deploy
        // For this we will use this current contract address
        address[] memory owners = new address[](1);
        owners[0] = address(this);
        transformerDeployer = new TransformerDeployer(owners);
        emit log_named_address("TransformerDeployer deployed at", address(transformerDeployer));


        transformERC20Feature = new TransformERC20Feature();
        emit log_named_address("TransformERC20Feature deployed at", address(transformERC20Feature));

        // Migrate 0x EP and initialize the TransformERC20Feature
        // Remember this performs a delegatecall and registers function selectors
        //     function migrate(address target, bytes calldata data, address newOwner)
        IZERO_EX.migrate(
            address(transformERC20Feature),
            // Use encodeWithSelector to generate low level call data with the required arguments
            // <function selector><arg1> 
            //  The required migration function to call is the following:
            //     function migrate(address transformerDeployer)
            //  e.g ce5494bb00000000000000000000000042997ac9251e5bb0a61f4ff790e5b991ea07fd9b
            //  try: cast calldata 'migrate(address)' '0x42997ac9251e5bb0a61f4ff790e5b991ea07fd9b'
            abi.encodeWithSelector(transformERC20Feature.migrate.selector, address(transformerDeployer)),
            address(this)
        );

        // As part of the migration process a FlashWallet was generated inside of the 0x EP context
        emit log_named_address("FlashWallet deployed at", address(IZERO_EX.getTransformWallet()));
        // Homework: Recall why transformERC20Feature.getTransformWallet() returns address(0)

        /*
            Deploy a WETH transformer
        */

        // Typically the code to deployed is passed in off-chain, so we will emulate something similar
        // by using vm.getCode cheatcode.
        wethTransformer = WethTransformer(transformerDeployer.deploy(
            abi.encodePacked(
                // Deploy the WethTransformer code
                vm.getCode("foundry-artifacts/WethTransformer.sol/WethTransformer.json"),
                // WethTransformer takes WETH address as a constructor argument
                abi.encode(address(WETH))
            )
        ));
        assertEq(address(wethTransformer.weth()), address(WETH));
        emit log_named_address("WethTransformer deployed at", address(IZERO_EX.getTransformWallet()));

        // Not much we can do with just a WethTransformer, I guess we could go ETH->WETH with it
        // Cheat code to give this contract 1e18 ETH
        vm.deal(address(this), 1e18);
        
        // Deployment nonce is 1 as it is the first contract TransformerDeployer deployed
        // let's assert that is true
        assertEq(
            LibERC20Transformer.getDeployedAddress(address(transformerDeployer), 1),
            address(wethTransformer)
        );

        /*
            Perform a ETH->WETH transformation
        */

        // Create our list of transformations, this will just have a WethTransformer
        ITransformERC20Feature.Transformation[] memory transformations = new ITransformERC20Feature.Transformation[](1);
        transformations[0].deploymentNonce = 1;
        transformations[0].data = abi.encode(LibERC20Transformer.ETH_TOKEN_ADDRESS, 1e18);

        IZERO_EX.transformERC20{value: 1e18}(
            // input token
            IERC20TokenV06(LibERC20Transformer.ETH_TOKEN_ADDRESS),
            // output token
            IERC20TokenV06(address(WETH)),
            // input token amount
            1e18,
            // min output token amount
            1e18,
            // list of transform
            transformations
        );
        assertEq(WETH.balanceOf(address(this)), 1e18);

        /*
            Perform a WETH->ETH transformation
        */

        // Let's go backwards, remember we need to set the approval of WETH to the 0x EP
        WETH.approve(address(IZERO_EX), uint256(-1));
        // Override the data in the previous transformation
        transformations[0].data = abi.encode(address(WETH), 1e18);
        // Note: No { value } here as it's a token
        IZERO_EX.transformERC20(
            // input token
            IERC20TokenV06(address(WETH)),
            // output token
            IERC20TokenV06(LibERC20Transformer.ETH_TOKEN_ADDRESS),
            // input token amount
            1e18,
            // min output token amount
            1e18,
            // list of transform
            transformations
        );

        /*
            Deploy FillQuoteTransformer and BridgeAdapter
        */

        // At this time I would show how to do a ETH->USDC trade
        // but we need to set up more of the world, or to run in forked mode
        // with an AMM (find this in BasicSwapForked.t.sol)

        // Instead let's just deploy the FQT and BridgeAdapter and as homework
        // you might explore running in forked mode and using transformations
        address bridgeAdapter = deployCode("foundry-artifacts/BridgeAdapter.sol/BridgeAdapter.json", abi.encode(address(WETH)));
        FillQuoteTransformer fillQuoteTransformer = FillQuoteTransformer(transformerDeployer.deploy(
            abi.encodePacked(
                // Deploy the FillQuoteTransformer code
                vm.getCode("foundry-artifacts/FillQuoteTransformer.sol/FillQuoteTransformer.json"),
                // FillQuoteTransformer takes the BridgeAdapter and ZeroEx address as arguments
                abi.encode(bridgeAdapter, address(ZERO_EX))
            )
        ));
        assertEq(address(fillQuoteTransformer.bridgeAdapter()), bridgeAdapter);
        assertEq(
            LibERC20Transformer.getDeployedAddress(address(transformerDeployer), 2),
            address(fillQuoteTransformer)
        );

    }

    // Note this is needed as the test is a contract, and to receive ETH 
    // it needs to declare a receive function as per the Solidity requirements
    receive() external payable {}

}
