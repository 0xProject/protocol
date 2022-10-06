// SPDX-License-Identifier: Apache-2.0
/*

  Copyright 2020 ZeroEx Intl.

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

import "@0x/contracts-utils/contracts/src/v06/LibBytesV06.sol";
import "@0x/contracts-utils/contracts/src/v06/LibMathV06.sol";
import "@0x/contracts-utils/contracts/src/v06/LibSafeMathV06.sol";
import "./tokens/TestMintableERC20Token.sol";
import "../src/features/libs/LibNativeOrder.sol";
import "../src/features/libs/LibSignature.sol";

contract TestFillQuoteTransformerExchange {
    bytes32 public constant EIP712_EXCHANGE_DOMAIN_HASH =
        0xaa81d881b1adbbf115e15b849cb9cdc643cad3c6a90f30eb505954af943247e6;
    uint256 private constant REVERT_AMOUNT = 0xdeadbeef;
    uint256 private constant PROTOCOL_FEE_MULTIPLIER = 1337;

    using LibSafeMathV06 for uint256;

    function fillLimitOrder(
        LibNativeOrder.LimitOrder calldata order,
        LibSignature.Signature calldata signature,
        uint128 takerTokenFillAmount
    ) external payable returns (uint128 takerTokenFilledAmount, uint128 makerTokenFilledAmount) {
        // The r field of the signature is the pre-filled amount.
        uint128 takerTokenPreFilledAmount = uint128(uint256(signature.r));
        if (REVERT_AMOUNT == takerTokenPreFilledAmount) {
            revert("REVERT_AMOUNT");
        }
        if (takerTokenPreFilledAmount >= order.takerAmount) {
            revert("FILLED");
        }
        uint256 protocolFee = PROTOCOL_FEE_MULTIPLIER * tx.gasprice;
        // Return excess protocol fee.
        msg.sender.transfer(msg.value - protocolFee);
        takerTokenFilledAmount = LibSafeMathV06.min128(
            order.takerAmount - takerTokenPreFilledAmount,
            takerTokenFillAmount
        );

        // Take taker tokens.
        order.takerToken.transferFrom(msg.sender, order.maker, takerTokenFilledAmount);

        // Mint maker tokens.
        makerTokenFilledAmount = LibSafeMathV06.safeDowncastToUint128(
            (uint256(takerTokenFilledAmount) * uint256(order.makerAmount)) / uint256(order.takerAmount)
        );
        TestMintableERC20Token(address(order.makerToken)).mint(msg.sender, makerTokenFilledAmount);

        // Take taker token fee.
        uint128 takerFee = LibSafeMathV06.safeDowncastToUint128(
            (uint256(takerTokenFilledAmount) * uint256(order.takerTokenFeeAmount)) / uint256(order.takerAmount)
        );
        order.takerToken.transferFrom(msg.sender, order.feeRecipient, takerFee);
    }

    function fillRfqOrder(
        LibNativeOrder.RfqOrder calldata order,
        LibSignature.Signature calldata signature,
        uint128 takerTokenFillAmount
    ) external payable returns (uint128 takerTokenFilledAmount, uint128 makerTokenFilledAmount) {
        // The r field of the signature is the pre-filled amount.
        uint128 takerTokenPreFilledAmount = uint128(uint256(signature.r));
        if (REVERT_AMOUNT == takerTokenPreFilledAmount) {
            revert("REVERT_AMOUNT");
        }
        if (takerTokenPreFilledAmount >= order.takerAmount) {
            revert("FILLED");
        }
        takerTokenFilledAmount = LibSafeMathV06.min128(
            order.takerAmount - takerTokenPreFilledAmount,
            takerTokenFillAmount
        );

        // Take taker tokens.
        order.takerToken.transferFrom(msg.sender, order.maker, takerTokenFilledAmount);

        // Mint maker tokens.
        makerTokenFilledAmount = LibSafeMathV06.safeDowncastToUint128(
            (uint256(takerTokenFilledAmount) * uint256(order.makerAmount)) / uint256(order.takerAmount)
        );
        TestMintableERC20Token(address(order.makerToken)).mint(msg.sender, makerTokenFilledAmount);
    }

    function getProtocolFeeMultiplier() external pure returns (uint256) {
        return PROTOCOL_FEE_MULTIPLIER;
    }

    function getLimitOrderHash(LibNativeOrder.LimitOrder calldata order) external pure returns (bytes32) {
        return bytes32(order.salt);
    }
}
