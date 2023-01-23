pragma solidity ^0.6;

pragma experimental ABIEncoderV2;

import "utils/ForkUtils.sol";
import "utils/TestUtils.sol";
import "src/IZeroEx.sol";
import "@0x/contracts-erc20/contracts/src/v06/IEtherTokenV06.sol";
import "src/features/TransformERC20Feature.sol";
import "src/external/TransformerDeployer.sol";
import "src/transformers/WethTransformer.sol";
import "src/transformers/FillQuoteTransformer.sol";
import "src/transformers/bridges/BridgeProtocols.sol";
import "src/transformers/bridges/EthereumBridgeAdapter.sol";
import "src/transformers/bridges/PolygonBridgeAdapter.sol";
import "src/transformers/bridges/ArbitrumBridgeAdapter.sol";
import "src/transformers/bridges/OptimismBridgeAdapter.sol";
import "src/transformers/bridges/AvalancheBridgeAdapter.sol";
import "src/transformers/bridges/FantomBridgeAdapter.sol";
import "src/transformers/bridges/CeloBridgeAdapter.sol";
import "src/features/OtcOrdersFeature.sol";

contract ForkUtilsTest is Test, ForkUtils, TestUtils {
    /*//////////////////////////////////////////////////////////////
                                 Rpc Setup
    //////////////////////////////////////////////////////////////*/
    function setUp() public {
        _setup();
    }

    function test_transformERC20Forked() public {
        
    }

    function logAddresses(string memory chainName, string memory chainId) public {
        bytes memory details = json.parseRaw(chainId);
        addresses = abi.decode(details, (ContractAddresses));
    }
}
