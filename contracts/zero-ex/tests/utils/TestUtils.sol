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

import "forge-std/Test.sol";

import "./DeployZeroEx.sol";
import "src/transformers/LibERC20Transformer.sol";
import "src/features/libs/LibSignature.sol";
import "src/features/libs/LibNativeOrder.sol";
import "../../contracts/test/tokens/TestMintableERC20Token.sol";
import "@0x/contracts-erc20/contracts/src/v06/IEtherTokenV06.sol";

contract TestUtils is Test {
    address private constant ZERO_ADDRESS = 0x0000000000000000000000000000000000000000;

    function _findTransformerNonce(address transformer, address deployer) internal pure returns (uint32) {
        address current;
        for (uint32 i = 0; i < 1024; i++) {
            current = LibERC20Transformer.getDeployedAddress(deployer, i);
            if (current == transformer) {
                return i;
            }
        }
    }

    // gets a dummy signer
    function _getSigner() internal returns (address, uint) {
        string memory mnemonic = "test test test test test test test test test test test junk";
        uint256 privateKey = vm.deriveKey(mnemonic, 0);

        vm.label(vm.addr(privateKey), "zeroEx/MarketMaker");
        return (vm.addr(privateKey), privateKey);
    }
    function getSigner() public returns (address, uint) {
        string memory mnemonic = "test test test test test test test test test test test junk";
        uint256 privateKey = vm.deriveKey(mnemonic, 0);
        vm.label(vm.addr(privateKey), "zeroEx/MarketMaker");
        return (vm.addr(privateKey), privateKey);
    }

    function makeTestRfqOrder(
        DeployZeroEx.ZeroExDeployed memory zeroExDeployed, 
        IERC20TokenV06 makerToken, 
        IERC20TokenV06 takerToken,
        address makerAddress,
        address takerAddress,
        uint256 makerKey
    ) public returns (bytes memory callData) {
        LibNativeOrder.RfqOrder memory order = LibNativeOrder.RfqOrder({
            makerToken: makerToken,
            takerToken: takerToken,
            makerAmount: 1e18,
            takerAmount: 1e18,
            maker: makerAddress,
            taker: ZERO_ADDRESS,
            txOrigin: tx.origin,
            pool: 0x0000000000000000000000000000000000000000000000000000000000000000,
            expiry: uint64(block.timestamp + 60),
            salt: 123
        });
        mintTo(order.makerToken, order.maker, order.makerAmount);
        vm.prank(order.maker);
        order.makerToken.approve(address(zeroExDeployed.zeroEx), order.makerAmount);
        mintTo(order.takerToken, takerAddress, order.takerAmount);
        vm.prank(takerAddress);
        order.takerToken.approve(address(zeroExDeployed.zeroEx), order.takerAmount);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(makerKey, zeroExDeployed.features.nativeOrdersFeature.getRfqOrderHash(order));
        LibSignature.Signature memory sig = LibSignature.Signature(LibSignature.SignatureType.EIP712, v, r, s);


        return abi.encodeWithSelector(
            INativeOrdersFeature.fillRfqOrder.selector, // 0xaa77476c
            order,  // RFQOrder
            sig,    // Order Signature
            1e18   // Fill Amount
        );
    }

    function makeTestLimitOrder(
        DeployZeroEx.ZeroExDeployed memory zeroExDeployed, 
        IERC20TokenV06 makerToken, 
        IERC20TokenV06 takerToken,
        address makerAddress,
        address takerAddress,
        uint256 makerKey
    ) public returns (bytes memory callData) {
        LibNativeOrder.LimitOrder memory order = LibNativeOrder.LimitOrder({
            makerToken: makerToken,
            takerToken: takerToken,
            makerAmount: 1e18,
            takerAmount: 1e18,
            maker: makerAddress,
            taker: ZERO_ADDRESS,
            sender: ZERO_ADDRESS,
            takerTokenFeeAmount: 0,
            feeRecipient: ZERO_ADDRESS,
            pool: 0x0000000000000000000000000000000000000000000000000000000000000000,
            expiry: uint64(block.timestamp + 60),
            salt: 123
        });
        mintTo(order.makerToken, order.maker, order.makerAmount);
        vm.prank(order.maker);
        order.makerToken.approve(address(zeroExDeployed.zeroEx), order.makerAmount);
        mintTo(order.takerToken, takerAddress, order.takerAmount);
        vm.prank(takerAddress);
        order.takerToken.approve(address(zeroExDeployed.zeroEx), order.takerAmount);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(makerKey, zeroExDeployed.features.nativeOrdersFeature.getLimitOrderHash(order));
        LibSignature.Signature memory sig = LibSignature.Signature(LibSignature.SignatureType.EIP712, v, r, s);

        return abi.encodeWithSelector(
            INativeOrdersFeature.fillLimitOrder.selector, // 0xf6274f66
            order,  // LimitOrder
            sig,    // Order Signature
            1e18   // Fill Amount
        );
    }

    function transformERC20Call(
        DeployZeroEx.ZeroExDeployed memory zeroExDeployed, 
        IERC20TokenV06 makerToken, 
        IERC20TokenV06 takerToken,
        address takerAddress,
        uint256 transformerNonce
    ) public returns (bytes memory) {
        ITransformERC20Feature.Transformation[] memory transformations = new ITransformERC20Feature.Transformation[](1);
        transformations[0] = ITransformERC20Feature.Transformation(
            uint32(transformerNonce),
            abi.encode(address(takerToken), address(makerToken), 0, 1e18, 0)
        );

        mintTo(takerToken, takerAddress, 1e18);
        vm.prank(takerAddress);
        takerToken.approve(address(zeroExDeployed.zeroEx), 1e18);

        return abi.encodeWithSelector(
            zeroExDeployed.zeroEx.transformERC20.selector, // 0x415565b0
            takerToken,
            makerToken,
            1e18,
            1e18,
            transformations
        );
    }

    function mintTo(IERC20TokenV06 token, address recipient, uint256 amount) public {
        TestMintableERC20Token(address(token)).mint(recipient, amount);
    }

    function mintToWETH(IEtherTokenV06 wethToken, address recipient, uint256 amount) public {
        wethToken.deposit{value: amount}();
        WETH9V06(payable(address(wethToken))).transfer(recipient, amount);
    }
}
