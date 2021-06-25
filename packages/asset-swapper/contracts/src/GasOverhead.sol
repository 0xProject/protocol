// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6;

contract GasOverhead {
    uint256 private _overhead = 2;
    // Overhead incurred from updating the overhead storage slot
    uint256 constant SSTORE_OVERHEAD = 20000;

    function addOverhead(uint256 gas, uint256 gasBefore)
        external
    {
        uint256 callOverhead = gasBefore - gasleft();
        // Add additional est overhead of performing this update
        _overhead += gas + callOverhead + SSTORE_OVERHEAD;
    }

    function clearOverhead()
        external
    {
        _overhead = 2;
    }

    function overhead()
        external
        view
        returns (uint256)
    {
        return _overhead;
    }
}
