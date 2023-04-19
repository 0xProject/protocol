// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6;
pragma experimental ABIEncoderV2;

import {LocalTest} from "utils/LocalTest.sol";
import {MultiplexUtils} from "utils/MultiplexUtils.sol";
import {LibSignature} from "src/features/libs/LibSignature.sol";
import {LibNativeOrder} from "src/features/libs/LibNativeOrder.sol";
import {IMetaTransactionsFeatureV2} from "src/features/interfaces/IMetaTransactionsFeatureV2.sol";

contract MultiplexMetaTransactionsV2 is LocalTest, MultiplexUtils {
    function _makeMetaTransactionV2(
        bytes memory callData
    ) private view returns (IMetaTransactionsFeatureV2.MetaTransactionDataV2 memory, LibSignature.Signature memory) {
        IMetaTransactionsFeatureV2.MetaTransactionDataV2 memory mtx = IMetaTransactionsFeatureV2.MetaTransactionDataV2({
            signer: payable(otherSignerAddress),
            sender: address(0),
            expirationTimeSeconds: block.timestamp + 600,
            salt: 123,
            callData: callData,
            feeToken: dai,
            fees: new IMetaTransactionsFeatureV2.MetaTransactionFeeData[](0)
        });

        bytes32 mtxHash = zeroExDeployed.zeroEx.getMetaTransactionV2Hash(mtx);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(otherSignerKey, mtxHash);
        LibSignature.Signature memory sig = LibSignature.Signature(LibSignature.SignatureType.EIP712, v, r, s);

        return (mtx, sig);
    }

    function _executeMetaTransaction(bytes memory callData) private {
        IMetaTransactionsFeatureV2.MetaTransactionDataV2 memory mtx;
        LibSignature.Signature memory sig;
        (mtx, sig) = _makeMetaTransactionV2(callData);
        zeroExDeployed.zeroEx.executeMetaTransactionV2(mtx, sig);
    }

    // batch

    function test_metaTransaction_multiplexBatchSellTokenForToken_rfqOrder() external {
        LibNativeOrder.RfqOrder memory rfqOrder = _makeTestRfqOrder();
        rfqOrder.taker = otherSignerAddress;
        _mintTo(address(rfqOrder.takerToken), otherSignerAddress, rfqOrder.takerAmount);

        _executeMetaTransaction(
            abi.encodeWithSelector(
                zeroExDeployed.zeroEx.multiplexBatchSellTokenForToken.selector,
                dai,
                zrx,
                _makeArray(_makeRfqSubcall(rfqOrder)),
                rfqOrder.takerAmount,
                rfqOrder.makerAmount
            )
        );
    }

    function test_metaTransaction_multiplexBatchSellTokenForToken_otcOrder() external {
        LibNativeOrder.OtcOrder memory otcOrder = _makeTestOtcOrder();
        otcOrder.taker = otherSignerAddress;
        _mintTo(address(otcOrder.takerToken), otherSignerAddress, otcOrder.takerAmount);

        _executeMetaTransaction(
            abi.encodeWithSelector(
                zeroExDeployed.zeroEx.multiplexBatchSellTokenForToken.selector,
                dai,
                zrx,
                _makeArray(_makeOtcSubcall(otcOrder)),
                otcOrder.takerAmount,
                otcOrder.makerAmount
            )
        );
    }

    function test_metaTransaction_multiplexBatchSellTokenForToken_uniswapV2() external {
        _createUniswapV2Pool(uniV2Factory, dai, zrx, 10e18, 10e18);
        _mintTo(address(dai), otherSignerAddress, 1e18);

        _executeMetaTransaction(
            abi.encodeWithSelector(
                zeroExDeployed.zeroEx.multiplexBatchSellTokenForToken.selector,
                dai,
                zrx,
                _makeArray(_makeUniswapV2BatchSubcall(_makeArray(address(dai), address(zrx)), 1e18, false)),
                1e18,
                1
            )
        );
    }

    function test_metaTransaction_multiplexBatchSellTokenForToken_uniswapV3() external {
        _createUniswapV3Pool(uniV3Factory, dai, zrx, 10e18, 10e18);
        _mintTo(address(dai), otherSignerAddress, 1e18);

        _executeMetaTransaction(
            abi.encodeWithSelector(
                zeroExDeployed.zeroEx.multiplexBatchSellTokenForToken.selector,
                dai,
                zrx,
                _makeArray(_makeUniswapV3BatchSubcall(_makeArray(address(dai), address(zrx)), 1e18)),
                1e18,
                1
            )
        );
    }

    function test_metaTransaction_multiplexBatchSellTokenForToken_liquidityProvider() external {
        _mintTo(address(dai), otherSignerAddress, 1e18);
        _mintTo(address(zrx), address(liquidityProvider), 1e18);

        _executeMetaTransaction(
            abi.encodeWithSelector(
                zeroExDeployed.zeroEx.multiplexBatchSellTokenForToken.selector,
                dai,
                zrx,
                _makeArray(_makeMockLiquidityProviderBatchSubcall(1e18)),
                1e18,
                1
            )
        );
    }

    function test_metaTransaction_multiplexBatchSellTokenForToken_transformErc20() external {
        _mintTo(address(dai), otherSignerAddress, 1e18);

        _executeMetaTransaction(
            abi.encodeWithSelector(
                zeroExDeployed.zeroEx.multiplexBatchSellTokenForToken.selector,
                dai,
                zrx,
                _makeArray(_makeMockTransformERC20Subcall(dai, zrx, 1e18, 1e18)),
                1e18,
                1
            )
        );
    }

    function test_metaTransaction_multiplexBatchSellTokenForToken_rfqOrderUniswapV3() external {
        _createUniswapV3Pool(uniV3Factory, dai, zrx, 10e18, 10e18);
        LibNativeOrder.RfqOrder memory rfqOrder = _makeTestRfqOrder();
        rfqOrder.taker = otherSignerAddress;
        _mintTo(address(dai), otherSignerAddress, 2e18);

        _executeMetaTransaction(
            abi.encodeWithSelector(
                zeroExDeployed.zeroEx.multiplexBatchSellTokenForToken.selector,
                dai,
                zrx,
                _makeArray(
                    _makeRfqSubcall(rfqOrder),
                    _makeUniswapV3BatchSubcall(_makeArray(address(dai), address(zrx)), 1e18)
                ),
                2e18,
                11e18
            )
        );
    }

    function test_metaTransaction_multiplexBatchSellTokenForToken_rfqOrderFallbackUniswapV3() external {
        _createUniswapV3Pool(uniV3Factory, dai, zrx, 10e18, 10e18);
        _mintTo(address(dai), otherSignerAddress, 2e18);
        LibNativeOrder.RfqOrder memory rfqOrder = _makeTestRfqOrder();
        rfqOrder.taker = otherSignerAddress;
        rfqOrder.expiry = 1;

        _executeMetaTransaction(
            abi.encodeWithSelector(
                zeroExDeployed.zeroEx.multiplexBatchSellTokenForToken.selector,
                dai,
                zrx,
                _makeArray(
                    _makeRfqSubcall(rfqOrder),
                    _makeUniswapV3BatchSubcall(_makeArray(address(dai), address(zrx)), 1e18)
                ),
                1e18,
                10e18
            )
        );
    }

    function test_metaTransaction_multiplexBatchSellTokenForToken_uniswapV3_revertsIfIncorrectAmount() external {
        _createUniswapV3Pool(uniV3Factory, dai, zrx, 10e18, 10e18);
        _mintTo(address(dai), otherSignerAddress, 1e18);

        IMetaTransactionsFeatureV2.MetaTransactionDataV2 memory mtx;
        LibSignature.Signature memory sig;
        (mtx, sig) = _makeMetaTransactionV2(
            abi.encodeWithSelector(
                zeroExDeployed.zeroEx.multiplexBatchSellTokenForToken.selector,
                dai,
                zrx,
                _makeArray(_makeUniswapV3BatchSubcall(_makeArray(address(dai), address(zrx)), 5e17)),
                1e18,
                1
            )
        );

        vm.expectRevert();
        zeroExDeployed.zeroEx.executeMetaTransactionV2(mtx, sig);
    }

    // multi hop

    function test_metaTransaction_multiplexMultiHopSellTokenForToken_uniswapV2() external {
        _createUniswapV2Pool(uniV2Factory, dai, zrx, 10e18, 10e18);
        address[] memory tokens = _makeArray(address(dai), address(zrx));
        _mintTo(address(dai), otherSignerAddress, 1e18);

        _executeMetaTransaction(
            abi.encodeWithSelector(
                zeroExDeployed.zeroEx.multiplexMultiHopSellTokenForToken.selector,
                tokens,
                _makeArray(_makeUniswapV2MultiHopSubcall(tokens, false)),
                1e18,
                1
            )
        );
    }

    function test_metaTransaction_multiplexMultiHopSellTokenForToken_uniswapV3() external {
        _createUniswapV3Pool(uniV3Factory, dai, zrx, 10e18, 10e18);
        address[] memory tokens = _makeArray(address(dai), address(zrx));
        _mintTo(address(dai), otherSignerAddress, 1e18);

        _executeMetaTransaction(
            abi.encodeWithSelector(
                zeroExDeployed.zeroEx.multiplexMultiHopSellTokenForToken.selector,
                tokens,
                _makeArray(_makeUniswapV3MultiHopSubcall(tokens)),
                1e18,
                1
            )
        );
    }

    function test_metaTransaction_multiplexMultiHopSellTokenForToken_liquidityProvider() external {
        _mintTo(address(dai), otherSignerAddress, 1e18);
        _mintTo(address(zrx), address(liquidityProvider), 1e18);

        _executeMetaTransaction(
            abi.encodeWithSelector(
                zeroExDeployed.zeroEx.multiplexMultiHopSellTokenForToken.selector,
                _makeArray(address(dai), address(zrx)),
                _makeArray(_makeMockLiquidityProviderMultiHopSubcall()),
                1e18,
                1
            )
        );
    }

    function test_metaTransaction_multiplexMultiHopSellTokenForToken_uniswapV2UniswapV3() external {
        _createUniswapV2Pool(uniV2Factory, dai, shib, 10e18, 10e18);
        _createUniswapV3Pool(uniV3Factory, shib, zrx, 10e18, 10e18);
        _mintTo(address(dai), otherSignerAddress, 1e18);

        _executeMetaTransaction(
            abi.encodeWithSelector(
                zeroExDeployed.zeroEx.multiplexMultiHopSellTokenForToken.selector,
                _makeArray(address(dai), address(shib), address(zrx)),
                _makeArray(
                    _makeUniswapV2MultiHopSubcall(_makeArray(address(dai), address(shib)), false),
                    _makeUniswapV3MultiHopSubcall(_makeArray(address(shib), address(zrx)))
                ),
                1e18,
                10e18
            )
        );
    }

    // batch for eth

    function test_metaTransaction_multiplexBatchSellTokenForEth_uniswapV3() external {
        _createUniswapV3Pool(uniV3Factory, dai, weth, 10e18, 10e18);
        _mintTo(address(dai), otherSignerAddress, 1e18);

        _executeMetaTransaction(
            abi.encodeWithSelector(
                zeroExDeployed.zeroEx.multiplexBatchSellTokenForEth.selector,
                dai,
                _makeArray(_makeUniswapV3BatchSubcall(_makeArray(address(dai), address(weth)), 1e18)),
                1e18,
                1
            )
        );
    }

    function test_metaTransaction_multiplexBatchSellTokenForEth_rfqOrderUniswapV3() external {
        _createUniswapV3Pool(uniV3Factory, dai, weth, 10e18, 10e18);
        LibNativeOrder.RfqOrder memory rfqOrder = _makeTestRfqOrder();
        rfqOrder.taker = otherSignerAddress;
        rfqOrder.makerToken = weth;
        _mintTo(address(weth), rfqOrder.maker, rfqOrder.makerAmount);
        _mintTo(address(dai), otherSignerAddress, 2e18);

        _executeMetaTransaction(
            abi.encodeWithSelector(
                zeroExDeployed.zeroEx.multiplexBatchSellTokenForEth.selector,
                dai,
                _makeArray(
                    _makeRfqSubcall(rfqOrder),
                    _makeUniswapV3BatchSubcall(_makeArray(address(dai), address(weth)), 1e18)
                ),
                2e18,
                11e18
            )
        );
    }

    // nested

    function test_metaTransaction_multiplexBatchSellTokenForToken_nestedUniswapV3() external {
        _createUniswapV3Pool(uniV3Factory, dai, zrx, 10e18, 10e18);
        address[] memory tokens = _makeArray(address(dai), address(zrx));
        _mintTo(address(dai), otherSignerAddress, 1e18);

        _executeMetaTransaction(
            abi.encodeWithSelector(
                zeroExDeployed.zeroEx.multiplexBatchSellTokenForToken.selector,
                dai,
                zrx,
                _makeArray(
                    _makeNestedMultiHopSellSubcall(tokens, _makeArray(_makeUniswapV3MultiHopSubcall(tokens)), 1e18)
                ),
                1e18,
                1
            )
        );
    }

    function test_metaTransaction_multiplexMultiHopSellTokenForToken_nestedUniswapV3() external {
        _createUniswapV3Pool(uniV3Factory, dai, zrx, 10e18, 10e18);
        _mintTo(address(dai), otherSignerAddress, 1e18);

        _executeMetaTransaction(
            abi.encodeWithSelector(
                zeroExDeployed.zeroEx.multiplexMultiHopSellTokenForToken.selector,
                _makeArray(address(dai), address(zrx)),
                _makeArray(
                    _makeNestedBatchSellSubcall(
                        _makeArray(_makeUniswapV3BatchSubcall(_makeArray(address(dai), address(zrx)), 1e18))
                    )
                ),
                1e18,
                1
            )
        );
    }

    // multi hop for eth

    function test_metaTransaction_multiplexMultiHopSellTokenForEth_uniswapV3() external {
        _createUniswapV3Pool(uniV3Factory, dai, weth, 10e18, 10e18);
        address[] memory tokens = _makeArray(address(dai), address(weth));
        _mintTo(address(dai), otherSignerAddress, 1e18);

        _executeMetaTransaction(
            abi.encodeWithSelector(
                zeroExDeployed.zeroEx.multiplexMultiHopSellTokenForEth.selector,
                tokens,
                _makeArray(_makeUniswapV3MultiHopSubcall(tokens)),
                1e18,
                1
            )
        );
    }

    function test_metaTransaction_multiplexMultiHopSellTokenForEth_uniswapV3_revertsNotWeth() external {
        _createUniswapV3Pool(uniV3Factory, dai, zrx, 10e18, 10e18);
        address[] memory tokens = _makeArray(address(dai), address(zrx));
        _mintTo(address(dai), otherSignerAddress, 1e18);

        IMetaTransactionsFeatureV2.MetaTransactionDataV2 memory mtx;
        LibSignature.Signature memory sig;
        (mtx, sig) = _makeMetaTransactionV2(
            abi.encodeWithSelector(
                zeroExDeployed.zeroEx.multiplexMultiHopSellTokenForEth.selector,
                tokens,
                _makeArray(_makeUniswapV3MultiHopSubcall(tokens)),
                1e18,
                1
            )
        );

        vm.expectRevert("MetaTransactionsFeature::multiplexMultiHopSellTokenForEth/NOT_WETH");
        zeroExDeployed.zeroEx.executeMetaTransactionV2(mtx, sig);
    }

    function test_metaTransaction_multiplexMultiHopSellTokenForEth_uniswapV2UniswapV3() external {
        _createUniswapV2Pool(uniV2Factory, dai, shib, 10e18, 10e18);
        _createUniswapV3Pool(uniV3Factory, shib, weth, 10e18, 10e18);
        _mintTo(address(dai), otherSignerAddress, 1e18);

        _executeMetaTransaction(
            abi.encodeWithSelector(
                zeroExDeployed.zeroEx.multiplexMultiHopSellTokenForToken.selector,
                _makeArray(address(dai), address(shib), address(weth)),
                _makeArray(
                    _makeUniswapV2MultiHopSubcall(_makeArray(address(dai), address(shib)), false),
                    _makeUniswapV3MultiHopSubcall(_makeArray(address(shib), address(weth)))
                ),
                1e18,
                10e18
            )
        );
    }
}
