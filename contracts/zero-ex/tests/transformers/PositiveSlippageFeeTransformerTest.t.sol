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
import "../../contracts/src/transformers/PositiveSlippageFeeTransformer.sol";
import "../../contracts/src/transformers/IERC20Transformer.sol";

contract PositiveSlippageFeeTransformerTest is BaseTest {
    address public owner = account1;
    address public feeRecipient = account2;
    WETH9V06 weth = new WETH9V06();
    IERC20Token token1 = IERC20Token(address(weth));

    PositiveSlippageFeeTransformer target = new PositiveSlippageFeeTransformer();

    function setUp() public {
        vm.deal(address(this), 1e19);
        weth.deposit{value: 10}();
    }

    function test_positiveSlippageFee() public {
        // Send positive slippage to contract which executes PositiveSlippageFeeTransformer
        weth.transfer(address(target), 10);
        uint256 bestCaseAmount = 1;

        bytes4 result = target.transform(
            IERC20Transformer.TransformContext({
                sender: payable(address(this)),
                recipient: payable(address(this)),
                data: abi.encode(
                    PositiveSlippageFeeTransformer.TokenFee({
                        token: IERC20Token(token1),
                        bestCaseAmount: bestCaseAmount,
                        recipient: payable(feeRecipient)
                    })
                )
            })
        );
        assertEq(token1.balanceOf(feeRecipient), 9);
        assertEq(result, LibERC20Transformer.TRANSFORMER_SUCCESS);
    }

    function test_positiveSlippageFee_bestCaseEqualsAmount() public {
        uint256 bestCaseAmount = 10;
        weth.transfer(address(target), 10);

        bytes4 result = target.transform(
            IERC20Transformer.TransformContext({
                sender: payable(address(this)),
                recipient: payable(address(this)),
                data: abi.encode(
                    PositiveSlippageFeeTransformer.TokenFee({
                        token: IERC20Token(token1),
                        bestCaseAmount: bestCaseAmount,
                        recipient: payable(feeRecipient)
                    })
                )
            })
        );
        assertEq(token1.balanceOf(feeRecipient), 0);
        assertEq(result, LibERC20Transformer.TRANSFORMER_SUCCESS);
    }

    function test_positiveSlippageFee_bestCaseGreaterThanAmount() public {
        uint256 bestCaseAmount = 10;
        weth.transfer(address(target), 1);

        bytes4 result = target.transform(
            IERC20Transformer.TransformContext({
                sender: payable(address(this)),
                recipient: payable(address(this)),
                data: abi.encode(
                    PositiveSlippageFeeTransformer.TokenFee({
                        token: IERC20Token(token1),
                        bestCaseAmount: bestCaseAmount,
                        recipient: payable(feeRecipient)
                    })
                )
            })
        );
        assertEq(token1.balanceOf(feeRecipient), 0);
        assertEq(result, LibERC20Transformer.TRANSFORMER_SUCCESS);
    }
}
