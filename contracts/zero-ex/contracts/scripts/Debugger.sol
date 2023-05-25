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
import "@0x/contracts-erc20/contracts/src/v06/LibERC20TokenV06.sol";
import "src/features/TransformERC20Feature.sol";
import "src/external/TransformerDeployer.sol";
import "src/transformers/WethTransformer.sol";
import "src/transformers/FillQuoteTransformer.sol";
import "src/transformers/bridges/BridgeProtocols.sol";
import "src/features/OtcOrdersFeature.sol";

contract TraceCalldata is Test, ForkUtils, TestUtils {
    using LibERC20TokenV06 for IERC20TokenV06;

    function setUp() public {
        _setup();
    }

    function test_traceZeroExCall() public {
        log_string("TraceExchangeProxyCall");
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
            swapWithOtcOrder(getTokens(i), getContractAddresses(i), getLiquiditySourceAddresses(i));
        }
    }

    /* solhint-disable function-max-lines */
    function swapWithOtcOrder(
        TokenAddresses memory tokens,
        ContractAddresses memory addresses,
        LiquiditySources memory sources
    ) public onlyForked {
        IZERO_EX = IZeroEx(addresses.exchangeProxy);
        address taker = address(0xd00d00cAca000000000000000000000000001337);
        vm.label(taker, "API Quote Taker");
        deal(address(tokens.USDT), taker, 100e30);
        //deal(address(tokens.WrappedNativeToken), taker, 100e30);
        vm.startPrank(taker);
        IERC20TokenV06(tokens.USDT).approveIfBelow(address(addresses.exchangeProxy), uint256(-1));
        //IERC20TokenV06(tokens.WrappedNativeToken).approveIfBelow(address(taker), uint256(-1));

        //emit log_address(address(tokens.WrappedNativeToken));
        IERC20TokenV06(tokens.USDT).balanceOf(taker);
        IERC20TokenV06(tokens.WrappedNativeToken).balanceOf(taker);
        (bool success, bytes memory result) = addresses.exchangeProxy.call(
            hex"7a1eb1b9000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec700000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000008ac7230489e8000000000000000000000000000000000000000000000000000000000003dd141a0000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000024000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000008ac7230489e8000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000180000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc200000000000000000000000000000000000000000000000000000003e711b8000000000000000000000000000000000000000000000000008ac7230489e80000000000000000000000000000a3f14cb81e6edb7b1249755dd20e2bfb23597fd70000000000000000000000000000000000000000000000000000000000000000000000000000000000000000d00d00caca0000000000000000000000000013370000000063f50e17000000000000000200000000000000000000000063f50da10000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000001c543148f2a2124e690f19ab0042906b437f954a52b9fbef6019c3968befac860466a819bd38bb6c60c5341f65d3e596d17573c80fc78a3a837d7ed6392b66e783000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000003e711b80000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000180000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec7000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000003e6b1b23900000000000000000000000000000000000000000000000000000003e711b800000000000000000000000000af0b0000f0210d0f421f0009c72406703b50506b0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000d00d00caca0000000000000000000000000013370000000063f50dfb000000000000001f00000000000000000000000063f50da20000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000001beb5fbe9aa7694028216b8d81e613a41a9cf8b9135729d33acf77a692c4b0123547884cb6bae49c9ac885204ae11ce6fd4fff3961c04be142933b0c1b2e99072d869584cd000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007ebba8e3ba63f50e10"
        );
        emit log_named_bytes("", result);
        vm.stopPrank();
    }
}
