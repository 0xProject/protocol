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

import "@0x/contracts-erc20/src/v06/WETH9V06.sol";

import "utils/BaseTest.sol";
import "../../contracts/src/transformers/AffiliateFeeTransformer.sol";
import "../../contracts/src/transformers/IERC20Transformer.sol";

contract AffiliateFeeTransformerTest is BaseTest {
    address public owner = account1;
    address public feeRecipient = account2;
    WETH9V06 weth = new WETH9V06();
    IERC20Token token1 = IERC20Token(address(weth));

    AffiliateFeeTransformer target = new AffiliateFeeTransformer();

    function setUp() public {
        vm.deal(address(this), 1e19);
        weth.deposit{value: 10}();
    }

    function test_affiliateFee() public {
        // Send positive slippage to contract which executes AffiliateFeeTransformer
        weth.transfer(address(target), 10);
        uint256 affiliateFeeAmount = 1;

        AffiliateFeeTransformer.TokenFee[] memory fees = new AffiliateFeeTransformer.TokenFee[](1);
        fees[0] = AffiliateFeeTransformer.TokenFee({
            token: IERC20Token(token1),
            amount: affiliateFeeAmount,
            recipient: payable(feeRecipient)
        });

        bytes4 result = target.transform(
            IERC20Transformer.TransformContext({
                sender: payable(address(this)),
                recipient: payable(address(this)),
                data: abi.encode(fees)
            })
        );
        assertEq(token1.balanceOf(feeRecipient), affiliateFeeAmount);
        assertEq(result, LibERC20Transformer.TRANSFORMER_SUCCESS);
    }

    function test_affiliateFee_entireBalance() public {
        // Send positive slippage to contract which executes AffiliateFeeTransformer
        weth.transfer(address(target), 10);

        AffiliateFeeTransformer.TokenFee[] memory fees = new AffiliateFeeTransformer.TokenFee[](1);
        fees[0] = AffiliateFeeTransformer.TokenFee({
            token: IERC20Token(token1),
            amount: uint256(-1),
            recipient: payable(feeRecipient)
        });

        bytes4 result = target.transform(
            IERC20Transformer.TransformContext({
                sender: payable(address(this)),
                recipient: payable(address(this)),
                data: abi.encode(fees)
            })
        );
        assertEq(token1.balanceOf(feeRecipient), 10);
        assertEq(result, LibERC20Transformer.TRANSFORMER_SUCCESS);
    }

    function test_affiliateFee_multipleFees() public {
        // Send positive slippage to contract which executes AffiliateFeeTransformer
        weth.transfer(address(target), 10);

        AffiliateFeeTransformer.TokenFee[] memory fees = new AffiliateFeeTransformer.TokenFee[](2);
        fees[0] = AffiliateFeeTransformer.TokenFee({
            token: IERC20Token(token1),
            amount: uint256(1),
            recipient: payable(feeRecipient)
        });

        fees[1] = AffiliateFeeTransformer.TokenFee({
            token: IERC20Token(token1),
            amount: uint256(1),
            recipient: payable(feeRecipient)
        });

        bytes4 result = target.transform(
            IERC20Transformer.TransformContext({
                sender: payable(address(this)),
                recipient: payable(address(this)),
                data: abi.encode(fees)
            })
        );
        assertEq(token1.balanceOf(feeRecipient), 2);
        assertEq(result, LibERC20Transformer.TRANSFORMER_SUCCESS);
    }

    function test_affiliateFee_ethFee() public {
        // Send positive slippage ETH to contract which executes AffiliateFeeTransformer
        vm.deal(address(target), 1);
        uint256 ethBalanceBefore = feeRecipient.balance;

        AffiliateFeeTransformer.TokenFee[] memory fees = new AffiliateFeeTransformer.TokenFee[](1);
        fees[0] = AffiliateFeeTransformer.TokenFee({
            token: IERC20Token(LibERC20Transformer.ETH_TOKEN_ADDRESS),
            amount: uint256(1),
            recipient: payable(feeRecipient)
        });

        bytes4 result = target.transform(
            IERC20Transformer.TransformContext({
                sender: payable(address(this)),
                recipient: payable(address(this)),
                data: abi.encode(fees)
            })
        );
        assertEq(feeRecipient.balance, ethBalanceBefore + 1);
        assertEq(result, LibERC20Transformer.TRANSFORMER_SUCCESS);
    }

    function test_affiliateFee_multipleFeesEthToken() public {
        // Send positive slippage to contract which executes AffiliateFeeTransformer
        weth.transfer(address(target), 10);
        vm.deal(address(target), 10);

        uint256 ethBalanceBefore = feeRecipient.balance;

        AffiliateFeeTransformer.TokenFee[] memory fees = new AffiliateFeeTransformer.TokenFee[](2);
        fees[0] = AffiliateFeeTransformer.TokenFee({
            token: IERC20Token(LibERC20Transformer.ETH_TOKEN_ADDRESS),
            amount: uint256(1),
            recipient: payable(feeRecipient)
        });

        fees[1] = AffiliateFeeTransformer.TokenFee({
            token: IERC20Token(token1),
            amount: uint256(1),
            recipient: payable(feeRecipient)
        });

        bytes4 result = target.transform(
            IERC20Transformer.TransformContext({
                sender: payable(address(this)),
                recipient: payable(address(this)),
                data: abi.encode(fees)
            })
        );
        assertEq(feeRecipient.balance, ethBalanceBefore + 1);
        assertEq(token1.balanceOf(feeRecipient), 1);
        assertEq(result, LibERC20Transformer.TRANSFORMER_SUCCESS);
    }

    function test_affiliateFee_zeroAmount() public {
        // Send positive slippage to contract which executes AffiliateFeeTransformer
        weth.transfer(address(target), 10);

        AffiliateFeeTransformer.TokenFee[] memory fees = new AffiliateFeeTransformer.TokenFee[](1);
        fees[0] = AffiliateFeeTransformer.TokenFee({
            token: IERC20Token(token1),
            amount: 0,
            recipient: payable(feeRecipient)
        });

        bytes4 result = target.transform(
            IERC20Transformer.TransformContext({
                sender: payable(address(this)),
                recipient: payable(address(this)),
                data: abi.encode(fees)
            })
        );
        assertEq(token1.balanceOf(feeRecipient), 0);
        assertEq(result, LibERC20Transformer.TRANSFORMER_SUCCESS);
    }
}
