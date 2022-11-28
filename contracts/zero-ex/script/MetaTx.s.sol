// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.5;
pragma experimental ABIEncoderV2;

import "forge-std/Script.sol";
import "src/IZeroEx.sol";
import "src/features/MetaTransactionsFeature.sol";
import "src/features/interfaces/IMetaTransactionsFeature.sol";
import "src/features/libs/LibSignature.sol";
import "src/transformers/FillQuoteTransformer.sol";
import "src/transformers/PayTakerTransformer.sol";

contract MetaTxScript is Script {
    IZeroEx private constant exchangeProxy = IZeroEx(0xDef1C0ded9bec7F1a1670819833240f027b25EfF);
    IERC20TokenV06 private constant wethToken = IERC20TokenV06(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);
    IERC20TokenV06 private constant usdcToken = IERC20TokenV06(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
    uint256 private constant oneEth = 1e18;

    address private constant ZERO_ADDRESS = 0x0000000000000000000000000000000000000000;
    address private constant USER_ADDRESS = 0x6dc3a54FeAE57B65d185A7B159c5d3FA7fD7FD0F;
    uint256 private constant USER_KEY = 0x1fc1630343b31e60b7a197a53149ca571ed9d9791e2833337bbd8110c30710ec;
    uint32 private constant PAYTAKER_TFM_NONCE = 7;
    uint32 private constant FILLQUOTE_TFM_NONCE = 25;

    function mtxCall(bytes memory callData) private returns (bytes memory) {
        IMetaTransactionsFeature.MetaTransactionFeeData[] memory fees = new IMetaTransactionsFeature.MetaTransactionFeeData[](1);
        fees[0] = IMetaTransactionsFeature.MetaTransactionFeeData({
            recipient: address(123),
            token: wethToken,
            amount: oneEth
        });
        IMetaTransactionsFeature.MetaTransactionData memory mtx = IMetaTransactionsFeature.MetaTransactionData({
            signer: payable(USER_ADDRESS),
            sender: ZERO_ADDRESS,
            minGasPrice: 0,
            maxGasPrice: 100000000000,
            expirationTimeSeconds: block.timestamp + 600,
            salt: 123,
            callData: callData,
            value: 0,
            fees: fees
        });

        bytes32 mtxHash = exchangeProxy.getMetaTransactionHash(mtx);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(USER_KEY, mtxHash);
        LibSignature.Signature memory sig = LibSignature.Signature(LibSignature.SignatureType.EIP712, v, r, s);

        return abi.encodeWithSelector(
            exchangeProxy.executeMetaTransaction.selector,
            mtx,
            sig
        );
    }

    function transformERC20Call() private pure returns (bytes memory) {
        FillQuoteTransformer.OrderType[] memory fillSequence = new FillQuoteTransformer.OrderType[](1);
        fillSequence[0] = FillQuoteTransformer.OrderType.Bridge;

        FillQuoteTransformer.TransformData memory fillQuoteTransformData = FillQuoteTransformer.TransformData({
            side: FillQuoteTransformer.Side.Sell,
            sellToken: wethToken,
            buyToken: usdcToken,
            bridgeOrders: new IBridgeAdapter.BridgeOrder[](0),
            limitOrders: new FillQuoteTransformer.LimitOrderInfo[](0),
            rfqOrders: new FillQuoteTransformer.RfqOrderInfo[](0),
            fillSequence: new FillQuoteTransformer.OrderType[](0),
            fillAmount: 0,
            refundReceiver: address(0),
            otcOrders: new FillQuoteTransformer.OtcOrderInfo[](0)
        });

        IERC20TokenV06[] memory payTakerTokens = new IERC20TokenV06[](1);
        payTakerTokens[0] = wethToken;
        PayTakerTransformer.TransformData memory payTakerTransformData = PayTakerTransformer.TransformData(
            payTakerTokens,
            new uint256[](0)
        );

        ITransformERC20Feature.Transformation[] memory transformations = new ITransformERC20Feature.Transformation[](2);
        transformations[0] = ITransformERC20Feature.Transformation(
            FILLQUOTE_TFM_NONCE,
            abi.encode(fillQuoteTransformData)
        );
        transformations[1] = ITransformERC20Feature.Transformation(
            PAYTAKER_TFM_NONCE,
            abi.encode(payTakerTransformData)
        );

        return abi.encodeWithSelector(
            exchangeProxy.transformERC20.selector,
            wethToken,
            usdcToken,
            0,
            0,
            transformations
        );
    }

    function deploy() private {
        address mtxFeature = address(new MetaTransactionsFeature(address(exchangeProxy)));
        address owner = exchangeProxy.owner();

        vm.prank(owner);
        exchangeProxy.migrate(mtxFeature, abi.encodeWithSignature("migrate()"), owner);
    }

    function run() public {
        deploy();

        bytes memory transformCalldata = transformERC20Call();
        bytes memory mtxCalldata = mtxCall(transformCalldata);

        vm.prank(ZERO_ADDRESS);
        wethToken.transfer(USER_ADDRESS, oneEth);
        vm.prank(USER_ADDRESS);
        wethToken.approve(address(exchangeProxy), oneEth);

        vm.prank(USER_ADDRESS);
        (address(exchangeProxy).call(mtxCalldata));
    }
}
