// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6;

import "../../lib/ds-test/src/test.sol";

contract TestBase is 
    DSTest
{
    function _toSingleValueArray(uint256 v)
        internal
        pure
        returns (uint256[] memory arr)
    {
        arr = new uint256[](1);
        arr[0] = v;
    }
}