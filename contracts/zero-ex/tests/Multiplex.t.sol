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

import {LibNativeOrder} from "src/features/libs/LibNativeOrder.sol";
import {IMultiplexFeature} from "src/features/interfaces/IMultiplexFeature.sol";
import {LocalTest} from "utils/LocalTest.sol";
import {MultiplexUtils} from "utils/MultiplexUtils.sol";

contract Multiplex is LocalTest, MultiplexUtils {
    event RfqOrderFilled(
        bytes32 orderHash,
        address maker,
        address taker,
        address makerToken,
        address takerToken,
        uint128 takerTokenFilledAmount,
        uint128 makerTokenFilledAmount,
        bytes32 pool
    );

    event OtcOrderFilled(
        bytes32 orderHash,
        address maker,
        address taker,
        address makerToken,
        address takerToken,
        uint128 makerTokenFilledAmount,
        uint128 takerTokenFilledAmount
    );

    event ExpiredRfqOrder(bytes32 orderHash, address maker, uint64 expiry);

    event ExpiredOtcOrder(bytes32 orderHash, address maker, uint64 expiry);

    event Transfer(address token, address from, address to, uint256 value);

    event MintTransform(
        address context,
        address caller,
        address sender,
        address taker,
        bytes data,
        uint256 inputTokenBalance,
        uint256 ethBalance
    );

    //// batch sells

    // reverts if minBuyAmount is not satisfied
    function test_multiplexBatchSellTokenForToken_revertsIfMinBuyAmountIsNotSatisfied() public {
        LibNativeOrder.RfqOrder memory rfqOrder = _makeTestRfqOrder();
        IMultiplexFeature.BatchSellSubcall memory rfqSubcall = _makeRfqSubcall(rfqOrder);
        _mintTo(address(rfqOrder.takerToken), rfqOrder.taker, rfqOrder.takerAmount);

        vm.expectRevert("MultiplexFeature::_multiplexBatchSell/UNDERBOUGHT");
        zeroExDeployed.zeroEx.multiplexBatchSellTokenForToken(
            dai,
            zrx,
            _makeArray(rfqSubcall),
            rfqOrder.takerAmount,
            rfqOrder.makerAmount + 1
        );
    }

    // reverts if given an invalid subcall type
    function test_multiplexBatchSellTokenForToken_revertsIfGivenAnInvalidSubcallType() public {
        uint256 sellAmount = 1e18;

        vm.expectRevert("MultiplexFeature::_executeBatchSell/INVALID_SUBCALL");
        zeroExDeployed.zeroEx.multiplexBatchSellTokenForToken(
            dai,
            zrx,
            _makeArray(
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

    // reverts if the full sell amount is not sold
    function test_multiplexBatchSellTokenForToken_revertsIfTheFullSellAmountIsNotSold() public {
        LibNativeOrder.RfqOrder memory rfqOrder = _makeTestRfqOrder();
        IMultiplexFeature.BatchSellSubcall memory rfqSubcall = _makeRfqSubcall(rfqOrder);
        _mintTo(address(rfqOrder.takerToken), rfqOrder.taker, rfqOrder.takerAmount);

        vm.expectRevert("MultiplexFeature::_executeBatchSell/INCORRECT_AMOUNT_SOLD");
        zeroExDeployed.zeroEx.multiplexBatchSellTokenForToken(
            rfqOrder.takerToken,
            rfqOrder.makerToken,
            _makeArray(rfqSubcall),
            rfqOrder.takerAmount + 1,
            rfqOrder.makerAmount
        );
    }

    // RFQ, fallback(UniswapV2)
    function test_multiplexBatchSellTokenForToken_rfqFallbackUniswapV2() public {
        LibNativeOrder.RfqOrder memory rfqOrder = _makeTestRfqOrder();
        _createUniswapV2Pool(uniV2Factory, dai, zrx, 10e18, 10e18);
        _mintTo(address(rfqOrder.takerToken), rfqOrder.taker, rfqOrder.takerAmount);

        vm.expectEmit(true, true, true, true);
        emit RfqOrderFilled(
            zeroExDeployed.features.nativeOrdersFeature.getRfqOrderHash(rfqOrder),
            rfqOrder.maker,
            rfqOrder.taker,
            address(rfqOrder.makerToken),
            address(rfqOrder.takerToken),
            rfqOrder.takerAmount,
            rfqOrder.makerAmount,
            rfqOrder.pool
        );

        zeroExDeployed.zeroEx.multiplexBatchSellTokenForToken(
            rfqOrder.takerToken,
            zrx,
            _makeArray(
                _makeRfqSubcall(rfqOrder),
                _makeUniswapV2BatchSubcall(_makeArray(address(dai), address(zrx)), rfqOrder.takerAmount, false)
            ),
            rfqOrder.takerAmount,
            0
        );
    }

    // OTC, fallback(UniswapV2)
    function test_multiplexBatchSellTokenForToken_otcFallbackUniswapV2() public {
        LibNativeOrder.OtcOrder memory otcOrder = _makeTestOtcOrder();
        _createUniswapV2Pool(uniV2Factory, dai, zrx, 10e18, 10e18);
        _mintTo(address(otcOrder.takerToken), otcOrder.taker, otcOrder.takerAmount);

        vm.expectEmit(true, true, true, true);
        emit OtcOrderFilled(
            zeroExDeployed.features.otcOrdersFeature.getOtcOrderHash(otcOrder),
            otcOrder.maker,
            otcOrder.taker,
            address(otcOrder.makerToken),
            address(otcOrder.takerToken),
            otcOrder.makerAmount,
            otcOrder.takerAmount
        );

        zeroExDeployed.zeroEx.multiplexBatchSellTokenForToken(
            otcOrder.takerToken,
            zrx,
            _makeArray(
                _makeOtcSubcall(otcOrder),
                _makeUniswapV2BatchSubcall(_makeArray(address(dai), address(zrx)), otcOrder.takerAmount, false)
            ),
            otcOrder.takerAmount,
            0
        );
    }

    // expired RFQ, fallback(UniswapV2)
    function test_multiplexBatchSellTokenForToken_expiredRfqFallbackUniswapV2() public {
        LibNativeOrder.RfqOrder memory rfqOrder = _makeTestRfqOrder();
        address uniV2Pool = _createUniswapV2Pool(uniV2Factory, dai, zrx, 10e18, 10e18);
        _mintTo(address(rfqOrder.takerToken), rfqOrder.taker, rfqOrder.takerAmount);
        rfqOrder.expiry = 0;

        vm.expectEmit(true, true, true, true);
        emit ExpiredRfqOrder(
            zeroExDeployed.features.nativeOrdersFeature.getRfqOrderHash(rfqOrder),
            rfqOrder.maker,
            rfqOrder.expiry
        );

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(dai), rfqOrder.taker, uniV2Pool, rfqOrder.takerAmount);

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(zrx), uniV2Pool, rfqOrder.taker, 906610893880149131);

        zeroExDeployed.zeroEx.multiplexBatchSellTokenForToken(
            rfqOrder.takerToken,
            zrx,
            _makeArray(
                _makeRfqSubcall(rfqOrder),
                _makeUniswapV2BatchSubcall(_makeArray(address(dai), address(zrx)), rfqOrder.takerAmount, false)
            ),
            rfqOrder.takerAmount,
            0
        );
    }

    // expired OTC, fallback(UniswapV2)
    function test_multiplexBatchSellTokenForToken_expiredOtcFallbackUniswapV2() public {
        LibNativeOrder.OtcOrder memory otcOrder = _makeTestOtcOrder();
        address uniV2Pool = _createUniswapV2Pool(uniV2Factory, dai, zrx, 10e18, 10e18);
        _mintTo(address(otcOrder.takerToken), otcOrder.taker, otcOrder.takerAmount);
        otcOrder.expiryAndNonce = 1;

        vm.expectEmit(true, true, true, true);
        emit ExpiredOtcOrder(
            zeroExDeployed.features.otcOrdersFeature.getOtcOrderHash(otcOrder),
            otcOrder.maker,
            uint64(otcOrder.expiryAndNonce >> 192)
        );

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(dai), otcOrder.taker, uniV2Pool, otcOrder.takerAmount);

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(zrx), uniV2Pool, otcOrder.taker, 906610893880149131);

        zeroExDeployed.zeroEx.multiplexBatchSellTokenForToken(
            otcOrder.takerToken,
            zrx,
            _makeArray(
                _makeOtcSubcall(otcOrder),
                _makeUniswapV2BatchSubcall(_makeArray(address(dai), address(zrx)), otcOrder.takerAmount, false)
            ),
            otcOrder.takerAmount,
            0
        );
    }

    // expired RFQ, fallback(TransformERC20)
    function test_multiplexBatchSellTokenForToken_expiredRfqFallbackTransformErc20() public {
        LibNativeOrder.RfqOrder memory rfqOrder = _makeTestRfqOrder();
        _mintTo(address(rfqOrder.takerToken), rfqOrder.taker, rfqOrder.takerAmount);
        rfqOrder.expiry = 0;

        vm.expectEmit(true, true, true, true);
        emit ExpiredRfqOrder(
            zeroExDeployed.features.nativeOrdersFeature.getRfqOrderHash(rfqOrder),
            rfqOrder.maker,
            rfqOrder.expiry
        );

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(dai), rfqOrder.taker, address(flashWallet), rfqOrder.takerAmount);

        vm.expectEmit(true, true, true, true);
        emit MintTransform(
            address(flashWallet),
            address(zeroExDeployed.zeroEx),
            address(zeroExDeployed.zeroEx),
            rfqOrder.taker,
            abi.encode(dai, zrx, rfqOrder.takerAmount, 5e17, 0),
            rfqOrder.takerAmount,
            0
        );

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(dai), address(flashWallet), address(0), 1e18);

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(zrx), address(flashWallet), rfqOrder.taker, 5e17);

        zeroExDeployed.zeroEx.multiplexBatchSellTokenForToken(
            rfqOrder.takerToken,
            zrx,
            _makeArray(_makeRfqSubcall(rfqOrder), _makeMockTransformERC20Subcall(dai, zrx, rfqOrder.takerAmount, 5e17)),
            rfqOrder.takerAmount,
            0
        );
    }

    // LiquidityProvider, UniV3, Sushiswap
    function test_multiplexBatchSellTokenForToken_liquidityProviderUniV3Sushiswap() public {
        address sushiswapPool = _createUniswapV2Pool(sushiFactory, dai, zrx, 10e18, 10e18);
        address uniV3Pool = _createUniswapV3Pool(uniV3Factory, dai, zrx, 10e18, 10e18);

        address[] memory tokens = _makeArray(address(dai), address(zrx));
        IMultiplexFeature.BatchSellSubcall memory lpSubcall = _makeMockLiquidityProviderBatchSubcall(4e17);
        IMultiplexFeature.BatchSellSubcall memory uniV3Subcall = _makeUniswapV3BatchSubcall(tokens, 5e17);
        IMultiplexFeature.BatchSellSubcall memory sushiswapSubcall = _makeUniswapV2BatchSubcall(tokens, 6e17, true);
        uint256 sellAmount = lpSubcall.sellAmount + uniV3Subcall.sellAmount + sushiswapSubcall.sellAmount - 1;

        _mintTo(address(dai), address(this), sellAmount);

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(dai), address(this), address(liquidityProvider), lpSubcall.sellAmount);

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(zrx), address(liquidityProvider), address(this), 0);

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(zrx), uniV3Pool, address(this), 10e18);

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(dai), address(this), uniV3Pool, uniV3Subcall.sellAmount);

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(dai), address(this), sushiswapPool, sushiswapSubcall.sellAmount - 1);

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(zrx), sushiswapPool, address(this), 564435470174180520);

        zeroExDeployed.zeroEx.multiplexBatchSellTokenForToken(
            dai,
            zrx,
            _makeArray(lpSubcall, uniV3Subcall, sushiswapSubcall),
            sellAmount,
            0
        );
    }

    // proportional fill amounts
    function test_multiplexBatchSellTokenForToken_proportionalFillAmounts() public {
        LibNativeOrder.RfqOrder memory rfqOrder = _makeTestRfqOrder();
        address uniV2Pool = _createUniswapV2Pool(uniV2Factory, dai, zrx, 10e18, 10e18);

        uint256 sellAmount = 1e18;
        _mintTo(address(dai), address(this), sellAmount);

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(dai), rfqOrder.taker, rfqOrder.maker, 42e16);

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(zrx), rfqOrder.maker, rfqOrder.taker, 42e16);

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(dai), rfqOrder.taker, uniV2Pool, 58e16);

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(zrx), uniV2Pool, rfqOrder.taker, 546649448964196380);

        zeroExDeployed.zeroEx.multiplexBatchSellTokenForToken(
            dai,
            zrx,
            _makeArray(
                _makeRfqSubcall(rfqOrder, _encodeFractionalFillAmount(42)),
                _makeUniswapV2BatchSubcall(
                    _makeArray(address(dai), address(zrx)),
                    _encodeFractionalFillAmount(100),
                    false
                )
            ),
            sellAmount,
            0
        );
    }

    // RFQ, MultiHop(UniV3, UniV2)
    function test_multiplexBatchSellTokenForToken_rfqMultiHopUniV3UniV2() public {
        address uniV2Pool = _createUniswapV2Pool(uniV2Factory, shib, zrx, 10e18, 10e18);
        address uniV3Pool = _createUniswapV3Pool(uniV3Factory, dai, shib, 10e18, 10e18);

        LibNativeOrder.RfqOrder memory rfqOrder = _makeTestRfqOrder();
        IMultiplexFeature.BatchSellSubcall memory rfqSubcall = _makeRfqSubcall(rfqOrder);
        IMultiplexFeature.BatchSellSubcall memory nestedMultiHopSubcall = _makeNestedMultiHopSellSubcall(
            _makeArray(address(dai), address(shib), address(zrx)),
            _makeArray(
                _makeUniswapV3MultiHopSubcall(_makeArray(address(dai), address(shib))),
                _makeUniswapV2MultiHopSubcall(_makeArray(address(shib), address(zrx)), false)
            ),
            5e17
        );

        uint256 sellAmount = rfqSubcall.sellAmount + nestedMultiHopSubcall.sellAmount;
        _mintTo(address(dai), address(this), sellAmount);

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(dai), rfqOrder.taker, rfqOrder.maker, rfqOrder.takerAmount);

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(zrx), rfqOrder.maker, rfqOrder.taker, rfqOrder.makerAmount);

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(shib), uniV3Pool, uniV2Pool, 10e18);

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(dai), rfqOrder.taker, uniV3Pool, nestedMultiHopSubcall.sellAmount);

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(zrx), uniV2Pool, rfqOrder.taker, 4992488733099649474);

        zeroExDeployed.zeroEx.multiplexBatchSellTokenForToken(
            dai,
            zrx,
            _makeArray(rfqSubcall, nestedMultiHopSubcall),
            sellAmount,
            0
        );
    }

    //// multihop sells

    // reverts if given an invalid subcall type
    function test_multiplexMultiHopSellTokenForToken_revertsIfGivenAnInvalidSubcallType() public {
        vm.expectRevert("MultiplexFeature::_computeHopTarget/INVALID_SUBCALL");
        zeroExDeployed.zeroEx.multiplexMultiHopSellTokenForToken(
            _makeArray(address(dai), address(zrx)),
            _makeArray(
                IMultiplexFeature.MultiHopSellSubcall({id: IMultiplexFeature.MultiplexSubcall.Invalid, data: hex""})
            ),
            1e18,
            0
        );
    }

    // reverts if minBuyAmount is not satisfied
    function test_multiplexMultiHopSellTokenForToken_revertsIfMinBuyAmountIsNotSatisfied() public {
        _createUniswapV2Pool(uniV2Factory, dai, zrx, 10e18, 10e18);

        uint256 sellAmount = 5e17;
        _mintTo(address(dai), address(this), sellAmount);

        vm.expectRevert("MultiplexFeature::_multiplexMultiHopSell/UNDERBOUGHT");
        zeroExDeployed.zeroEx.multiplexMultiHopSellTokenForToken(
            _makeArray(address(dai), address(zrx)),
            _makeArray(_makeUniswapV2MultiHopSubcall(_makeArray(address(dai), address(zrx)), false)),
            sellAmount,
            type(uint256).max
        );
    }

    // reverts if array lengths are mismatched
    function test_multiplexMultiHopSellTokenForToken_revertsIfArrayLengthsAreMismatched() public {
        _createUniswapV2Pool(uniV2Factory, dai, zrx, 10e18, 10e18);
        IMultiplexFeature.MultiHopSellSubcall memory uniswapV2Subcall = _makeUniswapV2MultiHopSubcall(
            _makeArray(address(dai), address(zrx)),
            false
        );

        uint256 sellAmount = 5e17;
        _mintTo(address(dai), address(this), sellAmount);

        vm.expectRevert("MultiplexFeature::_multiplexMultiHopSell/MISMATCHED_ARRAY_LENGTHS");
        zeroExDeployed.zeroEx.multiplexMultiHopSellTokenForToken(
            _makeArray(address(dai), address(zrx)),
            _makeArray(uniswapV2Subcall, uniswapV2Subcall),
            sellAmount,
            0
        );
    }

    // UniswapV2 -> LiquidityProvider
    function test_multiplexMultiHopSellTokenForToken_uniswapV2ToLiquidityProvider() public {
        address uniV2Pool = _createUniswapV2Pool(uniV2Factory, dai, shib, 10e18, 10e18);
        IMultiplexFeature.MultiHopSellSubcall memory lpSubcall = _makeMockLiquidityProviderMultiHopSubcall();
        IMultiplexFeature.MultiHopSellSubcall memory uniswapV2Subcall = _makeUniswapV2MultiHopSubcall(
            _makeArray(address(dai), address(shib)),
            false
        );

        uint256 sellAmount = 5e17;
        uint256 buyAmount = 6e17;
        _mintTo(address(dai), address(this), sellAmount);
        _mintTo(address(zrx), address(liquidityProvider), buyAmount);

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(dai), address(this), uniV2Pool, sellAmount);

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(shib), uniV2Pool, address(liquidityProvider), 474829737581559270);

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(zrx), address(liquidityProvider), address(this), buyAmount);

        zeroExDeployed.zeroEx.multiplexMultiHopSellTokenForToken(
            _makeArray(address(dai), address(shib), address(zrx)),
            _makeArray(uniswapV2Subcall, lpSubcall),
            sellAmount,
            buyAmount
        );
    }

    // LiquidityProvider -> Sushiswap
    function test_multiplexMultiHopSellTokenForToken_liquidityProviderToSushiswap() public {
        address sushiPool = _createUniswapV2Pool(sushiFactory, shib, zrx, 10e18, 10e18);
        IMultiplexFeature.MultiHopSellSubcall memory lpSubcall = _makeMockLiquidityProviderMultiHopSubcall();
        IMultiplexFeature.MultiHopSellSubcall memory sushiswapSubcall = _makeUniswapV2MultiHopSubcall(
            _makeArray(address(shib), address(zrx)),
            true
        );

        uint256 sellAmount = 5e17;
        uint256 shibAmount = 6e17;
        _mintTo(address(dai), address(this), sellAmount);
        _mintTo(address(shib), address(liquidityProvider), shibAmount);

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(dai), address(this), address(liquidityProvider), sellAmount);

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(shib), address(liquidityProvider), sushiPool, shibAmount);

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(zrx), sushiPool, address(this), 564435470174180521);

        zeroExDeployed.zeroEx.multiplexMultiHopSellTokenForToken(
            _makeArray(address(dai), address(shib), address(zrx)),
            _makeArray(lpSubcall, sushiswapSubcall),
            sellAmount,
            0
        );
    }

    // UniswapV3 -> BatchSell(RFQ, UniswapV2)
    function test_multiplexMultiHopSellTokenForToken_uniswapV3ToBatchSellRfqUniswapV2() public {
        address uniV2Pool = _createUniswapV2Pool(uniV2Factory, shib, zrx, 10e18, 10e18);
        address uniV3Pool = _createUniswapV3Pool(uniV3Factory, dai, shib, 10e18, 10e18);

        LibNativeOrder.RfqOrder memory rfqOrder = _makeTestRfqOrder();
        rfqOrder.takerToken = shib;
        rfqOrder.makerToken = zrx;

        IMultiplexFeature.BatchSellSubcall memory rfqSubcall = _makeRfqSubcall(rfqOrder);
        rfqSubcall.sellAmount = _encodeFractionalFillAmount(42);

        uint256 sellAmount = 5e17;
        _mintTo(address(dai), address(this), sellAmount);

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(shib), uniV3Pool, address(zeroExDeployed.zeroEx), 10e18);

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(dai), address(this), uniV3Pool, sellAmount);

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(shib), address(zeroExDeployed.zeroEx), rfqOrder.maker, 1e18);

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(zrx), rfqOrder.maker, address(this), 1e18);

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(shib), address(zeroExDeployed.zeroEx), uniV2Pool, 9e18);

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(zrx), uniV2Pool, address(this), 4729352237389975227);

        zeroExDeployed.zeroEx.multiplexMultiHopSellTokenForToken(
            _makeArray(address(dai), address(shib), address(zrx)),
            _makeArray(
                _makeUniswapV3MultiHopSubcall(_makeArray(address(dai), address(shib))),
                _makeNestedBatchSellSubcall(
                    _makeArray(
                        rfqSubcall,
                        _makeUniswapV2BatchSubcall(
                            _makeArray(address(shib), address(zrx)),
                            _encodeFractionalFillAmount(100),
                            false
                        )
                    )
                )
            ),
            sellAmount,
            0
        );
    }

    // BatchSell(RFQ, UniswapV2) -> UniswapV3
    function test_multiplexMultiHopSellTokenForToken_batchSellRfqUniswapV2ToUniswapV3() public {
        address uniV2Pool = _createUniswapV2Pool(uniV2Factory, dai, shib, 10e18, 10e18);
        address uniV3Pool = _createUniswapV3Pool(uniV3Factory, shib, zrx, 10e18, 10e18);

        LibNativeOrder.RfqOrder memory rfqOrder = _makeTestRfqOrder({makerToken: shib, takerToken: dai});

        IMultiplexFeature.BatchSellSubcall memory rfqSubcall = _makeRfqSubcall(rfqOrder);
        IMultiplexFeature.BatchSellSubcall memory uniswapV2Subcall = _makeUniswapV2BatchSubcall(
            _makeArray(address(dai), address(shib)),
            5e17,
            false
        );

        uint256 sellAmount = rfqSubcall.sellAmount + uniswapV2Subcall.sellAmount;
        _mintTo(address(dai), address(this), sellAmount);

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(dai), address(this), rfqOrder.maker, rfqOrder.takerAmount);

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(shib), rfqOrder.maker, address(zeroExDeployed.zeroEx), rfqOrder.takerAmount);

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(dai), address(this), uniV2Pool, uniswapV2Subcall.sellAmount);

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(shib), uniV2Pool, address(zeroExDeployed.zeroEx), 474829737581559270);

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(zrx), uniV3Pool, address(this), 10e18);

        vm.expectEmit(true, true, true, true);
        emit Transfer(address(shib), address(zeroExDeployed.zeroEx), uniV3Pool, 1474829737581559270);

        zeroExDeployed.zeroEx.multiplexMultiHopSellTokenForToken(
            _makeArray(address(dai), address(shib), address(zrx)),
            _makeArray(
                _makeNestedBatchSellSubcall(_makeArray(rfqSubcall, uniswapV2Subcall)),
                _makeUniswapV3MultiHopSubcall(_makeArray(address(shib), address(zrx)))
            ),
            sellAmount,
            0
        );
    }
}
