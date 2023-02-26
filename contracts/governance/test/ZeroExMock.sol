// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract ZeroExMock {
    mapping(bytes4 => address) public implementations;

    function rollback(bytes4 selector, address targetImpl) public {
        implementations[selector] = targetImpl;
    }
}
