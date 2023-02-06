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

import "forge-std/Test.sol";
import "src/external/IFlashWallet.sol";
import "src/features/libs/LibSignature.sol";
import "src/features/libs/LibNativeOrder.sol";
import "src/features/interfaces/IMultiplexFeature.sol";
import "src/features/native_orders/NativeOrdersInfo.sol";
import "src/features/multiplex/MultiplexFeature.sol";
import {ForkUtils} from "utils/ForkUtils.sol";
import "utils/TestUtils.sol";
import "utils/DeployZeroEx.sol";
import "../contracts/test/TestMintTokenERC20Transformer.sol";
import "../contracts/test/tokens/TestMintableERC20Token.sol";
import "../contracts/test/integration/TestUniswapV2Factory.sol";
import "../contracts/test/integration/TestUniswapV2Pool.sol";
import "../contracts/test/integration/TestUniswapV3Factory.sol";
import "../contracts/test/integration/TestUniswapV3Pool.sol";
import "../contracts/test/integration/TestLiquidityProvider.sol";

import "@0x/contracts-erc20/contracts/src/v06/WETH9V06.sol";

contract Multiplex is Test, ForkUtils, TestUtils {
    uint256 private constant MAX_UINT256 = type(uint256).max;
    uint24 private constant POOL_FEE = 1234;

    bytes32 private constant RFQ_ORDER_FILLED_SIG =
        keccak256(
            "RfqOrderFilled("
            "bytes32,"
            "address,"
            "address,"
            "address,"
            "address,"
            "uint128,"
            "uint128,"
            "bytes32"
            ")"
        );

    bytes32 private constant OTC_ORDER_FILLED_SIG =
        keccak256(
            "OtcOrderFilled("
            "bytes32,"
            "address,"
            "address,"
            "address,"
            "address,"
            "uint128,"
            "uint128"
            ")"
        );

    bytes32 private constant EXPIRED_RFQ_ORDER_SIG =
        keccak256(
            "ExpiredRfqOrder("
            "bytes32,"
            "address,"
            "uint64"
            ")"
        );

    bytes32 private constant EXPIRED_OTC_ORDER_SIG =
        keccak256(
            "ExpiredOtcOrder("
            "bytes32,"
            "address,"
            "uint64"
            ")"
        );

    bytes32 private constant TRANSFER_SIG =
        keccak256(
            "Transfer("
            "address,"
            "address,"
            "address,"
            "uint256"
            ")"
        );

    bytes32 private constant MINT_TRANSFORM_SIG =
        keccak256(
            "MintTransform("
            "address,"
            "address,"
            "address,"
            "address,"
            "bytes,"
            "uint256,"
            "uint256"
            ")"
        );

    struct LogDescription {
        bytes32[] topics;
        bytes data;
        bytes dataMask;
    }

    DeployZeroEx.ZeroExDeployed private zeroExDeployed;
    IFlashWallet private flashWallet;
    IERC20TokenV06 private shib;
    IERC20TokenV06 private dai;
    IERC20TokenV06 private zrx;
    IEtherTokenV06 private weth;

    TestUniswapV2Factory private sushiFactory;
    TestUniswapV2Factory private uniV2Factory;
    TestUniswapV3Factory private uniV3Factory;
    TestLiquidityProvider private liquidityProvider;
    uint256 private transformerNonce;

    address private signerAddress;
    uint256 private signerKey;

    modifier explain(string memory testName) {
        log_string(testName);
        vm.recordLogs();
        _;
    }

    function infiniteApprovals() private {
        shib.approve(address(zeroExDeployed.zeroEx), MAX_UINT256);
        dai.approve(address(zeroExDeployed.zeroEx), MAX_UINT256);
        zrx.approve(address(zeroExDeployed.zeroEx), MAX_UINT256);
        weth.approve(address(zeroExDeployed.zeroEx), MAX_UINT256);
    }

    function setUp() public {
        // TODO signer utilities shouldn't be in ForkUtils
        (signerAddress, signerKey) = getSigner();

        sushiFactory = new TestUniswapV2Factory();
        uniV2Factory = new TestUniswapV2Factory();
        uniV3Factory = new TestUniswapV3Factory();
        liquidityProvider = new TestLiquidityProvider();

        zeroExDeployed = new DeployZeroEx(
            DeployZeroEx.ZeroExDeployConfiguration({
                uniswapFactory: address(uniV2Factory),
                sushiswapFactory: address(sushiFactory),
                uniswapV3Factory: address(uniV3Factory),
                uniswapPairInitCodeHash: uniV2Factory.POOL_INIT_CODE_HASH(),
                sushiswapPairInitCodeHash: sushiFactory.POOL_INIT_CODE_HASH(),
                uniswapV3PoolInitCodeHash: uniV3Factory.POOL_INIT_CODE_HASH(),
                logDeployed: false
            })
        ).deployZeroEx();

        transformerNonce = zeroExDeployed.transformerDeployer.nonce();
        vm.prank(zeroExDeployed.transformerDeployer.authorities(0));
        zeroExDeployed.transformerDeployer.deploy(type(TestMintTokenERC20Transformer).creationCode);

        flashWallet = zeroExDeployed.zeroEx.getTransformWallet();

        shib = IERC20TokenV06(address(new TestMintableERC20Token()));
        dai = IERC20TokenV06(address(new TestMintableERC20Token()));
        zrx = IERC20TokenV06(address(new TestMintableERC20Token()));
        weth = zeroExDeployed.weth;

        infiniteApprovals();
        vm.startPrank(signerAddress);
        infiniteApprovals();
        vm.stopPrank();

        vm.deal(address(this), 10e18);
    }

    // TODO refactor some of these utility functions out into helper contract

    function makeTestRfqOrder(
        IERC20TokenV06 makerToken,
        IERC20TokenV06 takerToken
    ) private returns (LibNativeOrder.RfqOrder memory order) {
        order = LibNativeOrder.RfqOrder({
            makerToken: makerToken,
            takerToken: takerToken,
            makerAmount: 1e18,
            takerAmount: 1e18,
            maker: signerAddress,
            taker: address(this),
            txOrigin: tx.origin,
            pool: 0x0000000000000000000000000000000000000000000000000000000000000000,
            expiry: uint64(block.timestamp + 60),
            salt: 123
        });
        mintTo(address(order.makerToken), order.maker, order.makerAmount);
    }

    function makeTestRfqOrder() private returns (LibNativeOrder.RfqOrder memory order) {
        return makeTestRfqOrder(zrx, dai);
    }

    function makeTestOtcOrder() private returns (LibNativeOrder.OtcOrder memory order) {
        order = LibNativeOrder.OtcOrder({
            makerToken: zrx,
            takerToken: dai,
            makerAmount: 1e18,
            takerAmount: 1e18,
            maker: signerAddress,
            taker: address(this),
            txOrigin: tx.origin,
            expiryAndNonce: ((block.timestamp + 60) << 192) | 1
        });
        mintTo(address(order.makerToken), order.maker, order.makerAmount);
    }

    function makeRfqSubcall(
        LibNativeOrder.RfqOrder memory order,
        uint256 sellAmount
    ) private view returns (IMultiplexFeature.BatchSellSubcall memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            signerKey,
            zeroExDeployed.features.nativeOrdersFeature.getRfqOrderHash(order)
        );
        LibSignature.Signature memory sig = LibSignature.Signature(LibSignature.SignatureType.EIP712, v, r, s);

        return
            IMultiplexFeature.BatchSellSubcall({
                id: IMultiplexFeature.MultiplexSubcall.RFQ,
                sellAmount: sellAmount,
                data: abi.encode(order, sig)
            });
    }

    function makeRfqSubcall(
        LibNativeOrder.RfqOrder memory order
    ) private view returns (IMultiplexFeature.BatchSellSubcall memory) {
        return makeRfqSubcall(order, order.takerAmount);
    }

    function makeOtcSubcall(
        LibNativeOrder.OtcOrder memory order
    ) private view returns (IMultiplexFeature.BatchSellSubcall memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            signerKey,
            zeroExDeployed.features.otcOrdersFeature.getOtcOrderHash(order)
        );
        LibSignature.Signature memory sig = LibSignature.Signature(LibSignature.SignatureType.EIP712, v, r, s);

        return
            IMultiplexFeature.BatchSellSubcall({
                id: IMultiplexFeature.MultiplexSubcall.OTC,
                sellAmount: order.takerAmount,
                data: abi.encode(order, sig)
            });
    }

    function makeUniswapV2MultiHopSubcall(
        address[] memory tokens,
        bool isSushi
    ) private pure returns (IMultiplexFeature.MultiHopSellSubcall memory) {
        return
            IMultiplexFeature.MultiHopSellSubcall({
                id: IMultiplexFeature.MultiplexSubcall.UniswapV2,
                data: abi.encode(tokens, isSushi)
            });
    }

    function makeUniswapV2BatchSubcall(
        address[] memory tokens,
        uint256 sellAmount,
        bool isSushi
    ) private pure returns (IMultiplexFeature.BatchSellSubcall memory) {
        return
            IMultiplexFeature.BatchSellSubcall({
                id: IMultiplexFeature.MultiplexSubcall.UniswapV2,
                sellAmount: sellAmount,
                data: abi.encode(tokens, isSushi)
            });
    }

    function encodePathUniswapV3(address[] memory tokens) private pure returns (bytes memory path) {
        path = new bytes(tokens.length * 23 - 3);
        for (uint256 i = 0; i < tokens.length; i++) {
            assembly {
                let p := add(add(path, 32), mul(i, 23))
                if gt(i, 0) {
                    mstore(sub(p, 3), shl(232, POOL_FEE))
                }

                let a := add(add(tokens, 32), mul(i, 32))
                mstore(p, shl(96, mload(a)))
            }
        }
    }

    function makeUniswapV3MultiHopSubcall(
        address[] memory tokens
    ) private pure returns (IMultiplexFeature.MultiHopSellSubcall memory) {
        return
            IMultiplexFeature.MultiHopSellSubcall({
                id: IMultiplexFeature.MultiplexSubcall.UniswapV3,
                data: encodePathUniswapV3(tokens)
            });
    }

    function makeUniswapV3BatchSubcall(
        address[] memory tokens,
        uint256 sellAmount
    ) private pure returns (IMultiplexFeature.BatchSellSubcall memory) {
        return
            IMultiplexFeature.BatchSellSubcall({
                id: IMultiplexFeature.MultiplexSubcall.UniswapV3,
                sellAmount: sellAmount,
                data: encodePathUniswapV3(tokens)
            });
    }

    function makeLiquidityProviderMultiHopSubcall()
        private
        view
        returns (IMultiplexFeature.MultiHopSellSubcall memory)
    {
        return
            IMultiplexFeature.MultiHopSellSubcall({
                id: IMultiplexFeature.MultiplexSubcall.LiquidityProvider,
                data: abi.encode(address(liquidityProvider), hex"")
            });
    }

    function makeLiquidityProviderBatchSubcall(
        uint256 sellAmount
    ) private view returns (IMultiplexFeature.BatchSellSubcall memory) {
        return
            IMultiplexFeature.BatchSellSubcall({
                id: IMultiplexFeature.MultiplexSubcall.LiquidityProvider,
                sellAmount: sellAmount,
                data: abi.encode(address(liquidityProvider), hex"")
            });
    }

    function makeTransformERC20Subcall(
        IERC20TokenV06 inputToken,
        IERC20TokenV06 outputToken,
        uint256 sellAmount,
        uint256 mintAmount
    ) private view returns (IMultiplexFeature.BatchSellSubcall memory) {
        ITransformERC20Feature.Transformation[] memory transformations = new ITransformERC20Feature.Transformation[](1);
        transformations[0] = ITransformERC20Feature.Transformation(
            uint32(transformerNonce),
            abi.encode(address(inputToken), address(outputToken), 0, mintAmount, 0)
        );

        return
            IMultiplexFeature.BatchSellSubcall({
                id: IMultiplexFeature.MultiplexSubcall.TransformERC20,
                sellAmount: sellAmount,
                data: abi.encode(transformations)
            });
    }

    function makeNestedBatchSellSubcall(
        IMultiplexFeature.BatchSellSubcall[] memory calls
    ) private pure returns (IMultiplexFeature.MultiHopSellSubcall memory) {
        return
            IMultiplexFeature.MultiHopSellSubcall({
                id: IMultiplexFeature.MultiplexSubcall.BatchSell,
                data: abi.encode(calls)
            });
    }

    function makeNestedMultiHopSellSubcall(
        address[] memory tokens,
        IMultiplexFeature.MultiHopSellSubcall[] memory calls,
        uint256 sellAmount
    ) private pure returns (IMultiplexFeature.BatchSellSubcall memory) {
        return
            IMultiplexFeature.BatchSellSubcall({
                id: IMultiplexFeature.MultiplexSubcall.MultiHopSell,
                sellAmount: sellAmount,
                data: abi.encode(tokens, calls)
            });
    }

    function makeArray(
        IMultiplexFeature.MultiHopSellSubcall memory first
    ) private pure returns (IMultiplexFeature.MultiHopSellSubcall[] memory subcalls) {
        subcalls = new IMultiplexFeature.MultiHopSellSubcall[](1);
        subcalls[0] = first;
    }

    function makeArray(
        IMultiplexFeature.MultiHopSellSubcall memory first,
        IMultiplexFeature.MultiHopSellSubcall memory second
    ) private pure returns (IMultiplexFeature.MultiHopSellSubcall[] memory subcalls) {
        subcalls = new IMultiplexFeature.MultiHopSellSubcall[](2);
        subcalls[0] = first;
        subcalls[1] = second;
    }

    function makeArray(
        IMultiplexFeature.BatchSellSubcall memory first
    ) private pure returns (IMultiplexFeature.BatchSellSubcall[] memory subcalls) {
        subcalls = new IMultiplexFeature.BatchSellSubcall[](1);
        subcalls[0] = first;
    }

    function makeArray(
        IMultiplexFeature.BatchSellSubcall memory first,
        IMultiplexFeature.BatchSellSubcall memory second
    ) private pure returns (IMultiplexFeature.BatchSellSubcall[] memory subcalls) {
        subcalls = new IMultiplexFeature.BatchSellSubcall[](2);
        subcalls[0] = first;
        subcalls[1] = second;
    }

    function makeArray(
        IMultiplexFeature.BatchSellSubcall memory first,
        IMultiplexFeature.BatchSellSubcall memory second,
        IMultiplexFeature.BatchSellSubcall memory third
    ) private pure returns (IMultiplexFeature.BatchSellSubcall[] memory subcalls) {
        subcalls = new IMultiplexFeature.BatchSellSubcall[](3);
        subcalls[0] = first;
        subcalls[1] = second;
        subcalls[2] = third;
    }

    function makeArray(address first) private pure returns (address[] memory addresses) {
        addresses = new address[](1);
        addresses[0] = first;
    }

    function makeArray(address first, address second) private pure returns (address[] memory addresses) {
        addresses = new address[](2);
        addresses[0] = first;
        addresses[1] = second;
    }

    function makeArray(address first, address second, address third) private pure returns (address[] memory addresses) {
        addresses = new address[](3);
        addresses[0] = first;
        addresses[1] = second;
        addresses[2] = third;
    }

    function makeArray(LogDescription memory first) private pure returns (LogDescription[] memory entries) {
        entries = new LogDescription[](1);
        entries[0] = first;
    }

    function makeArray(
        LogDescription memory first,
        LogDescription memory second
    ) private pure returns (LogDescription[] memory entries) {
        entries = new LogDescription[](2);
        entries[0] = first;
        entries[1] = second;
    }

    function makeArray(
        LogDescription memory first,
        LogDescription memory second,
        LogDescription memory third
    ) private pure returns (LogDescription[] memory entries) {
        entries = new LogDescription[](3);
        entries[0] = first;
        entries[1] = second;
        entries[2] = third;
    }

    function makeArray(
        LogDescription memory first,
        LogDescription memory second,
        LogDescription memory third,
        LogDescription memory fourth
    ) private pure returns (LogDescription[] memory entries) {
        entries = new LogDescription[](4);
        entries[0] = first;
        entries[1] = second;
        entries[2] = third;
        entries[3] = fourth;
    }

    function makeArray(
        LogDescription memory first,
        LogDescription memory second,
        LogDescription memory third,
        LogDescription memory fourth,
        LogDescription memory fifth
    ) private pure returns (LogDescription[] memory entries) {
        entries = new LogDescription[](5);
        entries[0] = first;
        entries[1] = second;
        entries[2] = third;
        entries[3] = fourth;
        entries[4] = fifth;
    }

    function makeArray(
        LogDescription memory first,
        LogDescription memory second,
        LogDescription memory third,
        LogDescription memory fourth,
        LogDescription memory fifth,
        LogDescription memory sixth
    ) private pure returns (LogDescription[] memory entries) {
        entries = new LogDescription[](6);
        entries[0] = first;
        entries[1] = second;
        entries[2] = third;
        entries[3] = fourth;
        entries[4] = fifth;
        entries[5] = sixth;
    }

    function makeArray(bytes32 first) private pure returns (bytes32[] memory data) {
        data = new bytes32[](1);
        data[0] = first;
    }

    function mintTo(address token, address recipient, uint256 amount) private {
        if (token == address(weth)) {
            IEtherTokenV06(token).deposit{value: amount}();
            WETH9V06(payable(token)).transfer(recipient, amount);
        } else {
            TestMintableERC20Token(token).mint(recipient, amount);
        }
    }

    function createUniswapV2Pool(
        TestUniswapV2Factory factory,
        IERC20TokenV06 tokenA,
        IERC20TokenV06 tokenB,
        uint112 balanceA,
        uint112 balanceB
    ) private returns (TestUniswapV2Pool pool) {
        pool = factory.createPool(tokenA, tokenB);
        mintTo(address(tokenA), address(pool), balanceA);
        mintTo(address(tokenB), address(pool), balanceB);

        (uint112 balance0, uint112 balance1) = tokenA < tokenB ? (balanceA, balanceB) : (balanceB, balanceA);
        pool.setReserves(balance0, balance1, 0);
    }

    function createUniswapV3Pool(
        TestUniswapV3Factory factory,
        IERC20TokenV06 tokenA,
        IERC20TokenV06 tokenB,
        uint112 balanceA,
        uint112 balanceB
    ) private returns (TestUniswapV3Pool pool) {
        pool = factory.createPool(tokenA, tokenB, POOL_FEE);
        mintTo(address(tokenA), address(pool), balanceA);
        mintTo(address(tokenB), address(pool), balanceB);
    }

    function encodeFractionalFillAmount(uint256 frac) private pure returns (uint256) {
        return (2 ** 255) + (frac * 1e16);
    }

    function describeLog(
        bytes32[] memory topics,
        bytes memory data,
        bytes memory dataMask
    ) private pure returns (LogDescription memory) {
        assert(dataMask.length == 0 || dataMask.length == data.length);
        return LogDescription(topics, data, dataMask);
    }

    function describeLog(bytes32[] memory topics, bytes memory data) private pure returns (LogDescription memory) {
        return describeLog(topics, data, hex"");
    }

    function assertLogs(LogDescription[] memory expected) private {
        Vm.Log[] memory entries = vm.getRecordedLogs();

        uint256 j = 0;
        for (uint256 i = 0; i < entries.length && j < expected.length; i++) {
            Vm.Log memory en = entries[i];
            LogDescription memory ex = expected[j];
            uint256 k;

            if (en.topics.length != ex.topics.length || en.data.length != ex.data.length) continue;

            for (k = 0; k < en.data.length; k++) {
                if (ex.dataMask.length > 0) {
                    en.data[k] = en.data[k] & ex.dataMask[k];
                    ex.data[k] = ex.data[k] & ex.dataMask[k];
                }

                if (en.data[k] != ex.data[k]) {
                    k = en.data.length + 1;
                    break;
                }
            }

            if (k != en.data.length) continue;

            for (k = 0; k < en.topics.length; k++) {
                if (en.topics[k] != ex.topics[k]) k = en.topics.length + 1;
            }

            if (k != en.topics.length) continue;

            j++;
        }

        if (j != expected.length) {
            fail("logs do not match expected");
            for (uint256 i = 0; i < expected[j].topics.length; i++)
                log_named_bytes32("expected topic", expected[j].topics[i]);
            log_named_bytes("expected data", expected[j].data);
        }
    }

    //// batch sells

    function test_multiplexBatchSellTokenForToken_1() public explain("reverts if minBuyAmount is not satisfied") {
        LibNativeOrder.RfqOrder memory rfqOrder = makeTestRfqOrder();
        IMultiplexFeature.BatchSellSubcall memory rfqSubcall = makeRfqSubcall(rfqOrder);
        mintTo(address(rfqOrder.takerToken), rfqOrder.taker, rfqOrder.takerAmount);

        vm.expectRevert("MultiplexFeature::_multiplexBatchSell/UNDERBOUGHT");
        zeroExDeployed.zeroEx.multiplexBatchSellTokenForToken(
            dai,
            zrx,
            makeArray(rfqSubcall),
            rfqOrder.takerAmount,
            rfqOrder.makerAmount + 1
        );
    }

    function test_multiplexBatchSellTokenForToken_2() public explain("reverts if given an invalid subcall type") {
        uint256 sellAmount = 1e18;

        vm.expectRevert("MultiplexFeature::_executeBatchSell/INVALID_SUBCALL");
        zeroExDeployed.zeroEx.multiplexBatchSellTokenForToken(
            dai,
            zrx,
            makeArray(
                IMultiplexFeature.BatchSellSubcall({
                    id: IMultiplexFeature.MultiplexSubcall.Invalid,
                    sellAmount: sellAmount,
                    data: hex""
                })
            ),
            sellAmount,
            0
        );
    }

    function test_multiplexBatchSellTokenForToken_3() public explain("reverts if the full sell amount is not sold") {
        LibNativeOrder.RfqOrder memory rfqOrder = makeTestRfqOrder();
        IMultiplexFeature.BatchSellSubcall memory rfqSubcall = makeRfqSubcall(rfqOrder);
        mintTo(address(rfqOrder.takerToken), rfqOrder.taker, rfqOrder.takerAmount);

        vm.expectRevert("MultiplexFeature::_executeBatchSell/INCORRECT_AMOUNT_SOLD");
        zeroExDeployed.zeroEx.multiplexBatchSellTokenForToken(
            rfqOrder.takerToken,
            rfqOrder.makerToken,
            makeArray(rfqSubcall),
            rfqOrder.takerAmount + 1,
            rfqOrder.makerAmount
        );
    }

    function test_multiplexBatchSellTokenForToken_4() public explain("RFQ, fallback(UniswapV2)") {
        LibNativeOrder.RfqOrder memory rfqOrder = makeTestRfqOrder();
        createUniswapV2Pool(uniV2Factory, dai, zrx, 10e18, 10e18);
        mintTo(address(rfqOrder.takerToken), rfqOrder.taker, rfqOrder.takerAmount);

        zeroExDeployed.zeroEx.multiplexBatchSellTokenForToken(
            rfqOrder.takerToken,
            zrx,
            makeArray(
                makeRfqSubcall(rfqOrder),
                makeUniswapV2BatchSubcall(makeArray(address(dai), address(zrx)), rfqOrder.takerAmount, false)
            ),
            rfqOrder.takerAmount,
            0
        );

        assertLogs(
            makeArray(
                describeLog({
                    topics: makeArray(RFQ_ORDER_FILLED_SIG),
                    data: abi.encode(
                        zeroExDeployed.features.nativeOrdersFeature.getRfqOrderHash(rfqOrder),
                        rfqOrder.maker,
                        rfqOrder.taker,
                        rfqOrder.makerToken,
                        rfqOrder.takerToken,
                        rfqOrder.takerAmount,
                        rfqOrder.makerAmount,
                        rfqOrder.pool
                    )
                })
            )
        );
    }

    function test_multiplexBatchSellTokenForToken_5() public explain("OTC, fallback(UniswapV2)") {
        LibNativeOrder.OtcOrder memory otcOrder = makeTestOtcOrder();
        createUniswapV2Pool(uniV2Factory, dai, zrx, 10e18, 10e18);
        mintTo(address(otcOrder.takerToken), otcOrder.taker, otcOrder.takerAmount);

        zeroExDeployed.zeroEx.multiplexBatchSellTokenForToken(
            otcOrder.takerToken,
            zrx,
            makeArray(
                makeOtcSubcall(otcOrder),
                makeUniswapV2BatchSubcall(makeArray(address(dai), address(zrx)), otcOrder.takerAmount, false)
            ),
            otcOrder.takerAmount,
            0
        );

        assertLogs(
            makeArray(
                describeLog({
                    topics: makeArray(OTC_ORDER_FILLED_SIG),
                    data: abi.encode(
                        zeroExDeployed.features.otcOrdersFeature.getOtcOrderHash(otcOrder),
                        otcOrder.maker,
                        otcOrder.taker,
                        otcOrder.makerToken,
                        otcOrder.takerToken,
                        otcOrder.makerAmount,
                        otcOrder.takerAmount
                    )
                })
            )
        );
    }

    function test_multiplexBatchSellTokenForToken_6() public explain("expired RFQ, fallback(UniswapV2)") {
        LibNativeOrder.RfqOrder memory rfqOrder = makeTestRfqOrder();
        TestUniswapV2Pool uniV2Pool = createUniswapV2Pool(uniV2Factory, dai, zrx, 10e18, 10e18);
        mintTo(address(rfqOrder.takerToken), rfqOrder.taker, rfqOrder.takerAmount);
        rfqOrder.expiry = 0;

        zeroExDeployed.zeroEx.multiplexBatchSellTokenForToken(
            rfqOrder.takerToken,
            zrx,
            makeArray(
                makeRfqSubcall(rfqOrder),
                makeUniswapV2BatchSubcall(makeArray(address(dai), address(zrx)), rfqOrder.takerAmount, false)
            ),
            rfqOrder.takerAmount,
            0
        );

        assertLogs(
            makeArray(
                describeLog({
                    topics: makeArray(EXPIRED_RFQ_ORDER_SIG),
                    data: abi.encode(
                        zeroExDeployed.features.nativeOrdersFeature.getRfqOrderHash(rfqOrder),
                        rfqOrder.maker,
                        rfqOrder.expiry
                    )
                }),
                describeLog({
                    topics: makeArray(TRANSFER_SIG),
                    data: abi.encode(dai, rfqOrder.taker, uniV2Pool, rfqOrder.takerAmount)
                }),
                describeLog({
                    topics: makeArray(TRANSFER_SIG),
                    data: abi.encode(zrx, uniV2Pool, rfqOrder.taker, 0),
                    dataMask: abi.encode(MAX_UINT256, MAX_UINT256, MAX_UINT256, 0)
                })
            )
        );
    }

    function test_multiplexBatchSellTokenForToken_7() public explain("expired RFQ, fallback(UniswapV2)") {
        LibNativeOrder.OtcOrder memory otcOrder = makeTestOtcOrder();
        TestUniswapV2Pool uniV2Pool = createUniswapV2Pool(uniV2Factory, dai, zrx, 10e18, 10e18);
        mintTo(address(otcOrder.takerToken), otcOrder.taker, otcOrder.takerAmount);
        otcOrder.expiryAndNonce = 1;

        zeroExDeployed.zeroEx.multiplexBatchSellTokenForToken(
            otcOrder.takerToken,
            zrx,
            makeArray(
                makeOtcSubcall(otcOrder),
                makeUniswapV2BatchSubcall(makeArray(address(dai), address(zrx)), otcOrder.takerAmount, false)
            ),
            otcOrder.takerAmount,
            0
        );

        assertLogs(
            makeArray(
                describeLog({
                    topics: makeArray(EXPIRED_OTC_ORDER_SIG),
                    data: abi.encode(
                        zeroExDeployed.features.otcOrdersFeature.getOtcOrderHash(otcOrder),
                        otcOrder.maker,
                        uint64(otcOrder.expiryAndNonce >> 192)
                    )
                }),
                describeLog({
                    topics: makeArray(TRANSFER_SIG),
                    data: abi.encode(dai, otcOrder.taker, uniV2Pool, otcOrder.takerAmount)
                }),
                describeLog({
                    topics: makeArray(TRANSFER_SIG),
                    data: abi.encode(zrx, uniV2Pool, otcOrder.taker, 0),
                    dataMask: abi.encode(MAX_UINT256, MAX_UINT256, MAX_UINT256, 0)
                })
            )
        );
    }

    function test_multiplexBatchSellTokenForToken_8() public explain("expired RFQ, fallback(TransformERC20)") {
        LibNativeOrder.RfqOrder memory rfqOrder = makeTestRfqOrder();
        mintTo(address(rfqOrder.takerToken), rfqOrder.taker, rfqOrder.takerAmount);
        rfqOrder.expiry = 0;

        zeroExDeployed.zeroEx.multiplexBatchSellTokenForToken(
            rfqOrder.takerToken,
            zrx,
            makeArray(makeRfqSubcall(rfqOrder), makeTransformERC20Subcall(dai, zrx, rfqOrder.takerAmount, 5e17)),
            rfqOrder.takerAmount,
            0
        );

        assertLogs(
            makeArray(
                describeLog({
                    topics: makeArray(EXPIRED_RFQ_ORDER_SIG),
                    data: abi.encode(
                        zeroExDeployed.features.nativeOrdersFeature.getRfqOrderHash(rfqOrder),
                        rfqOrder.maker,
                        rfqOrder.expiry
                    )
                }),
                describeLog({
                    topics: makeArray(TRANSFER_SIG),
                    data: abi.encode(dai, rfqOrder.taker, flashWallet, rfqOrder.takerAmount)
                }),
                describeLog({
                    topics: makeArray(MINT_TRANSFORM_SIG),
                    data: abi.encode(
                        0,
                        zeroExDeployed.zeroEx,
                        zeroExDeployed.zeroEx,
                        rfqOrder.taker,
                        new bytes(32 * 5),
                        rfqOrder.takerAmount,
                        0
                    ),
                    dataMask: abi.encode(
                        0,
                        MAX_UINT256,
                        MAX_UINT256,
                        MAX_UINT256,
                        new bytes(32 * 5),
                        MAX_UINT256,
                        0
                    )
                }),
                describeLog({
                    topics: makeArray(TRANSFER_SIG),
                    data: abi.encode(dai, flashWallet, 0, 0),
                    dataMask: abi.encode(MAX_UINT256, MAX_UINT256, MAX_UINT256, 0)
                }),
                describeLog({
                    topics: makeArray(TRANSFER_SIG),
                    data: abi.encode(zrx, flashWallet, rfqOrder.taker, 0),
                    dataMask: abi.encode(MAX_UINT256, MAX_UINT256, MAX_UINT256, 0)
                })
            )
        );
    }

    function test_multiplexBatchSellTokenForToken_9() public explain("LiquidityProvider, UniV3, Sushiswap") {
        TestUniswapV2Pool sushiswapPool = createUniswapV2Pool(sushiFactory, dai, zrx, 10e18, 10e18);
        TestUniswapV3Pool uniV3Pool = createUniswapV3Pool(uniV3Factory, dai, zrx, 10e18, 10e18);

        address[] memory tokens = makeArray(address(dai), address(zrx));
        IMultiplexFeature.BatchSellSubcall memory lpSubcall = makeLiquidityProviderBatchSubcall(4e17);
        IMultiplexFeature.BatchSellSubcall memory uniV3Subcall = makeUniswapV3BatchSubcall(tokens, 5e17);
        IMultiplexFeature.BatchSellSubcall memory sushiswapSubcall = makeUniswapV2BatchSubcall(tokens, 6e17, true);
        uint256 sellAmount = lpSubcall.sellAmount + uniV3Subcall.sellAmount + sushiswapSubcall.sellAmount - 1;

        mintTo(address(dai), address(this), sellAmount);

        zeroExDeployed.zeroEx.multiplexBatchSellTokenForToken(
            dai,
            zrx,
            makeArray(lpSubcall, uniV3Subcall, sushiswapSubcall),
            sellAmount,
            0
        );

        // kind of ugly here to avoid stack too deep error
        LogDescription[] memory descriptions = new LogDescription[](6);
        descriptions[0] = describeLog({
            topics: makeArray(TRANSFER_SIG),
            data: abi.encode(dai, this, liquidityProvider, lpSubcall.sellAmount)
        });
        descriptions[1] = describeLog({
            topics: makeArray(TRANSFER_SIG),
            data: abi.encode(zrx, liquidityProvider, this, 0),
            dataMask: abi.encode(MAX_UINT256, MAX_UINT256, MAX_UINT256, 0)
        });
        descriptions[2] = describeLog({
            topics: makeArray(TRANSFER_SIG),
            data: abi.encode(zrx, uniV3Pool, this, 0),
            dataMask: abi.encode(MAX_UINT256, MAX_UINT256, MAX_UINT256, 0)
        });
        descriptions[3] = describeLog({
            topics: makeArray(TRANSFER_SIG),
            data: abi.encode(dai, this, uniV3Pool, uniV3Subcall.sellAmount)
        });
        descriptions[4] = describeLog({
            topics: makeArray(TRANSFER_SIG),
            data: abi.encode(dai, this, sushiswapPool, sushiswapSubcall.sellAmount - 1)
        });
        descriptions[5] = describeLog({
            topics: makeArray(TRANSFER_SIG),
            data: abi.encode(zrx, sushiswapPool, this, 0),
            dataMask: abi.encode(MAX_UINT256, MAX_UINT256, MAX_UINT256, 0)
        });
        assertLogs(descriptions);
    }

    function test_multiplexBatchSellTokenForToken_10() public explain("proportional fill amounts") {
        LibNativeOrder.RfqOrder memory rfqOrder = makeTestRfqOrder();
        TestUniswapV2Pool uniV2Pool = createUniswapV2Pool(uniV2Factory, dai, zrx, 10e18, 10e18);

        uint256 sellAmount = 1e18;
        mintTo(address(dai), address(this), sellAmount);

        zeroExDeployed.zeroEx.multiplexBatchSellTokenForToken(
            dai,
            zrx,
            makeArray(
                makeRfqSubcall(rfqOrder, encodeFractionalFillAmount(42)),
                makeUniswapV2BatchSubcall(
                    makeArray(address(dai), address(zrx)),
                    encodeFractionalFillAmount(100),
                    false
                )
            ),
            sellAmount,
            0
        );

        assertLogs(
            makeArray(
                describeLog({
                    topics: makeArray(TRANSFER_SIG),
                    data: abi.encode(dai, rfqOrder.taker, rfqOrder.maker, 42e16)
                }),
                describeLog({
                    topics: makeArray(TRANSFER_SIG),
                    data: abi.encode(zrx, rfqOrder.maker, rfqOrder.taker, 0),
                    dataMask: abi.encode(MAX_UINT256, MAX_UINT256, MAX_UINT256, 0)
                }),
                describeLog({
                    topics: makeArray(TRANSFER_SIG),
                    data: abi.encode(dai, rfqOrder.taker, uniV2Pool, 58e16)
                }),
                describeLog({
                    topics: makeArray(TRANSFER_SIG),
                    data: abi.encode(zrx, uniV2Pool, rfqOrder.taker, 0),
                    dataMask: abi.encode(MAX_UINT256, MAX_UINT256, MAX_UINT256, 0)
                })
            )
        );
    }

    function test_multiplexBatchSellTokenForToken_11() public explain("RFQ, MultiHop(UniV3, UniV2)") {
        TestUniswapV2Pool uniV2Pool = createUniswapV2Pool(uniV2Factory, shib, zrx, 10e18, 10e18);
        TestUniswapV3Pool uniV3Pool = createUniswapV3Pool(uniV3Factory, dai, shib, 10e18, 10e18);

        LibNativeOrder.RfqOrder memory rfqOrder = makeTestRfqOrder();
        IMultiplexFeature.BatchSellSubcall memory rfqSubcall = makeRfqSubcall(rfqOrder);
        IMultiplexFeature.BatchSellSubcall memory nestedMultiHopSubcall = makeNestedMultiHopSellSubcall(
            makeArray(address(dai), address(shib), address(zrx)),
            makeArray(
                makeUniswapV3MultiHopSubcall(makeArray(address(dai), address(shib))),
                makeUniswapV2MultiHopSubcall(makeArray(address(shib), address(zrx)), false)
            ),
            5e17
        );

        uint256 sellAmount = rfqSubcall.sellAmount + nestedMultiHopSubcall.sellAmount;
        mintTo(address(dai), address(this), sellAmount);

        zeroExDeployed.zeroEx.multiplexBatchSellTokenForToken(
            dai,
            zrx,
            makeArray(rfqSubcall, nestedMultiHopSubcall),
            sellAmount,
            0
        );

        assertLogs(
            makeArray(
                describeLog({
                    topics: makeArray(TRANSFER_SIG),
                    data: abi.encode(dai, rfqOrder.taker, rfqOrder.maker, rfqOrder.takerAmount)
                }),
                describeLog({
                    topics: makeArray(TRANSFER_SIG),
                    data: abi.encode(zrx, rfqOrder.maker, rfqOrder.taker, rfqOrder.makerAmount)
                }),
                describeLog({
                    topics: makeArray(TRANSFER_SIG),
                    data: abi.encode(shib, uniV3Pool, uniV2Pool, 0),
                    dataMask: abi.encode(MAX_UINT256, MAX_UINT256, MAX_UINT256, 0)
                }),
                describeLog({
                    topics: makeArray(TRANSFER_SIG),
                    data: abi.encode(dai, rfqOrder.taker, uniV3Pool, nestedMultiHopSubcall.sellAmount)
                }),
                describeLog({
                    topics: makeArray(TRANSFER_SIG),
                    data: abi.encode(zrx, uniV2Pool, rfqOrder.taker, 0),
                    dataMask: abi.encode(MAX_UINT256, MAX_UINT256, MAX_UINT256, 0)
                })
            )
        );
    }

    function testMultiplexBatchSellEthForToken() public {
        // RFQ
        // OTC
        // UniswapV2
        // UniswapV3
        // LiquidityProvider
        // TransformERC20
        // RFQ, MultiHop(UniV3, UniV2)
    }

    function testMultiplexBatchSellTokenForEth() public {
        // RFQ
        // OTC
        // UniswapV2
        // UniswapV3
        // LiquidityProvider
        // TransformERC20
        // RFQ, MultiHop(UniV3, UniV2)
    }

    //// multihop sells

    function test_multiplexMultiHopSellTokenForToken_1() public explain("reverts if given an invalid subcall type") {
        vm.expectRevert("MultiplexFeature::_computeHopTarget/INVALID_SUBCALL");
        zeroExDeployed.zeroEx.multiplexMultiHopSellTokenForToken(
            makeArray(address(dai), address(zrx)),
            makeArray(
                IMultiplexFeature.MultiHopSellSubcall({id: IMultiplexFeature.MultiplexSubcall.Invalid, data: hex""})
            ),
            1e18,
            0
        );
    }

    function test_multiplexMultiHopSellTokenForToken_2() public explain("reverts if minBuyAmount is not satisfied") {
        createUniswapV2Pool(uniV2Factory, dai, zrx, 10e18, 10e18);

        uint256 sellAmount = 5e17;
        mintTo(address(dai), address(this), sellAmount);

        vm.expectRevert("MultiplexFeature::_multiplexMultiHopSell/UNDERBOUGHT");
        zeroExDeployed.zeroEx.multiplexMultiHopSellTokenForToken(
            makeArray(address(dai), address(zrx)),
            makeArray(makeUniswapV2MultiHopSubcall(makeArray(address(dai), address(zrx)), false)),
            sellAmount,
            MAX_UINT256
        );
    }

    function test_multiplexMultiHopSellTokenForToken_3() public explain("reverts if array lengths are mismatched") {
        createUniswapV2Pool(uniV2Factory, dai, zrx, 10e18, 10e18);
        IMultiplexFeature.MultiHopSellSubcall memory uniswapV2Subcall = makeUniswapV2MultiHopSubcall(
            makeArray(address(dai), address(zrx)),
            false
        );

        uint256 sellAmount = 5e17;
        mintTo(address(dai), address(this), sellAmount);

        vm.expectRevert("MultiplexFeature::_multiplexMultiHopSell/MISMATCHED_ARRAY_LENGTHS");
        zeroExDeployed.zeroEx.multiplexMultiHopSellTokenForToken(
            makeArray(address(dai), address(zrx)),
            makeArray(uniswapV2Subcall, uniswapV2Subcall),
            sellAmount,
            0
        );
    }

    function test_multiplexMultiHopSellTokenForToken_4() public explain("UniswapV2 -> LiquidityProvider") {
        TestUniswapV2Pool uniV2Pool = createUniswapV2Pool(uniV2Factory, dai, shib, 10e18, 10e18);
        IMultiplexFeature.MultiHopSellSubcall memory lpSubcall = makeLiquidityProviderMultiHopSubcall();
        IMultiplexFeature.MultiHopSellSubcall memory uniswapV2Subcall = makeUniswapV2MultiHopSubcall(
            makeArray(address(dai), address(shib)),
            false
        );

        uint256 sellAmount = 5e17;
        uint256 buyAmount = 6e17;
        mintTo(address(dai), address(this), sellAmount);
        mintTo(address(zrx), address(liquidityProvider), buyAmount);

        zeroExDeployed.zeroEx.multiplexMultiHopSellTokenForToken(
            makeArray(address(dai), address(shib), address(zrx)),
            makeArray(uniswapV2Subcall, lpSubcall),
            sellAmount,
            buyAmount
        );

        assertLogs(
            makeArray(
                describeLog({topics: makeArray(TRANSFER_SIG), data: abi.encode(dai, this, uniV2Pool, sellAmount)}),
                describeLog({
                    topics: makeArray(TRANSFER_SIG),
                    data: abi.encode(shib, uniV2Pool, liquidityProvider, 0),
                    dataMask: abi.encode(MAX_UINT256, MAX_UINT256, MAX_UINT256, 0)
                }),
                describeLog({
                    topics: makeArray(TRANSFER_SIG),
                    data: abi.encode(zrx, liquidityProvider, this, buyAmount)
                })
            )
        );
    }

    function test_multiplexMultiHopSellTokenForToken_5() public explain("LiquidityProvider -> Sushiswap") {
        TestUniswapV2Pool sushiPool = createUniswapV2Pool(sushiFactory, shib, zrx, 10e18, 10e18);
        IMultiplexFeature.MultiHopSellSubcall memory lpSubcall = makeLiquidityProviderMultiHopSubcall();
        IMultiplexFeature.MultiHopSellSubcall memory sushiswapSubcall = makeUniswapV2MultiHopSubcall(
            makeArray(address(shib), address(zrx)),
            true
        );

        uint256 sellAmount = 5e17;
        uint256 shibAmount = 6e17;
        mintTo(address(dai), address(this), sellAmount);
        mintTo(address(shib), address(liquidityProvider), shibAmount);

        zeroExDeployed.zeroEx.multiplexMultiHopSellTokenForToken(
            makeArray(address(dai), address(shib), address(zrx)),
            makeArray(lpSubcall, sushiswapSubcall),
            sellAmount,
            0
        );

        assertLogs(
            makeArray(
                describeLog({
                    topics: makeArray(TRANSFER_SIG),
                    data: abi.encode(dai, this, liquidityProvider, sellAmount)
                }),
                describeLog({
                    topics: makeArray(TRANSFER_SIG),
                    data: abi.encode(shib, liquidityProvider, sushiPool, shibAmount)
                }),
                describeLog({
                    topics: makeArray(TRANSFER_SIG),
                    data: abi.encode(zrx, sushiPool, this, 0),
                    dataMask: abi.encode(MAX_UINT256, MAX_UINT256, MAX_UINT256, 0)
                })
            )
        );
    }

    function test_multiplexMultiHopSellTokenForToken_6() public explain("UniswapV3 -> BatchSell(RFQ, UniswapV2)") {
        TestUniswapV2Pool uniV2Pool = createUniswapV2Pool(uniV2Factory, shib, zrx, 10e18, 10e18);
        TestUniswapV3Pool uniV3Pool = createUniswapV3Pool(uniV3Factory, dai, shib, 10e18, 10e18);

        LibNativeOrder.RfqOrder memory rfqOrder = makeTestRfqOrder();
        rfqOrder.takerToken = shib;
        rfqOrder.makerToken = zrx;

        IMultiplexFeature.BatchSellSubcall memory rfqSubcall = makeRfqSubcall(rfqOrder);
        rfqSubcall.sellAmount = encodeFractionalFillAmount(42);

        uint256 sellAmount = 5e17;
        mintTo(address(dai), address(this), sellAmount);

        zeroExDeployed.zeroEx.multiplexMultiHopSellTokenForToken(
            makeArray(address(dai), address(shib), address(zrx)),
            makeArray(
                makeUniswapV3MultiHopSubcall(makeArray(address(dai), address(shib))),
                makeNestedBatchSellSubcall(
                    makeArray(
                        rfqSubcall,
                        makeUniswapV2BatchSubcall(
                            makeArray(address(shib), address(zrx)),
                            encodeFractionalFillAmount(100),
                            false
                        )
                    )
                )
            ),
            sellAmount,
            0
        );

        assertLogs(
            makeArray(
                describeLog({
                    topics: makeArray(TRANSFER_SIG),
                    data: abi.encode(shib, uniV3Pool, zeroExDeployed.zeroEx, 0),
                    dataMask: abi.encode(MAX_UINT256, MAX_UINT256, MAX_UINT256, 0)
                }),
                describeLog({topics: makeArray(TRANSFER_SIG), data: abi.encode(dai, this, uniV3Pool, sellAmount)}),
                describeLog({
                    topics: makeArray(TRANSFER_SIG),
                    data: abi.encode(shib, zeroExDeployed.zeroEx, rfqOrder.maker, 0),
                    dataMask: abi.encode(MAX_UINT256, MAX_UINT256, MAX_UINT256, 0)
                }),
                describeLog({
                    topics: makeArray(TRANSFER_SIG),
                    data: abi.encode(zrx, rfqOrder.maker, this, 0),
                    dataMask: abi.encode(MAX_UINT256, MAX_UINT256, MAX_UINT256, 0)
                }),
                describeLog({
                    topics: makeArray(TRANSFER_SIG),
                    data: abi.encode(shib, zeroExDeployed.zeroEx, uniV2Pool, 0),
                    dataMask: abi.encode(MAX_UINT256, MAX_UINT256, MAX_UINT256, 0)
                }),
                describeLog({
                    topics: makeArray(TRANSFER_SIG),
                    data: abi.encode(zrx, uniV2Pool, this, 0),
                    dataMask: abi.encode(MAX_UINT256, MAX_UINT256, MAX_UINT256, 0)
                })
            )
        );
    }

    function test_multiplexMultiHopSellTokenForToken_7() public explain("BatchSell(RFQ, UniswapV2) -> UniswapV3") {
        TestUniswapV2Pool uniV2Pool = createUniswapV2Pool(uniV2Factory, dai, shib, 10e18, 10e18);
        TestUniswapV3Pool uniV3Pool = createUniswapV3Pool(uniV3Factory, shib, zrx, 10e18, 10e18);

        LibNativeOrder.RfqOrder memory rfqOrder = makeTestRfqOrder({makerToken: shib, takerToken: dai});

        IMultiplexFeature.BatchSellSubcall memory rfqSubcall = makeRfqSubcall(rfqOrder);
        IMultiplexFeature.BatchSellSubcall memory uniswapV2Subcall = makeUniswapV2BatchSubcall(
            makeArray(address(dai), address(shib)),
            5e17,
            false
        );

        uint256 sellAmount = rfqSubcall.sellAmount + uniswapV2Subcall.sellAmount;
        mintTo(address(dai), address(this), sellAmount);

        zeroExDeployed.zeroEx.multiplexMultiHopSellTokenForToken(
            makeArray(address(dai), address(shib), address(zrx)),
            makeArray(
                makeNestedBatchSellSubcall(makeArray(rfqSubcall, uniswapV2Subcall)),
                makeUniswapV3MultiHopSubcall(makeArray(address(shib), address(zrx)))
            ),
            sellAmount,
            0
        );

        assertLogs(
            makeArray(
                describeLog({
                    topics: makeArray(TRANSFER_SIG),
                    data: abi.encode(dai, this, rfqOrder.maker, rfqOrder.takerAmount)
                }),
                describeLog({
                    topics: makeArray(TRANSFER_SIG),
                    data: abi.encode(shib, rfqOrder.maker, zeroExDeployed.zeroEx, rfqOrder.makerAmount)
                }),
                describeLog({
                    topics: makeArray(TRANSFER_SIG),
                    data: abi.encode(dai, this, uniV2Pool, uniswapV2Subcall.sellAmount)
                }),
                describeLog({
                    topics: makeArray(TRANSFER_SIG),
                    data: abi.encode(shib, uniV2Pool, zeroExDeployed.zeroEx, 0),
                    dataMask: abi.encode(MAX_UINT256, MAX_UINT256, MAX_UINT256, 0)
                }),
                describeLog({
                    topics: makeArray(TRANSFER_SIG),
                    data: abi.encode(zrx, uniV3Pool, this, 0),
                    dataMask: abi.encode(MAX_UINT256, MAX_UINT256, MAX_UINT256, 0)
                }),
                describeLog({
                    topics: makeArray(TRANSFER_SIG),
                    data: abi.encode(shib, zeroExDeployed.zeroEx, uniV3Pool, 0),
                    dataMask: abi.encode(MAX_UINT256, MAX_UINT256, MAX_UINT256, 0)
                })
            )
        );
    }

    function testMultiplexMultiHopSellEthForToken() public {
        // reverts if first token is not WETH
        // UniswapV2 -> LiquidityProvider
        // LiquidityProvider -> Sushiswap
        // UniswapV3 -> BatchSell(RFQ, UniswapV2)
        // BatchSell(RFQ, UniswapV2) -> UniswapV3
    }

    function testMultiplexMultiHopSellTokenForEth() public {
        // reverts if last token is not WETH
        // UniswapV2 -> LiquidityProvider
        // LiquidityProvider -> Sushiswap
        // UniswapV3 -> BatchSell(RFQ, UniswapV2)
        // BatchSell(RFQ, UniswapV2) -> UniswapV3
    }
}
