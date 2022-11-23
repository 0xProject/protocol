// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.6;
pragma experimental ABIEncoderV2;

contract FakeTaker {
    struct Result {
        bool success;
        bytes resultData;
        uint256 gasUsed;
    }

    receive() external payable {}

    function execute(address payable to, bytes calldata data) public payable returns (Result memory result) {
        uint256 gasBefore = gasleft();
        (result.success, result.resultData) = to.call{value: msg.value}(data);
        result.gasUsed = gasBefore - gasleft();
    }
}
