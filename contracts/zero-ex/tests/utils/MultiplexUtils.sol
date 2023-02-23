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

import {IERC20Token} from "@0x/contracts-erc20/src/IERC20Token.sol";
import {LibNativeOrder} from "src/features/libs/LibNativeOrder.sol";
import {LibSignature} from "src/features/libs/LibSignature.sol";
import {IMultiplexFeature} from "src/features/interfaces/IMultiplexFeature.sol";
import {ITransformERC20Feature} from "src/features/interfaces/ITransformERC20Feature.sol";
import {LocalTest} from "utils/LocalTest.sol";

contract MultiplexUtils is LocalTest {
    function _makeTestRfqOrder(
        IERC20Token makerToken,
        IERC20Token takerToken
    ) internal returns (LibNativeOrder.RfqOrder memory order) {
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
        _mintTo(address(order.makerToken), order.maker, order.makerAmount);
    }

    function _makeTestRfqOrder() internal returns (LibNativeOrder.RfqOrder memory order) {
        return _makeTestRfqOrder(zrx, dai);
    }

    function _makeTestOtcOrder() internal returns (LibNativeOrder.OtcOrder memory order) {
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
        _mintTo(address(order.makerToken), order.maker, order.makerAmount);
    }

    function _makeRfqSubcall(
        LibNativeOrder.RfqOrder memory order,
        uint256 sellAmount
    ) internal view returns (IMultiplexFeature.BatchSellSubcall memory) {
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

    function _makeRfqSubcall(
        LibNativeOrder.RfqOrder memory order
    ) internal view returns (IMultiplexFeature.BatchSellSubcall memory) {
        return _makeRfqSubcall(order, order.takerAmount);
    }

    function _makeOtcSubcall(
        LibNativeOrder.OtcOrder memory order
    ) internal view returns (IMultiplexFeature.BatchSellSubcall memory) {
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

    function _makeUniswapV2MultiHopSubcall(
        address[] memory tokens,
        bool isSushi
    ) internal pure returns (IMultiplexFeature.MultiHopSellSubcall memory) {
        return
            IMultiplexFeature.MultiHopSellSubcall({
                id: IMultiplexFeature.MultiplexSubcall.UniswapV2,
                data: abi.encode(tokens, isSushi)
            });
    }

    function _makeUniswapV2BatchSubcall(
        address[] memory tokens,
        uint256 sellAmount,
        bool isSushi
    ) internal pure returns (IMultiplexFeature.BatchSellSubcall memory) {
        return
            IMultiplexFeature.BatchSellSubcall({
                id: IMultiplexFeature.MultiplexSubcall.UniswapV2,
                sellAmount: sellAmount,
                data: abi.encode(tokens, isSushi)
            });
    }

    function _encodePathUniswapV3(address[] memory tokens) private pure returns (bytes memory path) {
        path = new bytes(tokens.length * 23 - 3);
        for (uint256 i = 0; i < tokens.length; i++) {
            assembly {
                let p := add(add(path, 32), mul(i, 23))
                if gt(i, 0) {
                    mstore(sub(p, 3), shl(232, UNIV3_POOL_FEE))
                }

                let a := add(add(tokens, 32), mul(i, 32))
                mstore(p, shl(96, mload(a)))
            }
        }
    }

    function _makeUniswapV3MultiHopSubcall(
        address[] memory tokens
    ) internal pure returns (IMultiplexFeature.MultiHopSellSubcall memory) {
        return
            IMultiplexFeature.MultiHopSellSubcall({
                id: IMultiplexFeature.MultiplexSubcall.UniswapV3,
                data: _encodePathUniswapV3(tokens)
            });
    }

    function _makeUniswapV3BatchSubcall(
        address[] memory tokens,
        uint256 sellAmount
    ) internal pure returns (IMultiplexFeature.BatchSellSubcall memory) {
        return
            IMultiplexFeature.BatchSellSubcall({
                id: IMultiplexFeature.MultiplexSubcall.UniswapV3,
                sellAmount: sellAmount,
                data: _encodePathUniswapV3(tokens)
            });
    }

    function _makeMockLiquidityProviderMultiHopSubcall()
        internal
        view
        returns (IMultiplexFeature.MultiHopSellSubcall memory)
    {
        return
            IMultiplexFeature.MultiHopSellSubcall({
                id: IMultiplexFeature.MultiplexSubcall.LiquidityProvider,
                data: abi.encode(address(liquidityProvider), hex"")
            });
    }

    function _makeMockLiquidityProviderBatchSubcall(
        uint256 sellAmount
    ) internal view returns (IMultiplexFeature.BatchSellSubcall memory) {
        return
            IMultiplexFeature.BatchSellSubcall({
                id: IMultiplexFeature.MultiplexSubcall.LiquidityProvider,
                sellAmount: sellAmount,
                data: abi.encode(address(liquidityProvider), hex"")
            });
    }

    function _makeMockTransformERC20Subcall(
        IERC20Token inputToken,
        IERC20Token outputToken,
        uint256 sellAmount,
        uint256 mintAmount
    ) internal view returns (IMultiplexFeature.BatchSellSubcall memory) {
        ITransformERC20Feature.Transformation[] memory transformations = new ITransformERC20Feature.Transformation[](1);
        transformations[0] = ITransformERC20Feature.Transformation(
            uint32(transformerNonce),
            abi.encode(address(inputToken), address(outputToken), sellAmount, mintAmount, 0)
        );

        return
            IMultiplexFeature.BatchSellSubcall({
                id: IMultiplexFeature.MultiplexSubcall.TransformERC20,
                sellAmount: sellAmount,
                data: abi.encode(transformations)
            });
    }

    function _makeNestedBatchSellSubcall(
        IMultiplexFeature.BatchSellSubcall[] memory calls
    ) internal pure returns (IMultiplexFeature.MultiHopSellSubcall memory) {
        return
            IMultiplexFeature.MultiHopSellSubcall({
                id: IMultiplexFeature.MultiplexSubcall.BatchSell,
                data: abi.encode(calls)
            });
    }

    function _makeNestedMultiHopSellSubcall(
        address[] memory tokens,
        IMultiplexFeature.MultiHopSellSubcall[] memory calls,
        uint256 sellAmount
    ) internal pure returns (IMultiplexFeature.BatchSellSubcall memory) {
        return
            IMultiplexFeature.BatchSellSubcall({
                id: IMultiplexFeature.MultiplexSubcall.MultiHopSell,
                sellAmount: sellAmount,
                data: abi.encode(tokens, calls)
            });
    }

    function _makeArray(
        IMultiplexFeature.MultiHopSellSubcall memory first
    ) internal pure returns (IMultiplexFeature.MultiHopSellSubcall[] memory subcalls) {
        subcalls = new IMultiplexFeature.MultiHopSellSubcall[](1);
        subcalls[0] = first;
    }

    function _makeArray(
        IMultiplexFeature.MultiHopSellSubcall memory first,
        IMultiplexFeature.MultiHopSellSubcall memory second
    ) internal pure returns (IMultiplexFeature.MultiHopSellSubcall[] memory subcalls) {
        subcalls = new IMultiplexFeature.MultiHopSellSubcall[](2);
        subcalls[0] = first;
        subcalls[1] = second;
    }

    function _makeArray(
        IMultiplexFeature.BatchSellSubcall memory first
    ) internal pure returns (IMultiplexFeature.BatchSellSubcall[] memory subcalls) {
        subcalls = new IMultiplexFeature.BatchSellSubcall[](1);
        subcalls[0] = first;
    }

    function _makeArray(
        IMultiplexFeature.BatchSellSubcall memory first,
        IMultiplexFeature.BatchSellSubcall memory second
    ) internal pure returns (IMultiplexFeature.BatchSellSubcall[] memory subcalls) {
        subcalls = new IMultiplexFeature.BatchSellSubcall[](2);
        subcalls[0] = first;
        subcalls[1] = second;
    }

    function _makeArray(
        IMultiplexFeature.BatchSellSubcall memory first,
        IMultiplexFeature.BatchSellSubcall memory second,
        IMultiplexFeature.BatchSellSubcall memory third
    ) internal pure returns (IMultiplexFeature.BatchSellSubcall[] memory subcalls) {
        subcalls = new IMultiplexFeature.BatchSellSubcall[](3);
        subcalls[0] = first;
        subcalls[1] = second;
        subcalls[2] = third;
    }

    function _makeArray(address first) internal pure returns (address[] memory addresses) {
        addresses = new address[](1);
        addresses[0] = first;
    }

    function _makeArray(address first, address second) internal pure returns (address[] memory addresses) {
        addresses = new address[](2);
        addresses[0] = first;
        addresses[1] = second;
    }

    function _makeArray(
        address first,
        address second,
        address third
    ) internal pure returns (address[] memory addresses) {
        addresses = new address[](3);
        addresses[0] = first;
        addresses[1] = second;
        addresses[2] = third;
    }

    function _encodeFractionalFillAmount(uint256 frac) internal pure returns (uint256) {
        return (2 ** 255) + (frac * 1e16);
    }
}
