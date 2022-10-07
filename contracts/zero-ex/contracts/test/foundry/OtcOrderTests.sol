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
import "src/sampler/UniswapV2Sampler.sol";
import "forge-std/StdJson.sol";

contract NativeTokenToERC20WithOtcTest is Test, ForkUtils, TestUtils {
    //use forge-std json library for strings
    using stdJson for string;
   
   
    //utility mapping to get chainId by name
    mapping(string => string) public chainsByChainId;
    //utility mapping to get indexingChainId by Chain
    mapping(string => string) public indexChainsByChain;

    string json;
   
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


    function testSwapEthForUSDTThroughFqtOtcs() public {
        log_string("SwapEthForUSDTThroughFqtOtc");
        /* */
        for (uint256 i = 0; i < 1; i++) {
            //skip fantom/avax failing test
            if( i == 3 || i == 4 ){
                continue;
            }
            vm.selectFork(forkIds[chains[i]]);
            log_named_string("  Selecting Fork On", chains[i]);
            vm.deal(address(this), 1e18);
            labelAddresses(chains[i], indexChainsByChain[chains[i]], getTokens(i), getContractAddresses(i), getLiquiditySourceAddresses(i));
            swapWithOtcOrder(getTokens(i), getContractAddresses(i), getLiquiditySourceAddresses(i));
        }
    }
   
    /*//////////////////////////////////////////////////////////////
                                 Settlement
    //////////////////////////////////////////////////////////////*/

    function swapWithOtcOrder(TokenAddresses memory tokens, Addresses memory addresses, LiquiditySources memory sources) public onlyForked {
        IZERO_EX = IZeroEx(addresses.exchangeProxy);
        address USDC = address(tokens.USDC);
        // Create our list of transformations, let's do WethTransformer and FillQuoteTransformer
        ITransformERC20Feature.Transformation[] memory transformations = new ITransformERC20Feature.Transformation[](2);
        
        /*//////////////////////////////////////////////////////////////
                                WethTransformer
        //////////////////////////////////////////////////////////////*/

            // Use our cheeky search helper to find the nonce rather than hardcode it
            transformations[0].deploymentNonce = _findTransformerNonce(address(addresses.wethTransformer), address(addresses.exchangeProxyTransformerDeployer));
            emit log_named_uint("           WethTransformer nonce", transformations[0].deploymentNonce);
            createNewFQT(tokens.WrappedNativeToken, addresses.exchangeProxy, addresses.exchangeProxyTransformerDeployer);
            // Set the first transformation to transform ETH into WETH
            transformations[0].data = abi.encode(LibERC20Transformer.ETH_TOKEN_ADDRESS, 1e18);

        /*//////////////////////////////////////////////////////////////
                                FillQuoteTransformer
        //////////////////////////////////////////////////////////////*/

            transformations[1].deploymentNonce = _findTransformerNonce(address(fillQuoteTransformer), address(addresses.exchangeProxyTransformerDeployer));
            log_named_uint("           FillQuoteTransformer nonce", transformations[1].deploymentNonce);
            // Set up the FillQuoteTransformer data
            FillQuoteTransformer.TransformData memory fqtData;
            fqtData.side = FillQuoteTransformer.Side.Sell;
            fqtData.sellToken = IERC20TokenV06(address(tokens.WrappedNativeToken));
            fqtData.buyToken =  tokens.USDC;
            // the FQT has a sequence, e.g first RFQ then Limit then Bridge
            // since solidity doesn't support arrays of different types, this is one simple solution
            // We use a Bridge order type here as we will fill on UniswapV2
            fqtData.fillSequence = new FillQuoteTransformer.OrderType[](1);
            fqtData.fillSequence[0] = FillQuoteTransformer.OrderType.Otc;
            // The amount to fill
            fqtData.fillAmount = 1e18;

        /*//////////////////////////////////////////////////////////////
                                Sampling
        //////////////////////////////////////////////////////////////*/


        /*//////////////////////////////////////////////////////////////
                                BridgeAdapter
        //////////////////////////////////////////////////////////////*/

        // Now let's set up an OTC fill
            fqtData.otcOrders = new FillQuoteTransformer.OtcOrderInfo[](1);
            LibNativeOrder.OtcOrder memory order;
            FillQuoteTransformer.OtcOrderInfo memory orderInfo;
            

            order.makerToken = fqtData.buyToken;
            order.takerToken = fqtData.sellToken;
            order.makerAmount = 1e18;
            order.takerAmount = 1e18;
            uint privateKey;
            (order.maker, privateKey) = getSigner();
            tip(address(order.makerToken), order.maker, 1e20);
            vm.prank(order.maker);
            IERC20TokenV06(tokens.USDC).approve(address(addresses.exchangeProxy), 1e20);
            // vm.startPrank(whale);
            // tokens.USDC.approve(address(this), uint(-1));
            // //tokens.USDC.transferFrom(address(whale), address(order.maker), balance);
            // balance = tokens.USDC.balanceOf(order.maker);
            // vm.stopPrank();
            //vm.deal(address(order.makerToken), address(order.maker), 1e20);
            vm.prank(order.maker);
            // tokens.USDC.approve(
            //     address(IZERO_EX),
            //     uint256(-1)
            // );

            order.taker = address(0);
            order.txOrigin = address(tx.origin);
            order.expiryAndNonce = encodeExpiryAndNonce(order.maker); 
            orderInfo.order = order;

            (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey,IZERO_EX.getOtcOrderHash(order));
            // How much we want to fill on this order, which can be different to the total
            // e.g 50/50 split this would be half
            order.takerAmount = 1e18;
            // Set this low as the price of ETH/USDC can change
            order.makerAmount = 1e18;

            orderInfo.signature.signatureType = LibSignature.SignatureType.EIP712;
            orderInfo.signature.v = v;
            orderInfo.signature.r = r;
            orderInfo.signature.s = s;

            orderInfo.maxTakerTokenFillAmount = 1e18;
            
            fqtData.otcOrders[0] = orderInfo;
            transformations[1].data = abi.encode(fqtData);
            log_string("        Successful fill, makerTokens bought");
            IZERO_EX.transformERC20{value: 1e18}(
                // input token
                IERC20TokenV06(LibERC20Transformer.ETH_TOKEN_ADDRESS),
                // output token
                tokens.USDC,
                // input token amount
                order.takerAmount,
                // min output token amount
                order.makerAmount,
                // list of transform
                transformations
            );
            assert(tokens.USDC.balanceOf(address(this)) > 0);
    }

    function encodeExpiryAndNonce(address maker) public returns (uint256){
        uint256 expiry = (block.timestamp + 120) << 192;
        uint256 bucket = 0 << 128;
        uint256 nonce = vm.getNonce(maker);
        return expiry | bucket | nonce;
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
        vm.stopPrank();
    }
}

