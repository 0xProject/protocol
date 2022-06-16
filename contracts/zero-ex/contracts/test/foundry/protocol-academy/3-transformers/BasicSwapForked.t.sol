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

import "../utils/ForkUtils.sol";
import "../utils/TestUtils.sol";
import "src/IZeroEx.sol";
import "@0x/contracts-erc20/contracts/src/v06/IEtherTokenV06.sol";
import "src/features/TransformERC20Feature.sol";
import "src/external/TransformerDeployer.sol";
import "src/transformers/WethTransformer.sol";
import "src/transformers/FillQuoteTransformer.sol";
import "src/transformers/bridges/BridgeProtocols.sol";
import "src/transformers/bridges/BridgeAdapter.sol";

/*
    This test must be run in forked mode
    e.g forge test -vvvv -m 'testBasicSwap' -f ETH_RPC_URL
    It is also helpful to have an Etherscan API key exported
    export ETHERSCAN_API_KEY=
    as Foundry will fetch source code and names
*/

contract BasicSwapForkedTest is
    ForkUtils,
    TestUtils
{
    IZeroEx public IZERO_EX = IZeroEx(0xDef1C0ded9bec7F1a1670819833240f027b25EfF);
    IEtherTokenV06 WETH = IEtherTokenV06(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);

    // These addresses are taken from contract-addresses for Ethereum Mainnet
    TransformerDeployer transformerDeployer = TransformerDeployer(0x39dCe47a67aD34344EAB877eaE3Ef1FA2a1d50Bb);
    WethTransformer wethTransformer = WethTransformer(0xb2bc06a4EfB20FC6553a69Dbfa49B7bE938034A7);
    // Note this may be outdated as it is often updated
    FillQuoteTransformer fillQuoteTransformer = FillQuoteTransformer(0xADBE39F2988A8Be1C1120F05e28CC888b150c8a6);

    function setUp()
        public
        onlyForked()
    {
        // HACK we deploy some fake transformers just so Foundry
        // can detect these contracts for decoding
        new WethTransformer(IEtherTokenV06(address(0)));
        vm.label(address(wethTransformer), "WethTransformer");
        new FillQuoteTransformer(IBridgeAdapter(address(0)), INativeOrdersFeature(address(0)));
        vm.label(address(fillQuoteTransformer), "FillQuoteTransformer");
        new BridgeAdapter(IEtherTokenV06(address(0)));
        vm.label(address(fillQuoteTransformer.bridgeAdapter()), "BridgeAdapter");
        vm.label(address(IZERO_EX.getTransformWallet()), "FlashWallet");
    }

    function testBasicSwap()
        public
        onlyForked()
    {
        IERC20TokenV06 USDC = IERC20TokenV06(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
        // Create our list of transformations, let's do WethTransformer and FillQuoteTransformer
        ITransformERC20Feature.Transformation[] memory transformations = new ITransformERC20Feature.Transformation[](2);
        // Use our cheeky search helper to find the nonce rather than hardcode it
        //  hint: it's 6 for WethTransformer and 22 for this FillQuoteTransformer
        transformations[0].deploymentNonce = _findTransformerNonce(address(wethTransformer), address(transformerDeployer));
        transformations[1].deploymentNonce = _findTransformerNonce(address(fillQuoteTransformer), address(transformerDeployer));

        emit log_named_uint("WethTransformer nonce", transformations[0].deploymentNonce);
        emit log_named_uint("FillQuoteTransformer nonce", transformations[1].deploymentNonce);

        // Set the first transformation to transform ETH into WETH
        transformations[0].data = abi.encode(LibERC20Transformer.ETH_TOKEN_ADDRESS, 1e18);

        // Set up the FillQuoteTransformer data
        FillQuoteTransformer.TransformData memory fqtData;
        fqtData.side = FillQuoteTransformer.Side.Sell;
        // FQT deals with tokens, not ETH, so it needs a WETH transformer
        // to be applied beforehand
        fqtData.sellToken = IERC20TokenV06(address(WETH));
        fqtData.buyToken =  IERC20TokenV06(address(USDC));
        // the FQT has a sequence, e.g first RFQ then Limit then Bridge
        // since solidity doesn't support arrays of different types, this is one simple solution
        // We use a Bridge order type here as we will fill on UniswapV2
        fqtData.fillSequence = new FillQuoteTransformer.OrderType[](1);
        fqtData.fillSequence[0] = FillQuoteTransformer.OrderType.Bridge;
        // The amount to fill
        fqtData.fillAmount = 1e18;
        // Now let's set up a UniswapV2 fill
        fqtData.bridgeOrders = new IBridgeAdapter.BridgeOrder[](1);
        IBridgeAdapter.BridgeOrder memory order;
        // The ID is shifted so we can concat <PROTOCOL><NAME>
        // e.g <UniswapV2Protocol><UniswapV2>
        // or  <UniswapV2Protocol><SushiSwap> for forks
        order.source = bytes32(uint256(BridgeProtocols.UNISWAPV2) << 128);
        // How much we want to fill on this order, which can be different to the total
        // e.g 50/50 split this would be half
        order.takerTokenAmount = 1e18;
        // Set this low as the price of ETH/USDC can change
        order.makerTokenAmount = 1;
        // The data needed specifically for the source to fill,
        // e.g for UniswapV2 it is the router contract and a path. See MixinUniswapV2
        address[] memory uniPath = new address[](2);
        uniPath[0] = address(WETH);
        uniPath[1] = address(USDC);
        order.bridgeData = abi.encode(address(0xf164fC0Ec4E93095b804a4795bBe1e041497b92a), uniPath);
        fqtData.bridgeOrders[0] = order;
        // Now encode the FQT data into the transformation
        transformations[1].data = abi.encode(fqtData);


        // Now let's do it!
        // Give ourselves 1e18 ETH
        vm.deal(address(this), 1e18);
        IZERO_EX.transformERC20{value: 1e18}(
            // input token
            IERC20TokenV06(LibERC20Transformer.ETH_TOKEN_ADDRESS),
            // output token
            IERC20TokenV06(address(USDC)),
            // input token amount
            1e18,
            // min output token amount, set this low as ETH/USDC price will move
            1,
            // list of transform
            transformations
        );
        // Hoollly heck we bought some USDC
        assertGt(USDC.balanceOf(address(this)), 0);
        emit log_named_uint("USDC bought", USDC.balanceOf(address(this)));

        /*
            Homework
            Try the following:
            * make this UniswapV2 trade go ETH->DAI->USDC
            * combine multiple trades, e.g Uniswap V2 ETH->USDC and ETH->DAI->USDC
            * create a UniswapV3 trade
        */
    }
}
