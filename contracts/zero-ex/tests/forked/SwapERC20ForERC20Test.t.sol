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

// import "../../contracts/src/IZeroEx.sol";
// import "../../contracts/src/features/TransformERC20Feature.sol";
// import "../../contracts/src/transformers/FillQuoteTransformer.sol";
// import "../../contracts/src/transformers/bridges/BridgeProtocols.sol";

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
            // kyberelastic mixin not deployed to these chains yet (bsc, fantom, optimism)
            if (i == 1 || i == 4 || i == 5) {
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
        ITransformERC20Feature.Transformation[] memory transformations = new ITransformERC20Feature.Transformation[](2);

        transformations[0].deploymentNonce = _findTransformerNonce(
            address(addresses.transformers.wethTransformer),
            address(addresses.exchangeProxyTransformerDeployer)
        );
        emit log_named_uint("           WethTransformer nonce", transformations[0].deploymentNonce);
        createNewFQT(tokens.WrappedNativeToken, addresses.exchangeProxy, addresses.exchangeProxyTransformerDeployer);
        transformations[0].data = abi.encode(LibERC20Transformer.ETH_TOKEN_ADDRESS, 1e18);
        transformations[1].deploymentNonce = _findTransformerNonce(
            address(fillQuoteTransformer),
            address(addresses.exchangeProxyTransformerDeployer)
        );
        emit log_named_uint("           FillQuoteTransformer nonce", transformations[1].deploymentNonce);

        FillQuoteTransformer.TransformData memory fqtData;
        fqtData.side = FillQuoteTransformer.Side.Sell;
        fqtData.sellToken = IERC20TokenV06(address(tokens.USDC));
        fqtData.buyToken = IERC20TokenV06(address(tokens.USDT));
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
        transformations[1].data = abi.encode(fqtData);

        vm.deal(address(this), 1e18);
        uint256 balanceETHBefore = address(this).balance;
        uint256 balanceERC20Before = IERC20TokenV06(tokens.USDT).balanceOf(address(this));

        writeTokenBalance(address(this), address(tokens.USDC), 1e16);
        uint256 balanceUSDCbefore = IERC20TokenV06(tokens.USDC).balanceOf(address(this));

        IERC20TokenV06(address(tokens.USDC)).approve(addresses.exchangeProxy, 1e16);

        IZeroEx(payable(addresses.exchangeProxy)).transformERC20{value: 1e18}(
            // input token
            IERC20TokenV06(address(tokens.USDC)),
            // output token
            IERC20TokenV06(address(tokens.USDT)),
            // input token amount
            1e6,
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
        log_named_uint("        USDC balance before", balanceUSDCbefore);
        log_named_uint("        USDC balance after", IERC20TokenV06(tokens.USDT).balanceOf(address(tokens.USDC)));
        assert(IERC20TokenV06(tokens.USDT).balanceOf(address(this)) > 0);
    }

    function sampleKyberElastic(
        uint256 amount,
        address takerToken,
        address makerToken,
        address quoter,
        address pool
    ) public returns (uint256 makerTokenAmount, bytes memory path) {
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
}
