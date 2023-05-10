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

pragma solidity >=0.6;

pragma experimental ABIEncoderV2;

import "../utils/ForkUtils.sol";
import "../utils/TestUtils.sol";

contract SwapERC20ForERC20Test is Test, ForkUtils, TestUtils {
    function setUp() public {
        string memory root = vm.projectRoot();
        string memory path = string(abi.encodePacked(root, "/", "tests/addresses/ContractAddresses.json"));
        json = vm.readFile(path);

        for (uint256 i = 0; i < chains.length; i++) {
            forkIds[chains[i]] = vm.createFork(vm.rpcUrl(chains[i]));
        }
        for (uint256 i = 0; i < chains.length; i++) {
            chainsByChainId[chains[i]] = chainIds[i];
            indexChainsByChain[chains[i]] = indexChainIds[i];
            bytes memory details = json.parseRaw(indexChainIds[i]);
            addresses = abi.decode(details, (ContractAddresses));
        }
    }

    function test_swapERC20ForERC20OnKyberElastic() public {
        for (uint256 i = 0; i < chains.length; i++) {
            // kyberelastic mixin not added to fantom yet
            if (i == 4) {
                continue;
            }
            vm.selectFork(forkIds[chains[i]]);
            labelAddresses(
                chains[i],
                indexChainsByChain[chains[i]],
                getTokens(i),
                getContractAddresses(i),
                getLiquiditySourceAddresses(i)
            );
            swapOnKyberElastic(getTokens(i), getContractAddresses(i), getLiquiditySourceAddresses(i));
        }
    }

    function test_swapERC20ForERC20OnTraderJoeV2() public {
        for (uint256 i = 0; i < chains.length; i++) {
            // TraderJoeV2 mixin only enabled on Avalanche and Arbitrum
            if (i != 3 && i != 6) {
                continue;
            }
            vm.selectFork(forkIds[chains[i]]);
            labelAddresses(
                chains[i],
                indexChainsByChain[chains[i]],
                getTokens(i),
                getContractAddresses(i),
                getLiquiditySourceAddresses(i)
            );
            swapOnTraderJoeV2(getTokens(i), getContractAddresses(i), getLiquiditySourceAddresses(i));
        }
    }

    function swapOnTraderJoeV2(
        TokenAddresses memory tokens,
        ContractAddresses memory addresses,
        LiquiditySources memory sources
    ) public onlyForked {
        if (sources.TraderJoeV2Router == address(0)) {
            emit log_string("TraderJoeV2Router not available on this chain");
            return;
        }
        if (sources.TraderJoeV2Quoter == address(0)) {
            emit log_string("TraderJoeV2Quoter not available on this chain");
            return;
        }

        FillQuoteTransformer.TransformData memory fqtData;
        fqtData.side = FillQuoteTransformer.Side.Sell;
        fqtData.sellToken = IERC20Token(address(tokens.USDC));
        fqtData.buyToken = IERC20Token(address(tokens.USDT));
        fqtData.fillSequence = new FillQuoteTransformer.OrderType[](1);
        fqtData.fillSequence[0] = FillQuoteTransformer.OrderType.Bridge;
        fqtData.fillAmount = 1e6;

        (uint256 amountOut, uint256 binStep, uint256 version) = sampleTraderJoeV2(
            fqtData.fillAmount,
            address(fqtData.sellToken),
            address(fqtData.buyToken),
            sources.TraderJoeV2Quoter
        );
        log_named_uint("amountOut", amountOut);

        IBridgeAdapter.BridgeOrder memory order;
        {
            address[] memory tokenPath = new address[](2);
            tokenPath[0] = address(fqtData.sellToken);
            tokenPath[1] = address(fqtData.buyToken);
            uint256[] memory binSteps = new uint256[](1);
            binSteps[0] = binStep;
            uint256[] memory versions = new uint256[](1);
            versions[0] = version;
            order.bridgeData = abi.encode(address(sources.TraderJoeV2Router), tokenPath, binSteps, versions);
        }

        order.source = bytes32(uint256(BridgeProtocols.TRADERJOEV2) << 128);
        order.takerTokenAmount = fqtData.fillAmount;
        order.makerTokenAmount = amountOut;

        fqtData.bridgeOrders = new IBridgeAdapter.BridgeOrder[](1);
        fqtData.bridgeOrders[0] = order;

        settleAndLogBalances(fqtData, tokens, addresses);
    }

    function swapOnKyberElastic(
        TokenAddresses memory tokens,
        ContractAddresses memory addresses,
        LiquiditySources memory sources
    ) public onlyForked {
        if (sources.KyberElasticQuoter == address(0)) {
            emit log_string("KyberElasticQuoter not available on this chain");
            return;
        }
        if (sources.KyberElasticRouter == address(0)) {
            emit log_string("KyberElasticRouter not available on this chain");
            return;
        }
        if (sources.KyberElasticPool == address(0)) {
            emit log_string("KyberElasticPool not available on this chain");
            return;
        }

        FillQuoteTransformer.TransformData memory fqtData;
        fqtData.side = FillQuoteTransformer.Side.Sell;
        fqtData.sellToken = IERC20Token(address(tokens.USDC));
        fqtData.buyToken = IERC20Token(address(tokens.USDT));
        fqtData.fillSequence = new FillQuoteTransformer.OrderType[](1);
        fqtData.fillSequence[0] = FillQuoteTransformer.OrderType.Bridge;
        fqtData.fillAmount = 1e6;

        (uint256 amountOut, bytes memory path) = sampleKyberElastic(
            fqtData.fillAmount,
            address(fqtData.sellToken),
            address(fqtData.buyToken),
            sources.KyberElasticQuoter,
            address(sources.KyberElasticPool)
        );

        log_named_uint("amountOut", amountOut);

        fqtData.bridgeOrders = new IBridgeAdapter.BridgeOrder[](1);
        IBridgeAdapter.BridgeOrder memory order;
        order.source = bytes32(uint256(BridgeProtocols.KYBERELASTIC) << 128);
        order.takerTokenAmount = 1e6;
        order.makerTokenAmount = amountOut;
        order.bridgeData = abi.encode(address(sources.KyberElasticRouter), path);
        fqtData.bridgeOrders[0] = order;

        settleAndLogBalances(fqtData, tokens, addresses);
    }

    function sampleKyberElastic(
        uint256 amount,
        address takerToken,
        address makerToken,
        address quoter,
        address pool
    ) private returns (uint256 makerTokenAmount, bytes memory path) {
        log_string("       Sampling KyberElastic for tokens");
        log_named_address("        ", takerToken);
        log_string("           -> ");
        log_named_address("        ", makerToken);
        log_named_address(" quoter", quoter);
        log_named_address("pool:", pool);
        address[] memory tokenPath = new address[](2);
        tokenPath[0] = address(takerToken);
        tokenPath[1] = address(makerToken);
        IKyberElasticQuoter kyberQuoter = IKyberElasticQuoter(quoter);
        address[] memory poolPath = new address[](1);
        poolPath[0] = address(pool);
        path = _toKyberElasticPath(tokenPath, poolPath);
        (uint256 amountOut, , , ) = kyberQuoter.quoteExactInput(path, amount);
        return (amountOut, path);
    }

    function sampleTraderJoeV2(
        uint256 amount,
        address takerToken,
        address makerToken,
        address quoter
    ) private returns (uint256 makerTokenAmount, uint256 binStep, uint256 version) {
        log_string("Sampling TraderJoeV2");
        log_named_address("takerToken", takerToken);
        log_named_address("makerToken", makerToken);
        log_named_address("quoter", quoter);

        address[] memory tokenPath = new address[](2);
        tokenPath[0] = takerToken;
        tokenPath[1] = makerToken;

        ITraderJoeV2Quoter.Quote memory quote = ITraderJoeV2Quoter(quoter).findBestPathFromAmountIn(
            tokenPath,
            uint128(amount)
        );

        return (quote.amounts[1], quote.binSteps[0], uint256(quote.versions[0]));
    }

    function deployFQTAndGetDeploymentNonce(
        TokenAddresses memory tokens,
        ContractAddresses memory addresses
    ) private returns (uint32) {
        createNewFQT(tokens.WrappedNativeToken, addresses.exchangeProxy, addresses.exchangeProxyTransformerDeployer);
        return
            _findTransformerNonce(address(fillQuoteTransformer), address(addresses.exchangeProxyTransformerDeployer));
    }

    function settleAndLogBalances(
        FillQuoteTransformer.TransformData memory fqtData,
        TokenAddresses memory tokens,
        ContractAddresses memory addresses
    ) private {
        ITransformERC20Feature.Transformation[] memory transformations = new ITransformERC20Feature.Transformation[](1);
        transformations[0].deploymentNonce = deployFQTAndGetDeploymentNonce(tokens, addresses);
        transformations[0].data = abi.encode(fqtData);

        address sellToken = address(fqtData.sellToken);
        address buyToken = address(fqtData.buyToken);

        writeTokenBalance(address(this), sellToken, 1e16);
        uint256 sellTokenBalanceBefore = IERC20Token(sellToken).balanceOf(address(this));
        uint256 buyTokenBalanceBefore = IERC20Token(buyToken).balanceOf(address(this));

        IERC20Token(sellToken).approve(addresses.exchangeProxy, 1e16);
        IZeroEx(payable(addresses.exchangeProxy)).transformERC20(
            IERC20Token(sellToken),
            IERC20Token(buyToken),
            fqtData.fillAmount,
            fqtData.bridgeOrders[0].makerTokenAmount,
            transformations
        );

        log_named_uint("sellToken balance before", sellTokenBalanceBefore);
        log_named_uint("sellToken balance after", IERC20Token(sellToken).balanceOf(address(this)));
        log_named_uint("buyToken balance before", buyTokenBalanceBefore);
        log_named_uint("buyToken balance after", IERC20Token(buyToken).balanceOf(address(this)));
    }
}
