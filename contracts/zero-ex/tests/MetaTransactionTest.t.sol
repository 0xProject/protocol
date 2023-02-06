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
import "../contracts/src/features/MetaTransactionsFeature.sol";
import "../contracts/src/features/interfaces/IMetaTransactionsFeature.sol";
import "../contracts/test/TestMintTokenERC20Transformer.sol";
import "../contracts/src/features/libs/LibSignature.sol";
import "src/features/libs/LibNativeOrder.sol";
import "../contracts/test/tokens/TestMintableERC20Token.sol";
import "@0x/contracts-erc20/contracts/src/v06/IEtherTokenV06.sol";

contract MetaTransactionTest is BaseTest {
    DeployZeroEx.ZeroExDeployed zeroExDeployed;
    address private constant ZERO_ADDRESS = 0x0000000000000000000000000000000000000000;
    address private constant USER_ADDRESS = 0x6dc3a54FeAE57B65d185A7B159c5d3FA7fD7FD0F;
    uint256 private constant USER_KEY = 0x1fc1630343b31e60b7a197a53149ca571ed9d9791e2833337bbd8110c30710ec;
    IEtherTokenV06 private wethToken;
    IERC20TokenV06 private usdcToken;
    IERC20TokenV06 private zrxToken;
    uint256 private constant oneEth = 1e18;
    address private signerAddress;
    uint256 private signerKey;
    uint256 private transformerNonce;


    function setUp() public {
        (signerAddress, signerKey) = getSigner();
        zeroExDeployed = new DeployZeroEx().deployZeroEx();
        wethToken = zeroExDeployed.weth;
        usdcToken = IERC20TokenV06(address(new TestMintableERC20Token()));
        zrxToken = IERC20TokenV06(address(new TestMintableERC20Token()));

        transformerNonce = zeroExDeployed.transformerDeployer.nonce();
        vm.prank(zeroExDeployed.transformerDeployer.authorities(0));
        zeroExDeployed.transformerDeployer.deploy(type(TestMintTokenERC20Transformer).creationCode);

        vm.deal(address(this), 10e18);
        vm.deal(USER_ADDRESS, 10e18);
        vm.deal(signerAddress, 10e18);
    }

    function _getSigner() private returns (address, uint) {

        string memory mnemonic = "test test test test test test test test test test test junk";
        uint256 privateKey = vm.deriveKey(mnemonic, 0);
        vm.label(vm.addr(privateKey), "zeroEx/MarketMaker");
        return (vm.addr(privateKey), privateKey);
    }

    function _makeTestRfqOrder() private returns (bytes memory callData) {

        LibNativeOrder.RfqOrder memory order = LibNativeOrder.RfqOrder({
            makerToken: wethToken,
            takerToken: usdcToken,
            makerAmount: 1e18,
            takerAmount: 1e18,
            maker: signerAddress,
            taker: ZERO_ADDRESS,
            txOrigin: tx.origin,
            pool: 0x0000000000000000000000000000000000000000000000000000000000000000,
            expiry: uint64(block.timestamp + 60),
            salt: 123
        });
        mintTo(address(order.makerToken), order.maker, order.makerAmount);
        vm.prank(order.maker);
        order.makerToken.approve(address(zeroExDeployed.zeroEx), order.makerAmount);
        mintTo(address(order.takerToken), USER_ADDRESS, order.takerAmount);
        vm.prank(USER_ADDRESS);
        order.takerToken.approve(address(zeroExDeployed.zeroEx), order.takerAmount);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, zeroExDeployed.features.nativeOrdersFeature.getRfqOrderHash(order));
        LibSignature.Signature memory sig = LibSignature.Signature(LibSignature.SignatureType.EIP712, v, r, s);


        return abi.encodeWithSelector(
            INativeOrdersFeature.fillRfqOrder.selector, // ??
            order,  // RFQOrder
            sig,    // Order Signature
            1e18   // Fill Amount
        );
    }

    function _makeTestLimitOrder() private returns (bytes memory callData) {

        LibNativeOrder.LimitOrder memory order = LibNativeOrder.LimitOrder({
            makerToken: wethToken,
            takerToken: usdcToken,
            makerAmount: 1e18,
            takerAmount: 1e18,
            maker: signerAddress,
            taker: ZERO_ADDRESS,
            sender: ZERO_ADDRESS,
            takerTokenFeeAmount: 0,
            feeRecipient: address(this),
            pool: 0x0000000000000000000000000000000000000000000000000000000000000000,
            expiry: uint64(block.timestamp + 60),
            salt: 123
        });
        mintTo(address(order.makerToken), order.maker, order.makerAmount);
        vm.prank(order.maker);
        order.makerToken.approve(address(zeroExDeployed.zeroEx), order.makerAmount);
        mintTo(address(order.takerToken), USER_ADDRESS, order.takerAmount);
        vm.prank(USER_ADDRESS);
        order.takerToken.approve(address(zeroExDeployed.zeroEx), order.takerAmount);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, zeroExDeployed.features.nativeOrdersFeature.getLimitOrderHash(order));
        LibSignature.Signature memory sig = LibSignature.Signature(LibSignature.SignatureType.EIP712, v, r, s);


        return abi.encodeWithSelector(
            INativeOrdersFeature.fillLimitOrder.selector, // ??
            order,  // LimitOrder
            sig,    // Order Signature
            1e18   // Fill Amount
        );
    }

    function _mintTo(address token, address recipient, uint256 amount) private {

        if (token == address(wethToken)) {
            //vm.prank(recipient);
            IEtherTokenV06(token).deposit{value: amount}();
            WETH9V06(payable(token)).transfer(recipient, amount);
        } else {
            TestMintableERC20Token(token).mint(recipient, amount);
        }
    }

    function _getMetaTransaction(bytes memory callData) private view returns (IMetaTransactionsFeature.MetaTransactionData memory) {   

        IMetaTransactionsFeature.MetaTransactionData memory mtx = IMetaTransactionsFeature.MetaTransactionData({
            signer: payable(USER_ADDRESS),
            sender: address(this),
            minGasPrice: 0,
            maxGasPrice: 100000000000,
            expirationTimeSeconds: block.timestamp + 60,
            salt: 123,
            callData: callData,
            value: 0,
            feeToken: wethToken,
            feeAmount: 1
        });
        return mtx;
    }

    function _transformERC20Call() private returns (bytes memory) {

        ITransformERC20Feature.Transformation[] memory transformations = new ITransformERC20Feature.Transformation[](1);
        transformations[0] = ITransformERC20Feature.Transformation(
            uint32(transformerNonce),
            abi.encode(address(usdcToken), address(zrxToken), 0, oneEth, 0)
        );

        mintTo(address(usdcToken), USER_ADDRESS, oneEth);
        vm.prank(USER_ADDRESS);
        usdcToken.approve(address(zeroExDeployed.zeroEx), oneEth);

        return abi.encodeWithSelector(
            zeroExDeployed.zeroEx.transformERC20.selector, // 0x415565b0
            usdcToken,
            zrxToken,
            oneEth,
            oneEth,
            transformations
        );
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

        mintTo(address(usdcToken), USER_ADDRESS, oneEth);
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

    function _mtxCall(IMetaTransactionsFeature.MetaTransactionData memory mtx) private returns (bytes memory) {

        // Mint fee to signer and approve
        if (mtx.feeAmount > 0) {
            mintTo(address(mtx.feeToken), mtx.signer, mtx.feeAmount);
            vm.prank(mtx.signer);
            mtx.feeToken.approve(address(zeroExDeployed.zeroEx), oneEth);
        }

        bytes32 mtxHash = zeroExDeployed.features.metaTransactionsFeature.getMetaTransactionHash(mtx);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(USER_KEY, mtxHash);
        LibSignature.Signature memory sig = LibSignature.Signature(LibSignature.SignatureType.EIP712, v, r, s);

        return abi.encodeWithSelector(
            zeroExDeployed.zeroEx.executeMetaTransaction.selector, // 0x3d61ed3e
            mtx,
            sig
        );
    }

    function test_createHash() external {

        bytes memory transformCallData = transformERC20Call();
        IMetaTransactionsFeature.MetaTransactionData memory mtxData = getRandomMetaTransaction(transformCallData);

        //mtxData.signer = address(0);
        bytes32 mtxHash = zeroExDeployed.features.metaTransactionsFeature.getMetaTransactionHash(mtxData);
        assertTrue(mtxHash != bytes32(0));
    }

    function test_transformERC20() external {

        bytes memory transformCallData = transformERC20Call();
        IMetaTransactionsFeature.MetaTransactionData memory mtxData = getRandomMetaTransaction(transformCallData);

        bytes memory theCallData = mtxCall(mtxData);

        assertEq(usdcToken.balanceOf(USER_ADDRESS), oneEth);

        (bool success, ) = address(zeroExDeployed.zeroEx).call{ value: 0}(theCallData);
        assertTrue(success);
        assertEq(zrxToken.balanceOf(USER_ADDRESS), oneEth);
        assertEq(usdcToken.balanceOf(USER_ADDRESS), 0);
        assertEq(wethToken.balanceOf(address(this)), 1);
    }

    function test_rfqOrder() external {

        bytes memory callData = makeTestRfqOrder();
        IMetaTransactionsFeature.MetaTransactionData memory mtxData = getRandomMetaTransaction(callData);

        bytes memory rfqCallData = mtxCall(mtxData);

        (bool success, ) = address(zeroExDeployed.zeroEx).call{ value: 0 }(rfqCallData);
        
        assertTrue(success);
        assertEq(wethToken.balanceOf(signerAddress), 0);
        assertEq(wethToken.balanceOf(USER_ADDRESS), 1e18);
        assertEq(usdcToken.balanceOf(USER_ADDRESS), 0);
        assertEq(usdcToken.balanceOf(signerAddress), 1e18);
        assertEq(wethToken.balanceOf(address(this)), 1);

        // TODO: check event log for TestMetaTransactionsNativeOrdersFeatureEvents.FillLimitOrderCalled?
    }

    function test_fillLimitOrder() external {

        bytes memory callData = makeTestLimitOrder();
        IMetaTransactionsFeature.MetaTransactionData memory mtxData = getRandomMetaTransaction(callData);

        bytes memory limitCallData = mtxCall(mtxData);

        (bool success, ) = address(zeroExDeployed.zeroEx).call{ value: 0 }(limitCallData);
        
        assertTrue(success);
        assertEq(wethToken.balanceOf(signerAddress), 0);
        assertEq(wethToken.balanceOf(USER_ADDRESS), 1e18);
        assertEq(usdcToken.balanceOf(USER_ADDRESS), 0);
        assertEq(usdcToken.balanceOf(signerAddress), 1e18);
    }

    function test_transformERC20WithAnySender() external {

        bytes memory transformCallData = transformERC20Call();

        IMetaTransactionsFeature.MetaTransactionData memory mtxData = getRandomMetaTransaction(transformCallData);
        mtxData.sender = ZERO_ADDRESS;

        bytes memory theCallData = mtxCall(mtxData);

        assertEq(usdcToken.balanceOf(USER_ADDRESS), oneEth);

        (bool success, ) = address(zeroExDeployed.zeroEx).call{ value: 0}(theCallData);
        assertTrue(success);
        assertEq(zrxToken.balanceOf(USER_ADDRESS), oneEth);
        assertEq(usdcToken.balanceOf(USER_ADDRESS), 0);
        assertEq(wethToken.balanceOf(address(this)), 1);
    }

    function test_transformERC20WithoutFee() external {

        bytes memory transformCallData = transformERC20Call();

        IMetaTransactionsFeature.MetaTransactionData memory mtxData = getRandomMetaTransaction(transformCallData);
        mtxData.feeAmount = 0;

        bytes memory theCallData = mtxCall(mtxData);

        assertEq(usdcToken.balanceOf(USER_ADDRESS), oneEth);

        (bool success, ) = address(zeroExDeployed.zeroEx).call{ value: 0}(theCallData);
        assertTrue(success);
        assertEq(zrxToken.balanceOf(USER_ADDRESS), oneEth);
        assertEq(usdcToken.balanceOf(USER_ADDRESS), 0);
        assertEq(wethToken.balanceOf(address(this)), 0); // no fee paid out
    }

    function test_transformERC20TranslatedCallFail() public {
        bytes memory transformCallData = badTokenTransformERC20Call();

        IMetaTransactionsFeature.MetaTransactionData memory mtxData = getRandomMetaTransaction(transformCallData);

        bytes memory theCallData = mtxCall(mtxData);

        (bool success, ) = address(zeroExDeployed.zeroEx).call{ value: 0}(theCallData);
        assertFalse(success);
    }

    function test_transformERC20UnsupportedFunction() public {
        bytes memory transformCallData = badSelectorTransformERC20Call();

        IMetaTransactionsFeature.MetaTransactionData memory mtxData = getRandomMetaTransaction(transformCallData);

        bytes memory theCallData = mtxCall(mtxData);

        (bool success, ) = address(zeroExDeployed.zeroEx).call{ value: 0}(theCallData);
        assertFalse(success);
    }

    function test_transformERC20CantExecuteTwice() external {

        bytes memory callData = makeTestRfqOrder();

        IMetaTransactionsFeature.MetaTransactionData memory mtxData = getRandomMetaTransaction(callData);

        bytes memory theCallData1 = mtxCall(mtxData);

        (bool success, ) = address(zeroExDeployed.zeroEx).call{ value: 0}(theCallData1);
        assertTrue(success);

        bytes memory theCallData2 = mtxCall(mtxData);

        (success, ) = address(zeroExDeployed.zeroEx).call{ value: 0}(theCallData2);
        assertFalse(success);
    }

    function test_metaTxnFailsNotEnoughEth() external {

        bytes memory callData = makeTestRfqOrder();

        IMetaTransactionsFeature.MetaTransactionData memory mtxData = getRandomMetaTransaction(callData);
        mtxData.value = 1;

        bytes memory theCallData = mtxCall(mtxData);

        (bool success, ) = address(zeroExDeployed.zeroEx).call{ value: 0}(theCallData);
        assertFalse(success);
    }
/*******
 *  Unclear whether we need to port these, as MetaTransactionDataV2 might deprecate these fields
 *******
    function test_metaTxnFailsGasPriceTooLow() public {
        
    }

    function test_metaTxnFailsGasPriceTooHigh() public {
        
    }
*******/

    function test_metaTxnFailsIfExpired() external {

        bytes memory callData = makeTestRfqOrder();

        IMetaTransactionsFeature.MetaTransactionData memory mtxData = getRandomMetaTransaction(callData);
        mtxData.expirationTimeSeconds = block.timestamp - 1;

        bytes memory theCallData = mtxCall(mtxData);

        (bool success, ) = address(zeroExDeployed.zeroEx).call{ value: 0}(theCallData);
        assertFalse(success);
    }

    function test_metaTxnFailsIfWrongSender() external {

        bytes memory transformCallData = transformERC20Call();
        IMetaTransactionsFeature.MetaTransactionData memory mtxData = getRandomMetaTransaction(transformCallData);
        mtxData.sender = USER_ADDRESS;

        bytes memory theCallData = mtxCall(mtxData);

        assertEq(usdcToken.balanceOf(USER_ADDRESS), oneEth);

        (bool success, ) = address(zeroExDeployed.zeroEx).call{ value: 0}(theCallData);
        assertFalse(success);
    }

    function test_metaTxnFailsWrongSignature() public {
        
    }
/*********** 
 * These functions require TestMetaTransactionsTransformERC20Feature.sol
 ***********

    function test_metaTxnCantReenterExecuteMetaTransaction() public {
        
    }

    function test_metaTxnCantReenterBatchExecuteMetaTransaction() public {
        
    }

    function test_metaTxnCantReduceInitialEthBalance() public {
        
    }
*********/
}