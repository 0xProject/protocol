// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "forge-std/console2.sol";

contract Deploy is Script {
    function setUp() public {}

    function run() external {
        vm.startBroadcast(vm.envAddress("DEPLOYER"));

        bytes memory _bytecode = vm.getCode("./ZRXToken.json");
        address zrxToken;
        assembly {
            zrxToken := create(0, add(_bytecode, 0x20), mload(_bytecode))
        }
        console2.log("Zrx Token", zrxToken);
        console2.log(unicode"Zrx Token deployed successfully 🎉");
        vm.stopBroadcast();
    }
}
