// SPDX-License-Identifier: Apache-2.0
/*

  Copyright 2019 ZeroEx Intl.

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

import "../src/NativeOrderSampler.sol";
import "../src/UtilitySampler.sol";

contract TestNativeOrderSamplerToken {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function setBalanceAndAllowance(address owner, address spender, uint256 balance, uint256 allowance_) external {
        balanceOf[owner] = balance;
        allowance[owner][spender] = allowance_;
    }
}

contract TestNativeOrderSampler is NativeOrderSampler, UtilitySampler {
    uint8 private constant MAX_ORDER_STATUS = uint8(IExchange.OrderStatus.CANCELLED) + 1;
    bytes32 private constant VALID_SIGNATURE_HASH = bytes32(hex"01");

    function createTokens(uint256 count) external returns (TestNativeOrderSamplerToken[] memory tokens) {
        tokens = new TestNativeOrderSamplerToken[](count);
        for (uint256 i = 0; i < count; ++i) {
            tokens[i] = new TestNativeOrderSamplerToken();
        }
    }

    function setTokenBalanceAndAllowance(
        TestNativeOrderSamplerToken token,
        address owner,
        address spender,
        uint256 balance,
        uint256 allowance
    ) external {
        token.setBalanceAndAllowance(owner, spender, balance, allowance);
    }

    // IExchange.getLimitOrderRelevantState()
    function getLimitOrderRelevantState(
        IExchange.LimitOrder memory order,
        IExchange.Signature calldata signature
    )
        external
        view
        returns (IExchange.OrderInfo memory orderInfo, uint128 actualFillableTakerTokenAmount, bool isSignatureValid)
    {
        // The order salt determines everything.
        orderInfo.orderHash = keccak256(abi.encode(order.salt));
        if (uint8(order.salt) == 0xFF) {
            orderInfo.status = IExchange.OrderStatus.FILLED;
        } else {
            orderInfo.status = IExchange.OrderStatus.FILLABLE;
        }

        isSignatureValid = signature.r == VALID_SIGNATURE_HASH;

        // The expiration time is the filled taker asset amount.
        orderInfo.takerTokenFilledAmount = uint128(order.expiry);

        // Calculate how much is fillable in maker terms given the filled taker amount
        uint256 fillableMakerTokenAmount = LibMathV06.getPartialAmountFloor(
            uint256(order.takerAmount - orderInfo.takerTokenFilledAmount),
            uint256(order.takerAmount),
            uint256(order.makerAmount)
        );

        // Take the min of the balance/allowance and the fillable maker amount
        fillableMakerTokenAmount = LibSafeMathV06.min256(
            fillableMakerTokenAmount,
            _getSpendableERC20BalanceOf(order.makerToken, order.maker)
        );

        // Convert to taker terms
        actualFillableTakerTokenAmount = LibMathV06
            .getPartialAmountCeil(fillableMakerTokenAmount, uint256(order.makerAmount), uint256(order.takerAmount))
            .safeDowncastToUint128();
    }

    function _getSpendableERC20BalanceOf(IERC20TokenV06 token, address owner) internal view returns (uint256) {
        return LibSafeMathV06.min256(token.allowance(owner, address(this)), token.balanceOf(owner));
    }
}
