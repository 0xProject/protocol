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

pragma solidity ^0.6.5;
pragma experimental ABIEncoderV2;

import "./utils/BaseTest.sol";
import "forge-std/Test.sol";
import "./utils/DeployZeroEx.sol";
import "./utils/TestUtils.sol";
import "../contracts/src/features/MetaTransactionsFeatureV2.sol";
import "../contracts/src/features/interfaces/IMetaTransactionsFeatureV2.sol";
import "../contracts/test/TestMintTokenERC20Transformer.sol";
import "../contracts/src/features/libs/LibSignature.sol";
import "src/features/libs/LibNativeOrder.sol";
import "../contracts/test/tokens/TestMintableERC20Token.sol";
import "@0x/contracts-utils/contracts/src/v06/errors/LibRichErrorsV06.sol";
import "@0x/contracts-erc20/src/IEtherToken.sol";

contract MetaTransactionTest is BaseTest, TestUtils {
    DeployZeroEx.ZeroExDeployed zeroExDeployed;
    address private constant ZERO_ADDRESS = 0x0000000000000000000000000000000000000000;
    address private constant USER_ADDRESS = 0x6dc3a54FeAE57B65d185A7B159c5d3FA7fD7FD0F;
    uint256 private constant USER_KEY = 0x1fc1630343b31e60b7a197a53149ca571ed9d9791e2833337bbd8110c30710ec;
    IEtherToken private wethToken;
    IERC20Token private usdcToken;
    IERC20Token private zrxToken;
    uint256 private constant oneEth = 1e18;
    address private signerAddress;
    uint256 private signerKey;
    uint256 private transformerNonce;

    event MetaTransactionExecuted(bytes32 hash, bytes4 indexed selector, address signer, address sender);

    function setUp() public {
        (signerAddress, signerKey) = getSigner();
        zeroExDeployed = new DeployZeroEx().deployZeroEx();
        wethToken = zeroExDeployed.weth;
        usdcToken = IERC20Token(address(new TestMintableERC20Token()));
        zrxToken = IERC20Token(address(new TestMintableERC20Token()));

        transformerNonce = zeroExDeployed.transformerDeployer.nonce();
        vm.prank(zeroExDeployed.transformerDeployer.authorities(0));
        zeroExDeployed.transformerDeployer.deploy(type(TestMintTokenERC20Transformer).creationCode);

        vm.deal(address(this), 10e18);
        vm.deal(USER_ADDRESS, 10e18);
        vm.deal(signerAddress, 10e18);
    }

    function _mtxSignature(IMetaTransactionsFeatureV2.MetaTransactionDataV2 memory mtx) private returns (LibSignature.Signature memory) {
        return _mtxSignatureWithSignerKey(mtx, USER_KEY);
    }

    function _mtxSignatureWithSignerKey(IMetaTransactionsFeatureV2.MetaTransactionDataV2 memory mtx, uint256 key) private returns (LibSignature.Signature memory) {
        // Mint fee to signer and approve
        for (uint256 i = 0; i < mtx.fees.length; ++i) {
            mintToWETH(wethToken, mtx.signer, mtx.fees[i].amount);
        }
        vm.prank(mtx.signer);
        mtx.feeToken.approve(address(zeroExDeployed.zeroEx), oneEth);

        bytes32 mtxHash = zeroExDeployed.features.metaTransactionsFeatureV2.getMetaTransactionV2Hash(mtx);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, mtxHash);
        LibSignature.Signature memory sig = LibSignature.Signature(LibSignature.SignatureType.EIP712, v, r, s);

        return sig;
    }

    function _getMetaTransaction(bytes memory callData) private view returns (IMetaTransactionsFeatureV2.MetaTransactionDataV2 memory) {   
        IMetaTransactionsFeatureV2.MetaTransactionFeeData[] memory fees = new IMetaTransactionsFeatureV2.MetaTransactionFeeData[](1);
        fees[0] = IMetaTransactionsFeatureV2.MetaTransactionFeeData({
            recipient: address(this),
            amount: 1
        });
        return _getMetaTransactionWithFees(callData, fees);
    }

    function _getMetaTransactionWithFees(bytes memory callData, IMetaTransactionsFeatureV2.MetaTransactionFeeData[] memory fees) private view returns (IMetaTransactionsFeatureV2.MetaTransactionDataV2 memory) {   
        IMetaTransactionsFeatureV2.MetaTransactionDataV2 memory mtx = IMetaTransactionsFeatureV2.MetaTransactionDataV2({
            signer: payable(USER_ADDRESS),
            sender: address(this),
            expirationTimeSeconds: block.timestamp + 60,
            salt: 123,
            callData: callData,
            feeToken: wethToken,
            fees: fees
        });
        return mtx;
    }

    function _badSelectorTransformERC20Call() private returns (bytes memory) {
        return abi.encodeWithSelector(
            ITransformERC20Feature.createTransformWallet.selector
        );
    }

    function _badTokenTransformERC20Call() private returns (bytes memory) {
        ITransformERC20Feature.Transformation[] memory transformations = new ITransformERC20Feature.Transformation[](1);
        transformations[0] = ITransformERC20Feature.Transformation(
            uint32(transformerNonce),
            abi.encode(address(usdcToken), address(wethToken), 0, oneEth, 0)
        );

        mintTo(usdcToken, USER_ADDRESS, oneEth);
        vm.prank(USER_ADDRESS);
        usdcToken.approve(address(zeroExDeployed.zeroEx), oneEth);

        return abi.encodeWithSelector(
            zeroExDeployed.zeroEx.transformERC20.selector, // 0x415565b0
            usdcToken,
            wethToken,
            oneEth,
            oneEth,
            transformations
        );
    }

    function test_createHash() external {
        bytes memory transformCallData = transformERC20Call(zeroExDeployed, zrxToken, usdcToken, USER_ADDRESS, transformerNonce);
        IMetaTransactionsFeatureV2.MetaTransactionDataV2 memory mtxData = _getMetaTransaction(transformCallData);

        //mtxData.signer = address(0);
        bytes32 mtxHash = zeroExDeployed.features.metaTransactionsFeatureV2.getMetaTransactionV2Hash(mtxData);
        assertTrue(mtxHash != bytes32(0));
    }

    function test_transformERC20() external {
        bytes memory transformCallData = transformERC20Call(zeroExDeployed, zrxToken, usdcToken, USER_ADDRESS, transformerNonce);
        IMetaTransactionsFeatureV2.MetaTransactionDataV2 memory mtxData = _getMetaTransaction(transformCallData);

        assertEq(usdcToken.balanceOf(USER_ADDRESS), oneEth);
        vm.expectEmit(true, false, false, true);
        emit MetaTransactionExecuted(
            zeroExDeployed.features.metaTransactionsFeatureV2.getMetaTransactionV2Hash(mtxData),
            zeroExDeployed.zeroEx.transformERC20.selector, // 0x415565b0
            USER_ADDRESS,
            address(this)
        );

        IMetaTransactionsFeatureV2(address(zeroExDeployed.zeroEx)).executeMetaTransactionV2(mtxData, _mtxSignature(mtxData));
        assertEq(zrxToken.balanceOf(USER_ADDRESS), oneEth);
        assertEq(usdcToken.balanceOf(USER_ADDRESS), 0);
        assertEq(wethToken.balanceOf(address(this)), 1);
    }

    function test_rfqOrder() external {
        bytes memory callData = makeTestRfqOrder(zeroExDeployed, zrxToken, usdcToken, signerAddress, USER_ADDRESS, signerKey);
        IMetaTransactionsFeatureV2.MetaTransactionDataV2 memory mtxData = _getMetaTransaction(callData);

        assertEq(usdcToken.balanceOf(USER_ADDRESS), oneEth);
        vm.expectEmit(true, false, false, true);
        emit MetaTransactionExecuted(
            zeroExDeployed.features.metaTransactionsFeatureV2.getMetaTransactionV2Hash(mtxData),
            INativeOrdersFeature.fillRfqOrder.selector, // 0xaa77476c
            USER_ADDRESS,
            address(this)
        );

        IMetaTransactionsFeatureV2(address(zeroExDeployed.zeroEx)).executeMetaTransactionV2(mtxData, _mtxSignature(mtxData));

        assertEq(zrxToken.balanceOf(signerAddress), 0);
        assertEq(zrxToken.balanceOf(USER_ADDRESS), oneEth);
        assertEq(usdcToken.balanceOf(USER_ADDRESS), 0);
        assertEq(usdcToken.balanceOf(signerAddress), oneEth);
        assertEq(wethToken.balanceOf(address(this)), 1);
    }

    function test_fillLimitOrder() external {

        bytes memory callData = makeTestLimitOrder(zeroExDeployed, zrxToken, usdcToken, signerAddress, USER_ADDRESS, signerKey);
        IMetaTransactionsFeatureV2.MetaTransactionDataV2 memory mtxData = _getMetaTransaction(callData);

        assertEq(usdcToken.balanceOf(USER_ADDRESS), oneEth);
        vm.expectEmit(true, false, false, true);
        emit MetaTransactionExecuted(
            zeroExDeployed.features.metaTransactionsFeatureV2.getMetaTransactionV2Hash(mtxData),
            INativeOrdersFeature.fillLimitOrder.selector, // 0xf6274f66
            USER_ADDRESS,
            address(this)
        );

        IMetaTransactionsFeatureV2(address(zeroExDeployed.zeroEx)).executeMetaTransactionV2(mtxData, _mtxSignature(mtxData));

        assertEq(zrxToken.balanceOf(signerAddress), 0);
        assertEq(zrxToken.balanceOf(USER_ADDRESS), oneEth);
        assertEq(usdcToken.balanceOf(USER_ADDRESS), 0);
        assertEq(usdcToken.balanceOf(signerAddress), oneEth);
        assertEq(wethToken.balanceOf(address(this)), 1);
    }

    function test_transformERC20WithAnySender() external {
        bytes memory transformCallData = transformERC20Call(zeroExDeployed, zrxToken, usdcToken, USER_ADDRESS, transformerNonce);
        IMetaTransactionsFeatureV2.MetaTransactionDataV2 memory mtxData = _getMetaTransaction(transformCallData);
        mtxData.sender = ZERO_ADDRESS;

        assertEq(usdcToken.balanceOf(USER_ADDRESS), oneEth);

        IMetaTransactionsFeatureV2(address(zeroExDeployed.zeroEx)).executeMetaTransactionV2(mtxData, _mtxSignature(mtxData));
        assertEq(zrxToken.balanceOf(USER_ADDRESS), oneEth);
        assertEq(usdcToken.balanceOf(USER_ADDRESS), 0);
        assertEq(wethToken.balanceOf(address(this)), 1);
    }

    function test_transformERC20WithoutFee() external {
        bytes memory transformCallData = transformERC20Call(zeroExDeployed, zrxToken, usdcToken, USER_ADDRESS, transformerNonce);
        IMetaTransactionsFeatureV2.MetaTransactionFeeData[] memory fees;
        IMetaTransactionsFeatureV2.MetaTransactionDataV2 memory mtxData = _getMetaTransactionWithFees(transformCallData, fees);

        assertEq(usdcToken.balanceOf(USER_ADDRESS), oneEth);

        IMetaTransactionsFeatureV2(address(zeroExDeployed.zeroEx)).executeMetaTransactionV2(mtxData, _mtxSignature(mtxData));
        assertEq(zrxToken.balanceOf(USER_ADDRESS), oneEth);
        assertEq(usdcToken.balanceOf(USER_ADDRESS), 0);
        assertEq(wethToken.balanceOf(address(this)), 0); // no fee paid out
    }

    function test_transformERC20MultipleFees() external {
        bytes memory transformCallData = transformERC20Call(zeroExDeployed, zrxToken, usdcToken, USER_ADDRESS, transformerNonce);
        IMetaTransactionsFeatureV2.MetaTransactionFeeData[] memory fees = new IMetaTransactionsFeatureV2.MetaTransactionFeeData[](2);
        fees[0] = IMetaTransactionsFeatureV2.MetaTransactionFeeData({
            recipient: address(this),
            amount: 10
        });
        fees[1] = IMetaTransactionsFeatureV2.MetaTransactionFeeData({
            recipient: signerAddress,
            amount: 20
        });
        IMetaTransactionsFeatureV2.MetaTransactionDataV2 memory mtxData = _getMetaTransactionWithFees(transformCallData, fees);

        assertEq(usdcToken.balanceOf(USER_ADDRESS), oneEth);

        IMetaTransactionsFeatureV2(address(zeroExDeployed.zeroEx)).executeMetaTransactionV2(mtxData, _mtxSignature(mtxData));
        assertEq(zrxToken.balanceOf(USER_ADDRESS), oneEth);
        assertEq(usdcToken.balanceOf(USER_ADDRESS), 0);
        assertEq(wethToken.balanceOf(address(this)), 10);
        assertEq(wethToken.balanceOf(address(signerAddress)), 20);
    }

    function test_transformERC20TranslatedCallFail() external {
        bytes memory transformCallData = _badTokenTransformERC20Call();

        IMetaTransactionsFeatureV2.MetaTransactionDataV2 memory mtxData = _getMetaTransaction(transformCallData);
        LibSignature.Signature memory sig = _mtxSignature(mtxData);
        vm.expectRevert();
        IMetaTransactionsFeatureV2(address(zeroExDeployed.zeroEx)).executeMetaTransactionV2(mtxData, sig);
    }

     function test_transformERC20UnsupportedFunction() external {
        bytes memory transformCallData = _badSelectorTransformERC20Call();

        IMetaTransactionsFeatureV2.MetaTransactionDataV2 memory mtxData = _getMetaTransaction(transformCallData);
        LibSignature.Signature memory sig = _mtxSignature(mtxData);
        vm.expectRevert();
        IMetaTransactionsFeatureV2(address(zeroExDeployed.zeroEx)).executeMetaTransactionV2(mtxData, sig);
     }

     function test_transformERC20CantExecuteTwice() external {
        bytes memory callData = makeTestRfqOrder(zeroExDeployed, zrxToken, usdcToken, signerAddress, USER_ADDRESS, signerKey);

        IMetaTransactionsFeatureV2.MetaTransactionDataV2 memory mtxData = _getMetaTransaction(callData);
        LibSignature.Signature memory sig = _mtxSignature(mtxData);
        IMetaTransactionsFeatureV2(address(zeroExDeployed.zeroEx)).executeMetaTransactionV2(mtxData, sig);
        vm.expectRevert();
        IMetaTransactionsFeatureV2(address(zeroExDeployed.zeroEx)).executeMetaTransactionV2(mtxData, sig);
     }

    function test_metaTxnFailsIfExpired() external {
        bytes memory callData = makeTestRfqOrder(zeroExDeployed, zrxToken, usdcToken, signerAddress, USER_ADDRESS, signerKey);


        IMetaTransactionsFeatureV2.MetaTransactionDataV2 memory mtxData = _getMetaTransaction(callData);
        mtxData.expirationTimeSeconds = block.timestamp - 1;

        LibSignature.Signature memory sig = _mtxSignature(mtxData);
        vm.expectRevert();
        IMetaTransactionsFeatureV2(address(zeroExDeployed.zeroEx)).executeMetaTransactionV2(mtxData, sig);
    }

    function test_metaTxnFailsIfWrongSender() external {
        bytes memory transformCallData = transformERC20Call(zeroExDeployed, zrxToken, usdcToken, USER_ADDRESS, transformerNonce);

        IMetaTransactionsFeatureV2.MetaTransactionDataV2 memory mtxData = _getMetaTransaction(transformCallData);
        mtxData.sender = USER_ADDRESS;

        LibSignature.Signature memory sig = _mtxSignature(mtxData);
        vm.expectRevert();
        IMetaTransactionsFeatureV2(address(zeroExDeployed.zeroEx)).executeMetaTransactionV2(mtxData, sig);
    }

    function test_metaTxnFailsWrongSignature() external {
        bytes memory transformCallData = transformERC20Call(zeroExDeployed, zrxToken, usdcToken, USER_ADDRESS, transformerNonce);

        IMetaTransactionsFeatureV2.MetaTransactionDataV2 memory mtxData = _getMetaTransaction(transformCallData);

        LibSignature.Signature memory sig = _mtxSignatureWithSignerKey(mtxData, signerKey);
        vm.expectRevert();
        IMetaTransactionsFeatureV2(address(zeroExDeployed.zeroEx)).executeMetaTransactionV2(mtxData, sig);
    }
}
