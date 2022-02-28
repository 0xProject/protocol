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

import "./TestMintableERC20Token.sol";


contract TestTokenSpenderERC20Token is
    TestMintableERC20Token
{

    event TransferFromCalled(
        address sender,
        address from,
        address to,
        uint256 amount
    );

    // `transferFrom()` behavior depends on the value of `amount`.
    uint256 constant private EMPTY_RETURN_AMOUNT = 1337;
    uint256 constant private FALSE_RETURN_AMOUNT = 1338;
    uint256 constant private REVERT_RETURN_AMOUNT = 1339;
    uint256 constant private TRIGGER_FALLBACK_SUCCESS_AMOUNT = 1340;
    uint256 constant private EXTRA_RETURN_TRUE_AMOUNT = 1341;
    uint256 constant private EXTRA_RETURN_FALSE_AMOUNT = 1342;

    bool private _isGreedyRevert;

    function setGreedyRevert(bool isGreedy) external {
        _isGreedyRevert = isGreedy;
    }

    function transferFrom(address from, address to, uint256 amount)
        public
        override
        returns (bool)
    {
        emit TransferFromCalled(msg.sender, from, to, amount);
        if (amount == EMPTY_RETURN_AMOUNT) {
            assembly { return(0, 0) }
        }
        if (amount == FALSE_RETURN_AMOUNT) {
            return false;
        }
        if (amount == REVERT_RETURN_AMOUNT) {
            assert(!_isGreedyRevert);
            revert("TestTokenSpenderERC20Token/Revert");
        }
        if (amount == TRIGGER_FALLBACK_SUCCESS_AMOUNT) {
            assert(!_isGreedyRevert);
            return false;
        }
        if (amount == EXTRA_RETURN_TRUE_AMOUNT
            || amount == EXTRA_RETURN_FALSE_AMOUNT) {
            bool ret = amount == EXTRA_RETURN_TRUE_AMOUNT;

            assembly {
                mstore(0x00, ret)
                mstore(0x20, amount) // just something extra to return
                return(0, 0x40)
            }
        }
        return true;
    }

    function setBalanceAndAllowanceOf(
        address owner,
        uint256 balance,
        address spender,
        uint256 allowance_
    )
        external
    {
        balanceOf[owner] = balance;
        allowance[owner][spender] = allowance_;
    }
}
