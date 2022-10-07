pragma solidity ^0.6;

pragma experimental ABIEncoderV2;

import "./utils/ForkUtils.sol";
import "./utils/TestUtils.sol";
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
import "forge-std/StdJson.sol";

contract transformERC20Tests is Test, ForkUtils, TestUtils {
    //use forge-std json library for strings
    using stdJson for string;
   
    //utility mapping to get chainId by name
    mapping(string => string) public chainsByChainId;
    //utility mapping to get indexingChainId by Chain
    mapping(string => string) public indexChainsByChain;

    string json;

    function setUp() public {
        //get out addresses.json file that defines contract addresses for each chain we are currently deployed on
        string memory root = vm.projectRoot();
        string memory path = string(abi.encodePacked(root, "/", "contracts/test/foundry/addresses/addresses.json"));
        json = vm.readFile(path);
        createForks();

        for (uint256 i = 0; i < chains.length; i++) {
            chainsByChainId[chains[i]] = chainIds[i];
            indexChainsByChain[chains[i]] = indexChainIds[i];
            bytes memory details = json.parseRaw(indexChainIds[i]);
            addresses = abi.decode(details, (Addresses));
        }
    }

    function testTransformERC20Forked() public {
        log_string("TransformERC20Tests");
        for (uint256 i = 0; i < chains.length; i++) {
            vm.selectFork(forkIds[chains[i]]);
            log_named_string("  Selecting Fork On", chains[i]);
            _wrapNativeToken(chains[i], indexChainsByChain[chains[i]]);
        }
    }
    function logAddresses(string memory chainName, string memory chainId) public {
        bytes memory details = json.parseRaw(chainId);
        addresses = abi.decode(details, (Addresses));
    }

    function _wrapNativeToken(string memory chainName, string memory chainId) public onlyForked {
        bytes memory details = json.parseRaw(chainId);
        addresses = abi.decode(details, (Addresses));

        vm.deal(address(this), 1e19);

        emit log_string("-----Preparing ETH->WETH transformation through TransformERC20()-----");
        emit log_string("   --Building Up Transformations--");
        ITransformERC20Feature.Transformation[] memory transformations = new ITransformERC20Feature.Transformation[](1);

        emit log_named_address(
            "    Finding TransformerDeployer nonce @", address(addresses.exchangeProxyTransformerDeployer)
            );
        emit log_named_uint(
            "       Deployer nonce",
            _findTransformerNonce(
                address(addresses.wethTransformer), address(addresses.exchangeProxyTransformerDeployer)
            )
            );
        transformations[0].deploymentNonce = _findTransformerNonce(
            address(addresses.wethTransformer), address(addresses.exchangeProxyTransformerDeployer)
        );
        transformations[0].data = abi.encode(LibERC20Transformer.ETH_TOKEN_ADDRESS, 1e18);

        emit log_string("   ---Calling TransformERC20()---");
        uint256 balanceETHBefore = address(this).balance;
        uint256 balanceWETHBefore = IERC20TokenV06(addresses.etherToken).balanceOf(address(this));

        IZeroEx(payable(addresses.exchangeProxy)).transformERC20{value: 1e18}(
            // input token
            IERC20TokenV06(LibERC20Transformer.ETH_TOKEN_ADDRESS),
            // output token
            IERC20TokenV06(address(addresses.etherToken)),
            // input token amount
            1e18,
            // min output token amount
            1e18,
            // list of transform
            transformations
        );
        log_named_uint("        NativeAsset balance before", balanceETHBefore);
        log_named_uint("        ERC-20 balance before",  balanceWETHBefore);
        log_named_uint("        NativeAsset balance after", balanceETHBefore - address(this).balance);
        log_named_uint("        ERC-20 balance after",  IERC20TokenV06(addresses.etherToken).balanceOf(address(this)) - balanceWETHBefore);
    }

}
