// SPDX-License-Identifier: Apache-2.0
/*

  Copyright 2022 ZeroEx Intl.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.

*/

pragma solidity ^0.6;
pragma experimental ABIEncoderV2;

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
import "src/transformers/bridges/BSCBridgeAdapter.sol";
import "src/transformers/bridges/CeloBridgeAdapter.sol";
import "src/transformers/bridges/IBridgeAdapter.sol";
import "src/features/OtcOrdersFeature.sol";
import "forge-std/StdJson.sol";
import "forge-std/Test.sol";
import "./utils/ForkUtils.sol";
import "./utils/TestUtils.sol";

contract OtcBridgeSettlement is 
  TestUtils,
  ForkUtils
{
  IBridgeAdapter bridgeAdapter;
  FillQuoteTransformer fillQuoteTransformer;
  OtcOrdersFeature otcOrdersFeature;
  IZeroEx IZERO_EX;
    function createBridgeAdapter(IEtherTokenV06 weth) public returns(IBridgeAdapter bridgeAdapter) {
      uint chainId;

      assembly {
        chainId := chainid()
      }
      if(chainId == 1) {return IBridgeAdapter(new EthereumBridgeAdapter(weth));}
      else if( chainId == 56){ return IBridgeAdapter(new BSCBridgeAdapter(weth));}
      else if( chainId == 137){return IBridgeAdapter(new PolygonBridgeAdapter(weth));}
      else if( chainId == 43114){return IBridgeAdapter(new AvalancheBridgeAdapter(weth));}
      else if( chainId == 250){return IBridgeAdapter(new FantomBridgeAdapter(weth));}
      else if( chainId == 10){return IBridgeAdapter(new OptimismBridgeAdapter(weth));}
      else if( chainId == 42161){return IBridgeAdapter(new ArbitrumBridgeAdapter(weth));}
    }

    function createFillQuoteTransformer(IBridgeAdapter bridgeAdapter, IZeroEx exchangeProxy) public returns (FillQuoteTransformer fqt){
      return new FillQuoteTransformer(bridgeAdapter, exchangeProxy);
    }

    function deployAndLabel(TokenAddresses memory tokens, Addresses memory contracts) public{
      bridgeAdapter = createBridgeAdapter(IEtherTokenV06(tokens.WrappedNativeToken));
      fillQuoteTransformer = createFillQuoteTransformer(bridgeAdapter, IZeroEx(contracts.exchangeProxy));
      otcOrdersFeature = new OtcOrdersFeature(contracts.exchangeProxy, tokens.WrappedNativeToken);

      vm.prank(IZeroEx(contracts.exchangeProxy).owner());
      IZeroEx(contracts.exchangeProxy).migrate(
        address(otcOrdersFeature),
        abi.encodeWithSelector(otcOrdersFeature.migrate.selector, address(otcOrdersFeature)),
        address(this)
      );

      IZERO_EX = IZeroEx(contracts.exchangeProxy);

      vm.label(address(bridgeAdapter), "zeroEx/BridgeAdapter");
      vm.label(address(fillQuoteTransformer), "zeroEx/FillQuoteTransformer");
      vm.label(address(contracts.exchangeProxy), "zeroEx/ExchangeProxy");
      vm.label(address(otcOrdersFeature), "zeroEx/OtcOrdersFeature");
    }

    function _fillOtcOrder(string memory chainName, string memory chainId, TokenAddresses memory tokens, Addresses memory contracts, LiquiditySources memory sources) public returns (uint boughtAmount) {
        log_named_address("WETH/NATIVE_ASSET", address(tokens.WrappedNativeToken));
        log_named_address("EP", address(contracts.exchangeProxy));
        //IBridgeAdapter temp = FillQuoteTransformer(contracts.transformers.fillQuoteTransformer).bridgeAdapter();
        //log_named_address("Bridge Adapter", address(temp));
        uint256 _chainId;
        assembly {
            _chainId := chainid()
        }
        log_named_uint("ChainId", _chainId);

        deployAndLabel(tokens, contracts);
        
        buildTransform(tokens,contracts);
    }

    function buildTransform(TokenAddresses memory tokens, Addresses memory contracts) public {
        ITransformERC20Feature.Transformation[] memory transformations = new ITransformERC20Feature.Transformation[](2);
        // Use our cheeky search helper to find the nonce rather than hardcode it
        //  hint: it's 6 for WethTransformer and 22 for this FillQuoteTransformer
        transformations[0].deploymentNonce = _findTransformerNonce(address(contracts.transformers.wethTransformer), address(contracts.exchangeProxyTransformerDeployer));
        transformations[1].deploymentNonce = _findTransformerNonce(address(fillQuoteTransformer), address(contracts.exchangeProxyTransformerDeployer));

        transformations[0].data = abi.encode(LibERC20Transformer.ETH_TOKEN_ADDRESS, 1e9);


        // Set up the FillQuoteTransformer data
        FillQuoteTransformer.TransformData memory fqtData;
        fqtData.side = FillQuoteTransformer.Side.Sell;
        // FQT deals with tokens, not ETH, so it needs a WETH transformer
        // to be applied beforehand
        fqtData.sellToken = IERC20TokenV06(address(tokens.WrappedNativeToken));
        fqtData.buyToken =  IERC20TokenV06(address(tokens.USDC));
        // the FQT has a sequence, e.g first RFQ then Limit then Bridge
        // since solidity doesn't support arrays of different types, this is one simple solution
        // We use a Bridge order type here as we will fill on UniswapV2
        fqtData.fillSequence = new FillQuoteTransformer.OrderType[](2);
        fqtData.fillSequence[0] = FillQuoteTransformer.OrderType.Bridge;
        fqtData.fillSequence[1] = FillQuoteTransformer.OrderType.Otc;
        // The amount to fill
        fqtData.fillAmount = 2e18;
        // Now let's set up an OTC fill
        fqtData.otcOrders = new FillQuoteTransformer.OtcOrderInfo[](1);

        LibNativeOrder.OtcOrder memory order;
        FillQuoteTransformer.OtcOrderInfo memory orderInfo;
        //build up the otc order info for a 0.1 weth swap to usdc
        order.makerToken = IERC20TokenV06(address(tokens.USDC));
        order.takerToken = IERC20TokenV06(address(tokens.WrappedNativeToken));
        order.makerAmount = 1e4;
        order.takerAmount = 1e18;
        order.maker = address(0xAc3c9f9a125F569a3112d1C60e008fA55e159B92);
        order.taker = address(0);
        order.txOrigin = address(tx.origin);
        order.expiryAndNonce = uint256(10414516026389248070289760349785577643365704380554799766852394287105);

        string memory mnemonic = "test test test test test test test test test test test junk";
        uint256 privateKey = vm.deriveKey(mnemonic, 0);
        address signer = vm.addr(privateKey);
        log_named_address("Signing with address", signer);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey,IZeroEx(contracts.exchangeProxy).getOtcOrderHash(order));
        log_named_address("recoveredSigner", ecrecover(IZeroEx(contracts.exchangeProxy).getOtcOrderHash(order), v,r,s));

        orderInfo.signature.signatureType = LibSignature.SignatureType.EIP712;
        orderInfo.signature.v = v;
        orderInfo.signature.r = r;
        orderInfo.signature.s = s;
        
        emit log_named_address("Signer Of Hash", LibSignature.getSignerOfHash(IZeroEx(contracts.exchangeProxy).getOtcOrderHash(order), orderInfo.signature));
        orderInfo.maxTakerTokenFillAmount = 1e18;
        fqtData.otcOrders[0] = orderInfo;
        transformations[1].data = abi.encode(getBridgeOrder(fqtData));


        //fillOrder(transformations);
    } 

    function getBridgeOrder( FillQuoteTransformer.TransformData memory fqtData) public returns (FillQuoteTransformer.TransformData memory _data){

      fqtData.bridgeOrders = new IBridgeAdapter.BridgeOrder[](1);
      IBridgeAdapter.BridgeOrder memory bridgeOrder;
      bridgeOrder.source = bytes32(uint256(BridgeProtocols.UNISWAPV2) << 128);
      // How much we want to fill on this order, which can be different to the total
      // e.g 50/50 split this would be half
      bridgeOrder.takerTokenAmount = 1e18;
      // Set this low as the price of ETH/USDC can change
      bridgeOrder.makerTokenAmount = 1;

      address[] memory uniPath = new address[](2);
      uniPath[0] = address(tokens.WrappedNativeToken);
      uniPath[1] = address(tokens.USDC);
      bridgeOrder.bridgeData = abi.encode(address(sources.UniswapV2Router), uniPath);
      fqtData.bridgeOrders[0] = bridgeOrder;
      return (fqtData);
  }

  function fillOrder(ITransformERC20Feature.Transformation[] memory _transformations) public {
    vm.deal(address(this), 5e19);
    IZERO_EX.transformERC20{value: 2e18}(
        // input token
        IERC20TokenV06(LibERC20Transformer.ETH_TOKEN_ADDRESS),
        // output token
        IERC20TokenV06(address(tokens.USDC)),
        // input token amount
        2e18,
        // min output token amount, set this low as ETH/USDC price will move
        1,
        // list of transform
        _transformations
    );
    // Hoollly heck we bought some USDC
    assertGt(tokens.USDC.balanceOf(address(this)), 0);
    emit log_named_uint("USDC bought", tokens.USDC.balanceOf(address(this)));

}
}