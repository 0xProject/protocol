// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6;

contract DelegateHackedERC20 {

    address private constant HACKED = 0xDEf1000000000000000000000000000000DE7d37;

    receive() external payable {}

    fallback() payable external {
        (bool success, bytes memory resultData) =
            HACKED.delegatecall(msg.data);
        if (!success) {
            assembly { revert(add(resultData, 32), mload(resultData)) }
        }
        assembly { return(add(resultData, 32), mload(resultData)) }
    }

    /// @dev Hack to get around schema validation
    function _garbage()
        external
        view
        returns (uint256)
    {
    }
}
