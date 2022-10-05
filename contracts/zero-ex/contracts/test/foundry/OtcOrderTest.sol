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
import "src/features/OtcOrdersFeature.sol";
import "forge-std/StdJson.sol";

contract ETHToERC20TransformTest is Test, ForkUtils, TestUtils {
    //use forge-std json library for strings
    using stdJson for string;
   
    //utility mapping to get chainId by name
    mapping(string => string) public chainsByChainId;
    //utility mapping to get indexingChainId by Chain
    mapping(string => string) public indexChainsByChain;

    string json;

    IBridgeAdapter bridgeAdapter;
    FillQuoteTransformer fillQuoteTransformer;
   
    /*//////////////////////////////////////////////////////////////
                                 Rpc Setup
    //////////////////////////////////////////////////////////////*/
    function setUp() public {
        //get out addresses.json file that defines contract addresses for each chain we are currently deployed on
        createForks();

        for (uint256 i = 0; i < chains.length; i++) {
            chainsByChainId[chains[i]] = chainIds[i];
            indexChainsByChain[chains[i]] = indexChainIds[i];
        }
    }

    /*//////////////////////////////////////////////////////////////
                                 Dispatch
    //////////////////////////////////////////////////////////////*/


    function testSwapEthForERC20OnUniswap() public {
        log_string("SwapEthForERC20OnUniswap");
        for (uint256 i = 0; i < chains.length; i++) {
            //skip fantom/avax failing test
            if( i == 3 || i == 4 ){
                continue;
            }
            vm.selectFork(forkIds[chains[i]]);
            log_named_string("  Selecting Fork On", chains[i]);
            labelAddresses(chains[i], indexChainsByChain[chains[i]], getTokens(i), getContractAddresses(i), getLiquiditySourceAddresses(i));
            swapOnUniswap(chains[i], indexChainsByChain[chains[i]], getTokens(i), getContractAddresses(i), getLiquiditySourceAddresses(i));
        }
    }
   
    /*//////////////////////////////////////////////////////////////
                                 Settlement
    //////////////////////////////////////////////////////////////*/

    function swapOnUniswap(string memory chainName, string memory chainId, TokenAddresses memory tokens, Addresses memory addresses, LiquiditySources memory sources) public onlyForked {
        if(sources.UniswapV2Router != address(0)) {
        // Create our list of transformations, let's do WethTransformer and FillQuoteTransformer
        ITransformERC20Feature.Transformation[] memory transformations = new ITransformERC20Feature.Transformation[](2);

        createNewFQT(tokens.WrappedNativeToken, addresses.exchangeProxy, addresses.exchangeProxyTransformerDeployer);

        vm.label(address(fillQuoteTransformer), "zeroEx/FillQuoteTransformer");
        // Use our cheeky search helper to find the nonce rather than hardcode it
        //  hint: it's 6 for WethTransformer and 22 for this FillQuoteTransformer
        transformations[0].deploymentNonce = _findTransformerNonce(address(addresses.wethTransformer), address(addresses.exchangeProxyTransformerDeployer));
        transformations[1].deploymentNonce = _findTransformerNonce(address(fillQuoteTransformer), address(addresses.exchangeProxyTransformerDeployer));

        emit log_named_uint("           WethTransformer nonce", transformations[0].deploymentNonce);
        emit log_named_uint("           FillQuoteTransformer nonce", transformations[1].deploymentNonce);

        // Set the first transformation to transform ETH into WETH
        transformations[0].data = abi.encode(LibERC20Transformer.ETH_TOKEN_ADDRESS, 1e18);

        // Set up the FillQuoteTransformer data
        FillQuoteTransformer.TransformData memory fqtData;
        fqtData.side = FillQuoteTransformer.Side.Sell;
        // FQT deals with tokens, not ETH, so it needs a WETH transformer
        // to be applied beforehand
        fqtData.sellToken = IERC20TokenV06(address(tokens.WrappedNativeToken));
        fqtData.buyToken =  IERC20TokenV06(address(tokens.USDT));
        // the FQT has a sequence, e.g first RFQ then Limit then Bridge
        // since solidity doesn't support arrays of different types, this is one simple solution
        // We use a Bridge order type here as we will fill on UniswapV2
        fqtData.fillSequence = new FillQuoteTransformer.OrderType[](1);
        fqtData.fillSequence[0] = FillQuoteTransformer.OrderType.Bridge;
        // The amount to fill
        fqtData.fillAmount = 1e18;
        // Now let's set up a UniswapV2 fill
        fqtData.bridgeOrders = new IBridgeAdapter.BridgeOrder[](1);
        IBridgeAdapter.BridgeOrder memory order;
        // The ID is shifted so we can concat <PROTOCOL><NAME>
        // e.g <UniswapV2Protocol><UniswapV2>
        // or  <UniswapV2Protocol><SushiSwap> for forks
        order.source = bytes32(uint256(BridgeProtocols.UNISWAPV2) << 128);
        // How much we want to fill on this order, which can be different to the total
        // e.g 50/50 split this would be half
        order.takerTokenAmount = 1e18;
        // Set this low as the price of ETH/USDT can change
        order.makerTokenAmount = 1;
        // The data needed specifically for the source to fill,
        // e.g for UniswapV2 it is the router contract and a path. See MixinUniswapV2
        address[] memory uniPath = new address[](2);
        uniPath[0] = address(tokens.WrappedNativeToken);
        uniPath[1] = address(tokens.USDT);
        order.bridgeData = abi.encode(address(sources.UniswapV2Router), uniPath);
        fqtData.bridgeOrders[0] = order;
        // Now encode the FQT data into the transformation
        transformations[1].data = abi.encode(fqtData);

        vm.deal(address(this), 1e18);
        uint256 balanceETHBefore = address(this).balance;
        uint256 balanceERC20Before = IERC20TokenV06(tokens.USDT).balanceOf(address(this));
        
        IZeroEx(payable(addresses.exchangeProxy)).transformERC20{value: 1e18}(
            // input token
            IERC20TokenV06(LibERC20Transformer.ETH_TOKEN_ADDRESS),
            // output token
            IERC20TokenV06(address(tokens.USDT)),
            // input token amount
            1e18,
            // min output token amount
            1,
            // list of transform
            transformations
        );
        
        log_named_uint("        NativeAsset balance before", balanceETHBefore);
        log_named_uint("        ERC-20 balance before",  balanceERC20Before);
        log_named_uint("        NativeAsset balance after", balanceETHBefore - address(this).balance);
        log_named_uint("        ERC-20 balance after",  IERC20TokenV06(tokens.USDT).balanceOf(address(this)) - balanceERC20Before);
        assert(IERC20TokenV06(tokens.USDT).balanceOf(address(this)) > 0);
        }
        else {
            log_string("    Liquidity Source Not available on this chain");
        }
    }

    /*//////////////////////////////////////////////////////////////
                                 HELPERS
    //////////////////////////////////////////////////////////////*/

    function createNewFQT(IEtherTokenV06 wrappedNativeToken, address payable exchangeProxy, address transformerDeployer) public {
        vm.startPrank(transformerDeployer);

        // deploy a new instance of the bridge adapter from the transformerDeployer
        bridgeAdapter = createBridgeAdapter(IEtherTokenV06(wrappedNativeToken));
        // deploy a new instance of the fill quote transformer from the transformerDeployer
        fillQuoteTransformer = new FillQuoteTransformer(IBridgeAdapter(bridgeAdapter), IZeroEx(exchangeProxy));

        vm.label(address(fillQuoteTransformer), "zeroEx/FillQuoteTransformer");
        vm.label(address(fillQuoteTransformer), "zeroEx/FillQuoteTransformer");

        vm.stopPrank();
    }
}
