// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "forge-std/console2.sol";

contract Deploy is Script {
    address internal constant DEPLOYER = 0xd56716E3cC851bAF569795351917df73F8762A7F;

    function setUp() public {}

    function run() external {
        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));

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
