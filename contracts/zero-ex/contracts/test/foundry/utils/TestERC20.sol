// SPDX-License-Identifier: MIT
pragma solidity ^0.6;

import "openzeppelin-contracts/token/ERC20/ERC20.sol";

contract TestERC20 is ERC20("Test ERC20", "TEST") {
    function mint(address to, uint256 amount) external returns (bool) {
        _mint(to, amount);
        return true;
    }
}