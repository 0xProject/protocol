pragma solidity ^0.6;
pragma experimental ABIEncoderV2;

import "../src/features/libs/LibLimitOrder.sol";


contract TestLibLimitOrder {

    function getLimitOrderStructHash(LibLimitOrder.LimitOrder calldata order)
        external
        pure
        returns (bytes32 structHash)
    {
        return LibLimitOrder.getLimitOrderStructHash(order);
    }

    function getRfqOrderStructHash(LibLimitOrder.RfqOrder calldata order)
        external
        pure
        returns (bytes32 structHash)
    {
        return LibLimitOrder.getRfqOrderStructHash(order);
    }
}
