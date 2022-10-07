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

import "forge-std/Test.sol";
<<<<<<< HEAD

=======
import "src/features/TransformERC20Feature.sol";
import "src/external/TransformerDeployer.sol";
import "src/transformers/WethTransformer.sol";
import "src/transformers/FillQuoteTransformer.sol";
import "@0x/contracts-erc20/contracts/src/v06/IEtherTokenV06.sol";
import "@0x/contracts-erc20/contracts/src/v06/IERC20TokenV06.sol";
import "src/transformers/bridges/BridgeProtocols.sol";
import "src/transformers/bridges/EthereumBridgeAdapter.sol";
import "src/transformers/bridges/PolygonBridgeAdapter.sol";
import "src/transformers/bridges/BSCBridgeAdapter.sol";
import "src/transformers/bridges/ArbitrumBridgeAdapter.sol";
import "src/transformers/bridges/OptimismBridgeAdapter.sol";
import "src/transformers/bridges/AvalancheBridgeAdapter.sol";
import "src/transformers/bridges/FantomBridgeAdapter.sol";
import "src/transformers/bridges/CeloBridgeAdapter.sol";
import "src/IZeroEx.sol";

//contract-addresses/addresses.json interfaces
//need to be alphebetized in solidity but not in addresses.json
struct Addresses {
    address affiliateFeeTransformer;
    address erc20BridgeProxy;
    address erc20BridgeSampler;
    address etherToken;
    address payable exchangeProxy;
    address exchangeProxyFlashWallet;
    address exchangeProxyGovernor;
    address exchangeProxyLiquidityProviderSandbox;
    address exchangeProxyTransformerDeployer;
    address fillQuoteTransformer;
    address payTakerTransformer;
    address positiveSlippageFeeTransformer;
    address staking;
    address stakingProxy;
    address wethTransformer;
    address zeroExGovernor;
    address zrxToken;
    address zrxTreasury;
    address zrxVault;
}

struct TokenAddresses {
  IERC20TokenV06 DAI;
  IERC20TokenV06 USDC;
  IERC20TokenV06 USDT;
  IEtherTokenV06 WrappedNativeToken;
}

struct LiquiditySources {
  address UniswapV2Router;
}
interface IFQT{
  function bridgeAdapter() external returns (address);
}
>>>>>>> 725dfe4db (working bridge Fills through weth transformer)

