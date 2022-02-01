// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6;

import "./DSTest.sol";

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

    modifier requiresChainId(uint256 chainId)
    {
        if (chainId != _chainId())
        {
            emit log_string("skip: wrong chain id");
            return;
        }
        _;
    }

    modifier requiresBlockNumberGte(uint256 blockNumber)
    {
        if (block.number < blockNumber)
        {
            emit log_string("skip: block.number < blockNumber");
            return;
        }
        _;
    }

    function _chainId()
        internal
        returns (uint256 id)
    {
        uint256 id;
        assembly {
            id := chainid()
        }
        return id;
    }
}