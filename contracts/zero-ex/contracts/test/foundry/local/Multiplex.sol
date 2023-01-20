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
import "src/features/libs/LibSignature.sol";
import "src/features/libs/LibNativeOrder.sol";
import "src/features/interfaces/IMultiplexFeature.sol";
import "src/features/native_orders/NativeOrdersInfo.sol";
import "src/features/multiplex/MultiplexFeature.sol";
import "../utils/ForkUtils.sol";
import "../utils/TestUtils.sol";
import "../utils/DeployZeroEx.sol";
import "../../tokens/TestMintableERC20Token.sol";
import "../../integration/TestUniswapV2Factory.sol";
import "../../integration/TestUniswapV2Pool.sol";

import "@0x/contracts-erc20/contracts/src/v06/WETH9V06.sol";

contract Multiplex is Test, ForkUtils, TestUtils {
    uint256 private constant MAX_UINT256 = 2**256 - 1;

    DeployZeroEx.ZeroExDeployed private zeroExDeployed;
    IERC20TokenV06 private shib;
    IERC20TokenV06 private dai;
    IERC20TokenV06 private zrx;
    IEtherTokenV06 private weth;

    TestUniswapV2Factory private sushiFactory;
    TestUniswapV2Factory private uniV2Factory;

    address private signerAddress;
    uint256 private signerKey;

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

        zeroExDeployed = new DeployZeroEx(DeployZeroEx.ZeroExDeployConfiguration({
            uniswapFactory: address(uniV2Factory),
            sushiswapFactory: address(sushiFactory),
            uniswapPairInitCodeHash: uniV2Factory.POOL_INIT_CODE_HASH(),
            sushiswapPairInitCodeHash: sushiFactory.POOL_INIT_CODE_HASH(),
            logDeployed: false
        })).deployZeroEx();

        shib = IERC20TokenV06(address(new TestMintableERC20Token()));
        dai = IERC20TokenV06(address(new TestMintableERC20Token()));
        zrx = IERC20TokenV06(address(new TestMintableERC20Token()));
        weth = zeroExDeployed.weth;

        infiniteApprovals();
        vm.startPrank(signerAddress);
        infiniteApprovals();
        vm.stopPrank();

        vm.deal(address(this), 10e18);
        log_string("");
    }

    // TODO refactor some of these utility functions out into helper contract

    function makeTestRfqOrder() private returns (LibNativeOrder.RfqOrder memory order) {
        order = LibNativeOrder.RfqOrder({
            makerToken: zrx,
            takerToken: dai,
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

    function makeTestOtcOrder() private returns (LibNativeOrder.OtcOrder memory order) {
        order = LibNativeOrder.OtcOrder({
            makerToken: zrx,
            takerToken: dai,
            makerAmount: 1e18,
            takerAmount: 1e18,
            maker: signerAddress,
            taker: address(this),
            txOrigin: tx.origin,
            expiryAndNonce: uint64(block.timestamp + 60) << 192 | 1
        });
        mintTo(address(order.makerToken), order.maker, order.makerAmount);
    }

    function makeRfqSubcall(LibNativeOrder.RfqOrder memory order) private view returns (IMultiplexFeature.BatchSellSubcall memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, zeroExDeployed.features.nativeOrdersFeature.getRfqOrderHash(order));
        LibSignature.Signature memory sig = LibSignature.Signature(LibSignature.SignatureType.EIP712, v, r, s);

        bytes memory data = abi.encode(order, sig);
        return IMultiplexFeature.BatchSellSubcall({
            id: IMultiplexFeature.MultiplexSubcall.RFQ,
            sellAmount: order.takerAmount,
            data: data
        });
    }

    function makeOtcSubcall(LibNativeOrder.OtcOrder memory order) private view returns (IMultiplexFeature.BatchSellSubcall memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, zeroExDeployed.features.otcOrdersFeature.getOtcOrderHash(order));
        LibSignature.Signature memory sig = LibSignature.Signature(LibSignature.SignatureType.EIP712, v, r, s);

        bytes memory data = abi.encode(order, sig);
        return IMultiplexFeature.BatchSellSubcall({
            id: IMultiplexFeature.MultiplexSubcall.OTC,
            sellAmount: order.takerAmount,
            data: data
        });
    }

    function makeUniswapV2BatchSubcall(address[] memory tokens, uint256 sellAmount, bool isSushi) private pure returns (IMultiplexFeature.BatchSellSubcall memory) {
        bytes memory data = abi.encode(tokens, isSushi);
        return IMultiplexFeature.BatchSellSubcall({
            id: IMultiplexFeature.MultiplexSubcall.UniswapV2,
            sellAmount: sellAmount,
            data: data
        });
    }

    function makeArray(IMultiplexFeature.BatchSellSubcall memory first) private pure returns (IMultiplexFeature.BatchSellSubcall[] memory subcalls) {
        subcalls = new IMultiplexFeature.BatchSellSubcall[](1);
        subcalls[0] = first;
    }

    function makeArray(IMultiplexFeature.BatchSellSubcall memory first, IMultiplexFeature.BatchSellSubcall memory second) private pure returns (IMultiplexFeature.BatchSellSubcall[] memory subcalls) {
        subcalls = new IMultiplexFeature.BatchSellSubcall[](2);
        subcalls[0] = first;
        subcalls[1] = second;
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

    function mintTo(address token, address recipient, uint256 amount) private {
        if (token == address(weth)) {
            IEtherTokenV06(token).deposit{value: amount}();
            WETH9V06(payable(token)).transfer(recipient, amount);
        } else {
            TestMintableERC20Token(token).mint(recipient, amount);
        }
    }

    function createUniswapV2Pool(TestUniswapV2Factory factory, IERC20TokenV06 tokenA, IERC20TokenV06 tokenB, uint112 balanceA, uint112 balanceB) private returns (TestUniswapV2Pool pool) {
        pool = factory.createPool(tokenA, tokenB);
        mintTo(address(tokenA), address(pool), balanceA);
        mintTo(address(tokenB), address(pool), balanceB);

        (uint112 balance0, uint112 balance1) = tokenA < tokenB ? (balanceA, balanceB) : (balanceB, balanceA);
        pool.setReserves(balance0, balance1, 0);
    }

    // TODO refactor these out into some test utility contract

    uint256 private snapshot;

    function snap() private {
        if (snapshot != 0)
            vm.revertTo(snapshot);

        snapshot = vm.snapshot();
    }

    function describe(string memory message) private {
        log_string(message);
        snap();
    }

    function it(string memory message) private {
        log_string(string(abi.encodePacked("  ├─ ", message)));
        snap();
    }

    function it(string memory message, bool last) private {
        if (last) {
            log_string(string(abi.encodePacked("  └─ ", message)));
            snap();
        } else it(message);
    }

    //// batch sells

    function testMultiplexBatchSellTokenForToken() public {
        describe("MultiplexBatchSellTokenForToken");

        ////
        {
            it("reverts if minBuyAmount is not satisfied");

            LibNativeOrder.RfqOrder memory rfqOrder = makeTestRfqOrder();
            mintTo(address(rfqOrder.takerToken), rfqOrder.taker, rfqOrder.takerAmount);

            try zeroExDeployed.zeroEx.multiplexBatchSellTokenForToken(
                dai,
                zrx,
                makeArray(makeRfqSubcall(rfqOrder)),
                rfqOrder.takerAmount,
                rfqOrder.makerAmount + 1
            ) {
                fail("did not revert");
            } catch Error(string memory reason) {
                assertEq(reason, "MultiplexFeature::_multiplexBatchSell/UNDERBOUGHT", "wrong revert reason");
            } catch {
                fail("low-level revert");
            }
        }

        ////
        {
            it("reverts if given an invalid subcall type");

            uint256 sellAmount = 1;
            try zeroExDeployed.zeroEx.multiplexBatchSellTokenForToken(
                dai,
                zrx,
                makeArray(IMultiplexFeature.BatchSellSubcall({
                    id: IMultiplexFeature.MultiplexSubcall.Invalid,
                    sellAmount: sellAmount,
                    data: hex""
                })),
                sellAmount,
                0
            ) {
                fail("did not revert");
            } catch Error(string memory reason) {
                assertEq(reason, "MultiplexFeature::_executeBatchSell/INVALID_SUBCALL", "wrong revert reason");
            } catch {
                fail("low-level revert");
            }
        }

        ////
        {
            it("reverts if the full sell amount is not sold");

            LibNativeOrder.RfqOrder memory rfqOrder = makeTestRfqOrder();
            mintTo(address(rfqOrder.takerToken), rfqOrder.taker, rfqOrder.takerAmount);

            try zeroExDeployed.zeroEx.multiplexBatchSellTokenForToken(
                rfqOrder.takerToken,
                rfqOrder.makerToken,
                makeArray(makeRfqSubcall(rfqOrder)),
                rfqOrder.takerAmount + 1,
                rfqOrder.makerAmount
            ) {
                fail("did not revert");
            } catch Error(string memory reason) {
                assertEq(reason, "MultiplexFeature::_executeBatchSell/INCORRECT_AMOUNT_SOLD", "wrong revert reason");
            } catch {
                fail("low-level revert");
            }
        }

        ////
        {
            it("RFQ, fallback(UniswapV2)");

            LibNativeOrder.RfqOrder memory rfqOrder = makeTestRfqOrder();
            createUniswapV2Pool(uniV2Factory, dai, zrx, 10e18, 10e18);
            mintTo(address(rfqOrder.takerToken), rfqOrder.taker, rfqOrder.takerAmount);

            try zeroExDeployed.zeroEx.multiplexBatchSellTokenForToken(
                rfqOrder.takerToken,
                zrx,
                makeArray(
                    makeRfqSubcall(rfqOrder),
                    makeUniswapV2BatchSubcall(
                        makeArray(address(dai), address(zrx)),
                        rfqOrder.takerAmount,
                        false
                    )
                ),
                rfqOrder.takerAmount,
                0
            ) {
                // TODO
            } catch Error(string memory reason) {
                fail("reverted");
                fail(reason);
            } catch {
                fail("low-level revert");
            }
        }

        ////
        {
            it("OTC, fallback(UniswapV2)");

            LibNativeOrder.OtcOrder memory otcOrder = makeTestOtcOrder();
            createUniswapV2Pool(uniV2Factory, dai, zrx, 10e18, 10e18);
            mintTo(address(otcOrder.takerToken), otcOrder.taker, otcOrder.takerAmount);

            try zeroExDeployed.zeroEx.multiplexBatchSellTokenForToken(
                otcOrder.takerToken,
                zrx,
                makeArray(
                    makeOtcSubcall(otcOrder),
                    makeUniswapV2BatchSubcall(
                        makeArray(address(dai), address(zrx)),
                        otcOrder.takerAmount,
                        false
                    )
                ),
                otcOrder.takerAmount,
                0
            ) {
                // TODO
            } catch Error(string memory reason) {
                fail("reverted");
                fail(reason);
            } catch {
                fail("low-level revert");
            }
        }

        ////
        {
            it("expired RFQ, fallback(UniswapV2)");

            LibNativeOrder.RfqOrder memory rfqOrder = makeTestRfqOrder();
            createUniswapV2Pool(uniV2Factory, dai, zrx, 10e18, 10e18);
            mintTo(address(rfqOrder.takerToken), rfqOrder.taker, rfqOrder.takerAmount);
            rfqOrder.expiry = 0;

            try zeroExDeployed.zeroEx.multiplexBatchSellTokenForToken(
                rfqOrder.takerToken,
                zrx,
                makeArray(
                    makeRfqSubcall(rfqOrder),
                    makeUniswapV2BatchSubcall(
                        makeArray(address(dai), address(zrx)),
                        rfqOrder.takerAmount,
                        false
                    )
                ),
                rfqOrder.takerAmount,
                0
            ) {
                // TODO
            } catch Error(string memory reason) {
                fail("reverted");
                fail(reason);
            } catch {
                fail("low-level revert");
            }
        }

        ////
        {
            it("expired OTC, fallback(UniswapV2)", true);

            LibNativeOrder.OtcOrder memory otcOrder = makeTestOtcOrder();
            createUniswapV2Pool(uniV2Factory, dai, zrx, 10e18, 10e18);
            mintTo(address(otcOrder.takerToken), otcOrder.taker, otcOrder.takerAmount);
            otcOrder.expiryAndNonce = 1;

            try zeroExDeployed.zeroEx.multiplexBatchSellTokenForToken(
                otcOrder.takerToken,
                zrx,
                makeArray(
                    makeOtcSubcall(otcOrder),
                    makeUniswapV2BatchSubcall(
                        makeArray(address(dai), address(zrx)),
                        otcOrder.takerAmount,
                        false
                    )
                ),
                otcOrder.takerAmount,
                0
            ) {
                // TODO
            } catch Error(string memory reason) {
                fail("reverted");
                fail(reason);
            } catch {
                fail("low-level revert");
            }
        }

        ////
        /*
        {
            it("expired RFQ, fallback(TransformERC20)");

            LibNativeOrder.RfqOrder memory rfqOrder = makeTestRfqOrder();
            mintTo(address(rfqOrder.takerToken), rfqOrder.taker, rfqOrder.takerAmount);
            rfqOrder.expiry = 0;

            try zeroExDeployed.zeroEx.multiplexBatchSellTokenForToken(
                rfqOrder.takerToken,
                zrx,
                makeArray(
                    makeRfqSubcall(rfqOrder),
                    makeTransformERC20Subcall(
                        address(dai), address(zrx),
                        rfqOrder.takerAmount, 5e17
                    )
                ),
                rfqOrder.takerAmount,
                0
            ) {
                // TODO
            } catch Error(string memory reason) {
                fail("reverted");
                fail(reason);
            } catch {
                fail("low-level revert");
            }
        }
        */

        // LiquidityProvider, UniV3, Sushiswap

        // proportional fill amounts

        // RFQ, MultiHop(UniV3, UniV2)
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

    function testMultiplexMultihopSellTokenForToken() public {
        // reverts if given an invalid subcall type

        // reverts if minBuyAmount is not satisfied

        // reverts if array lengths are mismatched

        // UniswapV2 -> LiquidityProvider

        // LiquidityProvider -> Sushiswap

        // UniswapV3 -> BatchSell(RFQ, UniswapV2)

        // BatchSell(RFQ, UniswapV2) -> UniswapV3
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
