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
import "@0x/contracts-erc20/src/IEtherToken.sol";
import "src/features/TransformERC20Feature.sol";
import "src/features/multiplex/MultiplexFeature.sol";
import "src/external/TransformerDeployer.sol";
import "src/transformers/WethTransformer.sol";
import "src/transformers/FillQuoteTransformer.sol";
import "src/transformers/bridges/BridgeProtocols.sol";
import "src/features/OtcOrdersFeature.sol";

contract MultiplexRfqtTest is Test, ForkUtils, TestUtils {
    using LibERC20TokenV06 for IERC20Token;
    using LibERC20TokenV06 for IEtherToken;

    function setUp() public {
        _setup();
    }

    function test_swapEthForUSDTThroughFqtOtcs() public {
        log_string("SwapEthForUSDTThroughFqtOtc");
        /* */
        for (uint256 i = 0; i < 1; i++) {
            //skip fantom/avax failing test
            if (i == 3 || i == 4) {
                continue;
            }
            vm.selectFork(forkIds[chains[i]]);
            log_named_string("  Selecting Fork On", chains[i]);
            vm.deal(address(this), 1e18);
            labelAddresses(
                chains[i],
                indexChainsByChain[chains[i]],
                getTokens(i),
                getContractAddresses(i),
                getLiquiditySourceAddresses(i)
            );

            //redeploy and migrate multiplexFeature and OtcOrders for logging

            MultiplexFeature multiplexFeature = new MultiplexFeature(
                address(IZERO_EX),
                IEtherToken(tokens.WrappedNativeToken),
                ILiquidityProviderSandbox(addresses.exchangeProxyLiquidityProviderSandbox),
                address(0), // uniswapFactory
                address(0), // sushiswapFactory
                bytes32(0), // uniswapPairInitCodeHash
                bytes32(0) // sushiswapPairInitCodeHash
            );

            OtcOrdersFeature otcOrdersFeature = new OtcOrdersFeature(
                address(addresses.exchangeProxy),
                tokens.WrappedNativeToken
            );

            vm.label(address(multiplexFeature), "zeroEx/NewMultiplexFeature");
            vm.label(address(otcOrdersFeature), "zeroEx/NewOtcOrdersFeature");
            vm.prank(IZeroEx(addresses.exchangeProxy).owner());

            IZeroEx(addresses.exchangeProxy).migrate(
                address(otcOrdersFeature),
                abi.encodeWithSelector(OtcOrdersFeature.migrate.selector),
                address(addresses.exchangeProxy)
            );
            vm.prank(IZeroEx(addresses.exchangeProxy).owner());
            IZeroEx(addresses.exchangeProxy).migrate(
                address(multiplexFeature),
                abi.encodeWithSelector(MultiplexFeature.migrate.selector),
                address(addresses.exchangeProxy)
            );
            swapMultihopOtc(getTokens(i), getContractAddresses(i), getLiquiditySourceAddresses(i));
        }
    }

    /* solhint-disable function-max-lines */

    function swapMultihopOtc(
        TokenAddresses memory tokens,
        ContractAddresses memory addresses,
        LiquiditySources memory sources
    ) public onlyForked {
        IZERO_EX = IZeroEx(addresses.exchangeProxy);

        address[] memory tradeTokens = new address[](3);
        tradeTokens[0] = address(tokens.WrappedNativeToken);
        tradeTokens[1] = address(tokens.USDC);
        tradeTokens[2] = address(tokens.DAI);

        deal(tradeTokens[0], address(this), 1e18);

        tokens.WrappedNativeToken.approveIfBelow(addresses.exchangeProxy, uint(-1));
        uint inputAmount = 1e18;
        uint outputAmount = 5e17;

        IMultiplexFeature.MultiHopSellSubcall[] memory subcalls = new IMultiplexFeature.MultiHopSellSubcall[](2);

        IMultiplexFeature.MultiHopSellSubcall memory subcall1;
        subcall1.id = IMultiplexFeature.MultiplexSubcall.OTC;

        //subcall.data = abi.encode(address[], LibNativeOrder.OtcOrder, LibSignature.Signature);
        (LibNativeOrder.OtcOrder memory order1, LibSignature.Signature memory signature1) = createOtcOrder(
            tokens.WrappedNativeToken,
            tokens.USDC,
            1e18,
            5e17,
            0
        );
        subcall1.data = abi.encode(order1, signature1);

        IMultiplexFeature.MultiHopSellSubcall memory subcall2;
        subcall2.id = IMultiplexFeature.MultiplexSubcall.OTC;
        (LibNativeOrder.OtcOrder memory order2, LibSignature.Signature memory signature2) = createOtcOrder(
            tokens.USDC,
            tokens.DAI,
            5e17,
            5e17,
            1
        );
        subcall2.data = abi.encode(order2, signature2);

        subcalls[0] = subcall1;
        subcalls[1] = subcall2;

        uint balanceBefore = tokens.DAI.balanceOf(address(this));
        emit log_named_uint("DAI Balance Before", balanceBefore);
        emit log_string("Multihop Rfqt: WETH->USDC->DAI");

        /// @dev Sells `sellAmount` of the input token (`tokens[0]`)
        ///      via the given sequence of tokens and calls.
        ///      The last token in `tokens` is the output token that
        ///      will ultimately be sent to `msg.sender`
        /// @param tokens The sequence of tokens to use for the sell,
        ///        i.e. `tokens[i]` will be sold for `tokens[i+1]` via
        ///        `calls[i]`.
        /// @param calls The sequence of calls to use for the sell.
        /// @param sellAmount The amount of `inputToken` to sell.
        /// @param minBuyAmount The minimum amount of output tokens that
        ///        must be bought for this function to not revert.
        /// @return boughtAmount The amount of output tokens bought.
        IZERO_EX.multiplexMultiHopSellTokenForToken(
            // input token[] [input, intermediate, output]
            tradeTokens,
            //array of subcalls [{},{}]
            subcalls,
            // input token amount
            inputAmount,
            // min output token amount
            outputAmount
        );
        uint balanceAfter = tokens.DAI.balanceOf(address(this));
        emit log_named_uint("DAI Balance After", balanceAfter - balanceBefore);
        require(balanceAfter >= 5e17, "Failed: UNDERBOUGHT");
    }

    function createOtcOrder(
        IERC20Token inputToken,
        IERC20Token ouputToken,
        uint128 takerAmount,
        uint128 makerAmount,
        uint bump
    ) public returns (LibNativeOrder.OtcOrder memory order, LibSignature.Signature memory signature) {
        LibNativeOrder.OtcOrder memory order;
        LibSignature.Signature memory signature;
        order.makerToken = ouputToken;
        order.takerToken = inputToken;
        order.takerAmount = takerAmount;
        order.makerAmount = makerAmount;
        uint privateKey;

        (order.maker, privateKey) = _getSigner();

        deal(address(order.makerToken), order.maker, 2e20);
        deal(address(order.takerToken), order.maker, 2e20);

        vm.startPrank(order.maker);
        IERC20Token(order.makerToken).approveIfBelow(addresses.exchangeProxy, 2e20);

        order.taker = address(0);
        order.txOrigin = address(tx.origin);
        order.expiryAndNonce = encodeExpiryAndNonce(order.maker, bump);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, IZERO_EX.getOtcOrderHash(order));

        vm.stopPrank();
        signature.signatureType = LibSignature.SignatureType.EIP712;
        signature.v = v;
        signature.r = r;
        signature.s = s;

        return (order, signature);
    }

    /* solhint-enable function-max-lines */
    function encodeExpiryAndNonce(address maker, uint bump) public returns (uint256) {
        uint256 expiry = (block.timestamp + 120) << 192;
        uint256 bucket = (0 + bump) << 128;
        uint256 nonce = vm.getNonce(maker);
        return expiry | bucket | nonce;
    }
}
