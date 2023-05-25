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
import "forge-std/Script.sol";
import "src/features/DCAFeature.sol";
import "src/features/interfaces/IDCAFeature.sol";
import "src/IZeroEx.sol";
import "src/ZeroEx.sol";

contract TestDeploy is Test, Script {
    ZeroEx public ZERO_EX = ZeroEx(0xDef1C0ded9bec7F1a1670819833240f027b25EfF);
    IZeroEx public IZERO_EX = IZeroEx(address(ZERO_EX));

    function setUp() public {}

    function run() public {
        uint256 signerPrivateKey = 0xA11CE;
        address signer = vm.addr(signerPrivateKey);

        IDCAFeature.DCAData memory dcaData = IDCAFeature.DCAData({
            buyToken: IERC20Token(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2),
            sellToken: IERC20Token(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48),
            sellAmount: 100,
            interval: 600,
            numFills: 12,
            startTime: block.timestamp,
            signer: payable(signer)
        });

        bytes32 dcahash = IDCAFeature(address(ZERO_EX)).getDCAHash(dcaData);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, dcahash);

        LibSignature.Signature memory signature = LibSignature.Signature({
            signatureType: LibSignature.SignatureType.EIP712,
            v: v,
            r: r,
            s: s
        });

        ITransformERC20Feature.Transformation[] memory transformations = new ITransformERC20Feature.Transformation[](0);

        bytes memory swapCalldata = abi.encodeWithSelector(
            IZERO_EX.transformERC20.selector,
            dcaData.sellToken,
            dcaData.buyToken,
            1e18,
            1e18,
            transformations
        );

        IDCAFeature(address(ZERO_EX)).fillDCATransaction(dcaData, signature, swapCalldata);
    }
}
