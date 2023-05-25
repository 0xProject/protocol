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

import "forge-std/Test.sol";
import "forge-std/StdUtils.sol";
import "./utils/LocalTest.sol";
import "../contracts/src/features/DCAFeature.sol";
import "../contracts/src/features/interfaces/IDCAFeature.sol";
import "@0x/contracts-erc20/src/IERC20Token.sol";
import "../contracts/src/fixins/FixinEIP712.sol";
import "../contracts/src/features/libs/LibSignature.sol";

contract DCAFeatureTest is LocalTest {
    function test_validateSignature() public {
        uint256 signerPrivateKey = 0xA11CE;
        address signer = vm.addr(signerPrivateKey);

        IDCAFeature.DCAData memory dcaData = IDCAFeature.DCAData({
            buyToken: IERC20Token(address(0)),
            sellToken: IERC20Token(address(0)),
            sellAmount: 100,
            interval: 100,
            numFills: 8,
            startTime: block.timestamp,
            signer: payable(signer)
        });

        bytes32 dcaHash = zeroExDeployed.features.dcaFeature.getDCAHash(dcaData);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, dcaHash);

        LibSignature.Signature memory signature = LibSignature.Signature({
            signatureType: LibSignature.SignatureType.EIP712,
            v: v,
            r: r,
            s: s
        });

        assertEq(LibSignature.getSignerOfHash(dcaHash, signature), dcaData.signer);
    }

    function test_checkNumFilled() public {
        // check that if user signed order to execute order two times, we expect
        // a revert on the third try
    }

    function test_timeWindow() public {
        // spoof the blockchain timestmap and expect a revert if we're outside
    }

    function test_dcaSwap() public {
        uint256 signerPrivateKey = 0xA11CE;
        address signer = vm.addr(signerPrivateKey);

        IDCAFeature.DCAData memory dcaData = IDCAFeature.DCAData({
            // buyToken: IERC20Token(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2),
            // sellToken: IERC20Token(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48),
            buyToken: zrx,
            sellToken: dai,
            sellAmount: 100,
            interval: 600,
            numFills: 12,
            startTime: block.timestamp,
            signer: payable(signer)
        });
        vm.warp(600); // warp the blockchain 10 minutes into the future

        bytes32 dcaHash = zeroExDeployed.features.dcaFeature.getDCAHash(dcaData);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, dcaHash);

        LibSignature.Signature memory signature = LibSignature.Signature({
            signatureType: LibSignature.SignatureType.EIP712,
            v: v,
            r: r,
            s: s
        });

        ITransformERC20Feature.Transformation[] memory transformations = new ITransformERC20Feature.Transformation[](1);
        transformations[0] = ITransformERC20Feature.Transformation(
            uint32(transformerNonce),
            abi.encode(address(dcaData.sellToken), address(dcaData.buyToken), 0, 1e18, 0)
        );
        console.log(transformerNonce);

        _mintTo(address(dcaData.sellToken), signer, 1e18);
        vm.prank(signer);
        dcaData.sellToken.approve(address(zeroExDeployed.zeroEx), 1e18);

        bytes memory swapCalldata = abi.encodeWithSelector(
            zeroExDeployed.zeroEx.transformERC20.selector,
            dcaData.sellToken,
            dcaData.buyToken,
            1e18,
            1e18,
            transformations
        );

        assertEq(dai.balanceOf(signer), 1e18);

        IDCAFeature(address(zeroExDeployed.zeroEx)).fillDCATransaction(dcaData, signature, swapCalldata);
    }
}
