pragma solidity ^0.5.9;

import "../src/Ownable.sol";

contract TestOwnable is Ownable {
    function externalOnlyOwner() external view onlyOwner returns (bool) {
        return true;
    }
}
