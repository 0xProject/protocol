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

import "../utils/ForkUtils.sol";
import "../utils/TestUtils.sol";
import "src/IZeroEx.sol";
import "@0x/contracts-erc20/contracts/src/v06/IEtherTokenV06.sol";
import "src/features/TransformERC20Feature.sol";
import "src/external/TransformerDeployer.sol";
import "src/transformers/WethTransformer.sol";
import "src/transformers/FillQuoteTransformer.sol";
import "src/transformers/bridges/BridgeProtocols.sol";
import "src/features/OtcOrdersFeature.sol";

contract SwapEthForERC20Test is Test, ForkUtils, TestUtils {
    function setUp() public {
        //get out addresses.json file that defines contract addresses for each chain we are currently deployed on
        _setup();
    }

    function test_swapEthForERC20OnUniswap() public {
        log_string("SwapEthForERC20OnUniswap");
        for (uint256 i = 0; i < chains.length; i++) {
            //skip fantom/avax failing test
            if (i == 3 || i == 4) {
                continue;
            }
            vm.selectFork(forkIds[chains[i]]);
            log_named_string("  Selecting Fork On", chains[i]);
            labelAddresses(
                chains[i],
                indexChainsByChain[chains[i]],
                getTokens(i),
                getContractAddresses(i),
                getLiquiditySourceAddresses(i)
            );
            swapOnUniswap(getTokens(i), getContractAddresses(i), getLiquiditySourceAddresses(i));
        }
    }

    /* solhint-disable function-max-lines */
    function swapOnUniswap(
        TokenAddresses memory tokens,
        ContractAddresses memory addresses,
        LiquiditySources memory sources
    ) public onlyForked {
        // Create our list of transformations, let's do WethTransformer and FillQuoteTransformer
        ITransformERC20Feature.Transformation[]
            memory transformations = new ITransformERC20Feature.Transformation[](2);

        /*//////////////////////////////////////////////////////////////
                                WethTransformer
        //////////////////////////////////////////////////////////////*/

        // Use our cheeky search helper to find the nonce rather than hardcode it
        transformations[0].deploymentNonce = _findTransformerNonce(
            address(addresses.transformers.wethTransformer),
            address(addresses.exchangeProxyTransformerDeployer)
        );
        emit log_named_uint("           WethTransformer nonce", transformations[0].deploymentNonce);
        createNewFQT(
            tokens.WrappedNativeToken,
            addresses.exchangeProxy,
            addresses.exchangeProxyTransformerDeployer
        );
        // Set the first transformation to transform ETH into WETH
        transformations[0].data = abi.encode(LibERC20Transformer.ETH_TOKEN_ADDRESS, 1e18);

        /*//////////////////////////////////////////////////////////////
                                FillQuoteTransformer
        //////////////////////////////////////////////////////////////*/

        transformations[1].deploymentNonce = _findTransformerNonce(
            address(fillQuoteTransformer),
            address(addresses.exchangeProxyTransformerDeployer)
        );
        emit log_named_uint("           FillQuoteTransformer nonce", transformations[1].deploymentNonce);
        // Set up the FillQuoteTransformer data
        FillQuoteTransformer.TransformData memory fqtData;
        fqtData.side = FillQuoteTransformer.Side.Sell;
        fqtData.sellToken = IERC20TokenV06(address(tokens.WrappedNativeToken));
        fqtData.buyToken = IERC20TokenV06(address(tokens.USDT));
        // the FQT has a sequence, e.g first RFQ then Limit then Bridge
        // since solidity doesn't support arrays of different types, this is one simple solution
        // We use a Bridge order type here as we will fill on UniswapV2
        fqtData.fillSequence = new FillQuoteTransformer.OrderType[](1);
        fqtData.fillSequence[0] = FillQuoteTransformer.OrderType.Bridge;
        // The amount to fill
        fqtData.fillAmount = 1e18;

        /*//////////////////////////////////////////////////////////////
                                Sampling
        //////////////////////////////////////////////////////////////*/

        uint256 amountOut;
        if(sources.UniswapV2Router != address(0)) {
            amountOut = sampleUniswapV2(
                fqtData.fillAmount,
                address(fqtData.sellToken),
                address(fqtData.buyToken),
                sources.UniswapV2Router
            );
        }
        else {
            emt log_string("Liquidity Source not available");
        }

        /*//////////////////////////////////////////////////////////////
                                BridgeAdapter
        //////////////////////////////////////////////////////////////*/
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
        // Set this low as the price of ETH/USDT can change
        order.makerTokenAmount = amountOut;
        // The data needed specifically for the source to fill,
        // e.g for UniswapV2 it is the router contract and a path. See MixinUniswapV2
        address[] memory uniPath = new address[](2);
        uniPath[0] = address(tokens.WrappedNativeToken);
        uniPath[1] = address(tokens.USDT);
        order.bridgeData = abi.encode(address(sources.UniswapV2Router), uniPath);
        fqtData.bridgeOrders[0] = order;
        // Now encode the FQT data into the transformation
        transformations[1].data = abi.encode(fqtData);

        vm.deal(address(this), 1e18);
        uint256 balanceETHBefore = address(this).balance;
        uint256 balanceERC20Before = IERC20TokenV06(tokens.USDT).balanceOf(address(this));

        IZeroEx(payable(addresses.exchangeProxy)).transformERC20{value: 1e18}(
            // input token
            IERC20TokenV06(LibERC20Transformer.ETH_TOKEN_ADDRESS),
            // output token
            IERC20TokenV06(address(tokens.USDT)),
            // input token amount
            1e18,
            // min output token amount
            order.makerTokenAmount,
            // list of transform
            transformations
        );

        log_named_uint("        NativeAsset balance before", balanceETHBefore);
        log_named_uint("        ERC-20 balance before", balanceERC20Before);
        log_named_uint("        NativeAsset balance after", balanceETHBefore - address(this).balance);
        log_named_uint(
            "        ERC-20 balance after",
            IERC20TokenV06(tokens.USDT).balanceOf(address(this)) - balanceERC20Before
        );
        assert(IERC20TokenV06(tokens.USDT).balanceOf(address(this)) > 0);
    }

    /* solhint-enable function-max-lines */

    // get a real quote from uniswapV2
    function sampleUniswapV2(
        uint256 amount,
        address takerToken,
        address makerToken,
        address router
    ) public returns (uint256 makerTokenAmounts) {
        address[] memory path = new address[](2);
        path[0] = address(takerToken);
        path[1] = address(makerToken);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;
        uint256 out = sampleSellsFromUniswapV2(router, path, amounts)[0];

        log_string("       Sampling UniswapV2 for tokens");
        log_named_address("        ", takerToken);
        log_string("           -> ");
        log_named_address("        ", makerToken);
        return out;
    }

    // get a real quote from uniswapV3
    function sampleUniswapV3(
        uint256 amount,
        address takerToken,
        address makerToken,
        address router
    ) public returns (uint256 makerTokenAmounts) {
        IERC20TokenV06[] memory path = new IERC20TokenV06[](2);
        path[0] = IERC20TokenV06(takerToken);
        path[1] = IERC20TokenV06(makerToken);
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;
        (bytes[] memory uniswapPaths, uint256[] memory uniswapGasUsed, uint256[] memory makerTokenAmounts) = sampleSellsFromUniswapV3(IUniswapV3QuoterV2(router), path, amounts);

        log_string("       Sampling UniswapV3 for tokens");
        log_named_address("        ", takerToken);
        log_string("           -> ");
        log_named_address("        ", makerToken);
        return makerTokenAmounts[0];
    }
}
