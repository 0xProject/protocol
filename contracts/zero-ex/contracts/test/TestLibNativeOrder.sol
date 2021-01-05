// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6;
pragma experimental ABIEncoderV2;

import "../src/features/libs/LibNativeOrder.sol";


contract TestLibNativeOrder {

    function getLimitOrderStructHash(LibNativeOrder.LimitOrder calldata order)
        external
        pure
        returns (bytes32 structHash)
    {
        return LibNativeOrder.getLimitOrderStructHash(order);
    }

    function getRfqOrderStructHash(LibNativeOrder.RfqOrder calldata order)
        external
        pure
        returns (bytes32 structHash)
    {
        return LibNativeOrder.getRfqOrderStructHash(order);
    }
}
