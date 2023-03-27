// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "forge-std/console2.sol";
import "@openzeppelin/token/ERC20/IERC20.sol";
import "@openzeppelin/proxy/ERC1967/ERC1967Proxy.sol";

import "../src/ZRXWrappedToken.sol";
import "../src/ZeroExVotes.sol";
import "../src/ZeroExTimelock.sol";
import "../src/ZeroExProtocolGovernor.sol";
import "../src/ZeroExTreasuryGovernor.sol";

contract Deploy is Script {
    address internal constant DEPLOYER = 0xd56716E3cC851bAF569795351917df73F8762A7F;
    address internal constant ZRX_TOKEN = 0xE41d2489571d322189246DaFA5ebDe1F4699F498;
    address internal constant TREASURY = 0x0bB1810061C2f5b2088054eE184E6C79e1591101;
    address internal constant EXCHANGE = 0xDef1C0ded9bec7F1a1670819833240f027b25EfF;
    address payable internal constant SECURITY_COUNCIL = payable(DEPLOYER);
    uint256 internal constant QUADRATIC_THRESHOLD = 1000000e18;

    function setUp() public {}

    function run() external {
        //uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        //vm.startBroadcast(deployerPrivateKey);

        vm.startBroadcast(DEPLOYER);

        console2.log("Zrx Token", ZRX_TOKEN);
        address wTokenPrediction = predict(DEPLOYER, vm.getNonce(DEPLOYER) + 2);
        ZeroExVotes votesImpl = new ZeroExVotes(wTokenPrediction, QUADRATIC_THRESHOLD);
        ERC1967Proxy votesProxy = new ERC1967Proxy(address(votesImpl), abi.encodeCall(votesImpl.initialize, ()));
        ZRXWrappedToken wToken = new ZRXWrappedToken(IERC20(ZRX_TOKEN), ZeroExVotes(address(votesProxy)));

        assert(address(wToken) == wTokenPrediction);
        console2.log("Wrapped Token", address(wToken));

        ZeroExVotes votes = ZeroExVotes(address(votesProxy));
        console2.log("Votes", address(votes));

        address[] memory proposers = new address[](0);
        address[] memory executors = new address[](0);

        ZeroExTimelock protocolTimelock = new ZeroExTimelock(3 days, proposers, executors, DEPLOYER);
        console2.log("Protocol timelock", address(protocolTimelock));

        ZeroExProtocolGovernor protocolGovernor = new ZeroExProtocolGovernor(
            IVotes(address(votes)),
            protocolTimelock,
            SECURITY_COUNCIL
        );
        protocolTimelock.grantRole(protocolTimelock.PROPOSER_ROLE(), address(protocolGovernor));
        protocolTimelock.grantRole(protocolTimelock.EXECUTOR_ROLE(), address(protocolGovernor));
        protocolTimelock.grantRole(protocolTimelock.CANCELLER_ROLE(), address(protocolGovernor));
        console2.log("Protocol governor", address(protocolGovernor));

        ZeroExTimelock treasuryTimelock = new ZeroExTimelock(2 days, proposers, executors, DEPLOYER);
        console2.log("Treasury timelock", address(treasuryTimelock));

        ZeroExTreasuryGovernor treasuryGovernor = new ZeroExTreasuryGovernor(
            IVotes(address(votes)),
            treasuryTimelock,
            SECURITY_COUNCIL
        );

        treasuryTimelock.grantRole(treasuryTimelock.PROPOSER_ROLE(), address(treasuryGovernor));
        treasuryTimelock.grantRole(treasuryTimelock.EXECUTOR_ROLE(), address(treasuryGovernor));
        treasuryTimelock.grantRole(treasuryTimelock.CANCELLER_ROLE(), address(treasuryGovernor));
        console2.log("Treasury governor", address(treasuryGovernor));
        console2.log(unicode"0x governance deployed successfully 🎉");
        vm.stopBroadcast();
    }

    function predict(address deployer, uint256 nonce) internal pure returns (address) {
        require(nonce > 0 && nonce < 128, "Invalid nonce");
        return address(uint160(uint256(keccak256(abi.encodePacked(bytes2(0xd694), deployer, bytes1(uint8(nonce)))))));
    }
}