contract ForkUtils is Test {
<<<<<<< HEAD
=======
  
    using stdJson for string;
    //forked providers for each chain
    mapping(string => uint256) public forkIds;

    IZeroEx IZERO_EX;

    IBridgeAdapter bridgeAdapter;
    FillQuoteTransformer fillQuoteTransformer;

    TokenAddresses tokens;
    Addresses addresses;
    LiquiditySources sources;

    uint256 forkBlock = 15_000_000;

    string[] chains = ["mainnet", "bsc", "polygon", "avalanche", "fantom", "optimism", "arbitrum"];
    string[] indexChainIds = [".1", ".56", ".137", ".43114", ".250", ".10", ".42161"];
    string[] chainIds = ["1", "56", "137", "43114", "250", "10", "42161"];
    uint256[] chainId = [1, 56, 137, 43114, 250, 10, 42161];

    //special fork block number for fantom since it produces blocks faster and more frequently
    uint256[] blockNumber = [forkBlock, forkBlock, 33447149, forkBlock, 32000000, forkBlock, forkBlock];
>>>>>>> 06f73f9d5 (added working otc fill through transformERC20 in FQT)
    /// Only run this function if the block number
    // is greater than some constant for Ethereum Mainnet
<<<<<<< HEAD
    modifier onlyForked {
        if (block.number >= 14206900) {
            _;
        } else {
            emit log_string("Requires fork mode, skipping");
        }
    }
}
=======

    string addressesJson;
    string tokensJson;
    string sourcesJson;

    function createForks() public returns (uint256[] memory) {
      for (uint256 i = 0; i < chains.length; i++) {
          forkIds[chains[i]] = vm.createFork(vm.rpcUrl(chains[i]), blockNumber[i]);
          //forkIds[chains[i]] = vm.createFork(vm.rpcUrl(chains[i]), blockNumber[i]);
      }
    }
    function getSigner() public returns (address, uint){
      string memory mnemonic = "test test test test test test test test test test test junk";
      uint256 privateKey = vm.deriveKey(mnemonic, 0);
      
      
      vm.label(vm.addr(privateKey), "zeroEx/MarketMaker");
      return (vm.addr(privateKey), privateKey);
    }

               

    function readLiquiditySourceAddresses() public returns (string memory) {
      string memory root = vm.projectRoot();
      string memory path = string(abi.encodePacked(root, "/", "contracts/test/foundry/addresses/sourceAddresses.json"));
      sourcesJson = vm.readFile(path);
      return vm.readFile(path);
    }

    function getLiquiditySourceAddresses(uint index) public returns (LiquiditySources memory sources ) {
      readLiquiditySourceAddresses();
      bytes memory liquiditySources = sourcesJson.parseRaw(indexChainIds[index]);
      return abi.decode(liquiditySources, (LiquiditySources));
    }

    function readAddresses() public returns (string memory){
        string memory root = vm.projectRoot();
        string memory path = string(abi.encodePacked(root, "/", "contracts/test/foundry/addresses/addresses.json"));
        addressesJson = vm.readFile(path);
        return vm.readFile(path);
    }
    function getContractAddresses(uint index) public returns (Addresses memory addresses){
      readAddresses();
      bytes memory contractAddresses = addressesJson.parseRaw(indexChainIds[index]);
      return abi.decode(contractAddresses, (Addresses));
      //log_named_address("WETH/NATIVE_ASSET", address(tokens.WrappedNativeToken));
  }

    function readTokens() public returns (string memory){
      string memory root = vm.projectRoot();
      string memory path = string(abi.encodePacked(root, "/", "contracts/test/foundry/addresses/tokenAddresses.json"));
      tokensJson = vm.readFile(path);
      return vm.readFile(path);
  }

  function getTokens(uint index) public returns (TokenAddresses memory addresses){
      readTokens();
      bytes memory chainTokens = tokensJson.parseRaw(indexChainIds[index]);
      return abi.decode(chainTokens, (TokenAddresses));
      //log_named_address("WETH/NATIVE_ASSET", address(tokens.WrappedNativeToken));
  }

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

  function labelAddresses(string memory chainName, string memory chainId, TokenAddresses memory tokens, Addresses memory addresses, LiquiditySources memory sources) public {
    log_named_string("   Using contract addresses on chain",chainName);
    // log_named_address("     zeroEx/exchangeProxy",addresses.exchangeProxy);
    // log_named_address("     zeroEx/fillQuoteTransformer",addresses.fillQuoteTransformer);
    // log_named_address("     zeroEx/payTakerTransformer",addresses.payTakerTransformer);
    // log_named_address("     zeroEx/positiveSlippageFeeTransformer",addresses.positiveSlippageFeeTransformer);
    // log_named_address("     zeroEx/wethTransformer",addresses.wethTransformer);
    vm.label(addresses.affiliateFeeTransformer, "zeroEx/affiliateFeeTransformer");
    vm.label(addresses.erc20BridgeProxy, "zeroEx/erc20BridgeProxy");
    vm.label(addresses.erc20BridgeSampler, "zeroEx/erc20BridgeSampler");
    vm.label(addresses.etherToken, "zeroEx/etherToken");
    vm.label(addresses.exchangeProxy, "zeroEx/exchangeProxy");
    vm.label(addresses.exchangeProxyFlashWallet, "zeroEx/exchangeProxyFlashWallet");
    vm.label(addresses.exchangeProxyGovernor, "zeroEx/exchangeProxyGovernor");
    vm.label(addresses.exchangeProxyLiquidityProviderSandbox, "zeroEx/exchangeProxyLiquidityProviderSandbox");
    vm.label(addresses.exchangeProxyTransformerDeployer, "zeroEx/exchangeProxyTransformerDeployer");
    vm.label(addresses.fillQuoteTransformer, "zeroEx/fillQuoteTransformer");
    vm.label(addresses.payTakerTransformer, "zeroEx/payTakerTransformer");
    vm.label(addresses.positiveSlippageFeeTransformer, "zeroEx/positiveSlippageFeeTransformer");
    vm.label(addresses.staking, "zeroEx/staking");
    vm.label(addresses.stakingProxy, "zeroEx/stakingProxy");
    vm.label(addresses.wethTransformer, "zeroEx/wethTransformer");
    vm.label(addresses.zeroExGovernor, "zeroEx/zeroExGovernor");
    vm.label(addresses.zrxToken, "zeroEx/zrxToken");
    vm.label(addresses.zrxTreasury, "zeroEx/zrxTreasury");
    vm.label(addresses.zrxVault, "zeroEx/zrxVault");
    vm.label(address(tokens.WrappedNativeToken), "WrappedNativeToken");
    vm.label(address(tokens.USDT), "USDT");
    vm.label(address(tokens.USDC), "USDC");
    vm.label(address(tokens.DAI), "DAI");
    vm.label(address(sources.UniswapV2Router), "UniswapRouter");
  }

  modifier onlyForked() {
      if (block.number >= 15000000) {
          _;
      } else {
          emit log_string("Requires fork mode, skipping");
      }
  }
}
>>>>>>> 725dfe4db (working bridge Fills through weth transformer)