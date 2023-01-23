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
struct Transformers {
    address affiliateFeeTransformer;
    address fillQuoteTransformer;
    address payTakerTransformer;
    address positiveSlippageFeeTransformer;
    address wethTransformer;
}
struct ContractAddresses {
    address erc20BridgeProxy;
    address erc20BridgeSampler;
    address etherToken;
    address payable exchangeProxy;
    address exchangeProxyFlashWallet;
    address exchangeProxyGovernor;
    address exchangeProxyLiquidityProviderSandbox;
    address exchangeProxyTransformerDeployer;
    address staking;
    address stakingProxy;
    Transformers transformers;
    address zeroExGovernor;
    address zrxToken;
    address zrxTreasury;
    address zrxVault;
}
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

interface IFQT {
    function bridgeAdapter() external returns (address);
}

interface IUniswapV2Router01 {
    function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts);

    function getAmountsIn(uint256 amountOut, address[] calldata path) external view returns (uint256[] memory amounts);
}

contract ForkUtils is Test {
    using stdJson for string;

    string json;

    //forked providers for each chain
    mapping(string => uint256) public forkIds;

    IZeroEx IZERO_EX;

    IBridgeAdapter bridgeAdapter;
    FillQuoteTransformer fillQuoteTransformer;

    TokenAddresses tokens;
    Transformers transformers;
    ContractAddresses addresses;
    LiquiditySources sources;

    uint256 forkBlock = 15_000_000;

    string[] chains = ["mainnet", "bsc", "polygon", "avalanche", "fantom", "optimism", "arbitrum"];
    string[] indexChainIds = [".1", ".56", ".137", ".43114", ".250", ".10", ".42161"];
    string[] chainIds = ["1", "56", "137", "43114", "250", "10", "42161"];
    uint256[] chainId = [1, 56, 137, 43114, 250, 10, 42161];

    //special fork block number for fantom since it produces blocks faster and more frequently
    uint256[] blockNumber = [forkBlock, forkBlock, 33447149, forkBlock, 32000000, forkBlock, forkBlock];

    string addressesJson;
    string tokensJson;
    string sourcesJson;

    //utility mapping to get chainId by name
    mapping(string => string) public chainsByChainId;
    //utility mapping to get indexingChainId by Chain
    mapping(string => string) public indexChainsByChain;

    function createForks() public returns (uint256[] memory) {
        for (uint256 i = 0; i < chains.length; i++) {
            forkIds[chains[i]] = vm.createFork(vm.rpcUrl(chains[i]), blockNumber[i]);
        }
    }

    //gets a dummy signer to be used for an OTC order
    function getSigner() public returns (address, uint) {
        string memory mnemonic = "test test test test test test test test test test test junk";
        uint256 privateKey = vm.deriveKey(mnemonic, 0);

        vm.label(vm.addr(privateKey), "zeroEx/MarketMaker");
        return (vm.addr(privateKey), privateKey);
    }

    //read the uniswapV2 router addresses from file
    function readLiquiditySourceAddresses() internal returns (string memory) {
        string memory root = vm.projectRoot();
        string memory path = string(
            abi.encodePacked(root, "/", "tests/addresses/SourceAddresses.json")
        );
        sourcesJson = vm.readFile(path);
        return vm.readFile(path);
    }

    //retrieve the uniswapV2 router addresses
    function getLiquiditySourceAddresses(uint index) public returns (LiquiditySources memory sources) {
        readLiquiditySourceAddresses();
        bytes memory liquiditySources = sourcesJson.parseRaw(indexChainIds[index]);
        return abi.decode(liquiditySources, (LiquiditySources));
    }

    function readAddresses() internal returns (string memory) {
        string memory root = vm.projectRoot();
        string memory path = string(abi.encodePacked(root, "/", "tests/addresses/ContractAddresses.json"));
        addressesJson = vm.readFile(path);
        return vm.readFile(path);
    }

    //retrieve the 0x Protocol contract addresses from addresses.json
    function getContractAddresses(uint index) public returns (ContractAddresses memory addresses) {
        readAddresses();
        bytes memory contractAddresses = addressesJson.parseRaw(indexChainIds[index]);
        return abi.decode(contractAddresses, (ContractAddresses));
    }

    function readTokens() internal returns (string memory) {
        string memory root = vm.projectRoot();
        string memory path = string(
            abi.encodePacked(root, "/", "tests/addresses/TokenAddresses.json")
        );
        tokensJson = vm.readFile(path);
        return vm.readFile(path);
    }

    //retrieve our tokenList from TokenAddresses.json
    function getTokens(uint index) public returns (TokenAddresses memory addresses) {
        readTokens();
        bytes memory chainTokens = tokensJson.parseRaw(indexChainIds[index]);
        return abi.decode(chainTokens, (TokenAddresses));
    }

    //creates the appropriate bridge adapter based on what chain the tests are currently executing on.
    function createBridgeAdapter(IEtherTokenV06 weth) public returns (IBridgeAdapter bridgeAdapter) {
        uint chainId;

        assembly {
            chainId := chainid()
        }
        if (chainId == 1) {
            return IBridgeAdapter(new EthereumBridgeAdapter(weth));
        } else if (chainId == 56) {
            return IBridgeAdapter(new BSCBridgeAdapter(weth));
        } else if (chainId == 137) {
            return IBridgeAdapter(new PolygonBridgeAdapter(weth));
        } else if (chainId == 43114) {
            return IBridgeAdapter(new AvalancheBridgeAdapter(weth));
        } else if (chainId == 250) {
            return IBridgeAdapter(new FantomBridgeAdapter(weth));
        } else if (chainId == 10) {
            return IBridgeAdapter(new OptimismBridgeAdapter(weth));
        } else if (chainId == 42161) {
            return IBridgeAdapter(new ArbitrumBridgeAdapter(weth));
        }
        else {
            //ERROR: chainId not mapped
            revert("ChainId not supported");
        }
    }

    //label the addresses that are read from the various .json files
    function labelAddresses(
        string memory chainName,
        string memory chainId,
        TokenAddresses memory tokens,
        ContractAddresses memory addresses,
        LiquiditySources memory sources
    ) public {
        log_named_string("   Using contract addresses on chain", chainName);
        vm.label(addresses.transformers.affiliateFeeTransformer, "zeroEx/affiliateFeeTransformer");
        vm.label(addresses.erc20BridgeProxy, "zeroEx/erc20BridgeProxy");
        vm.label(addresses.erc20BridgeSampler, "zeroEx/erc20BridgeSampler");
        vm.label(addresses.etherToken, "zeroEx/etherToken");
        vm.label(addresses.exchangeProxy, "zeroEx/exchangeProxy");
        vm.label(addresses.exchangeProxyFlashWallet, "zeroEx/exchangeProxyFlashWallet");
        vm.label(addresses.exchangeProxyGovernor, "zeroEx/exchangeProxyGovernor");
        vm.label(addresses.exchangeProxyLiquidityProviderSandbox, "zeroEx/exchangeProxyLiquidityProviderSandbox");
        vm.label(addresses.exchangeProxyTransformerDeployer, "zeroEx/exchangeProxyTransformerDeployer");
        vm.label(addresses.transformers.fillQuoteTransformer, "zeroEx/fillQuoteTransformer");
        vm.label(addresses.transformers.payTakerTransformer, "zeroEx/payTakerTransformer");
        vm.label(addresses.transformers.positiveSlippageFeeTransformer, "zeroEx/positiveSlippageFeeTransformer");
        vm.label(addresses.staking, "zeroEx/staking");
        vm.label(addresses.stakingProxy, "zeroEx/stakingProxy");
        vm.label(addresses.transformers.wethTransformer, "zeroEx/wethTransformer");
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

    //deploy a new FillQuoteTransformer
    //executes in the context of the transformerDeployer
    function createNewFQT(
        IEtherTokenV06 wrappedNativeToken,
        address payable exchangeProxy,
        address transformerDeployer
    ) public {
        vm.startPrank(transformerDeployer);
        // deploy a new instance of the bridge adapter from the transformerDeployer
        bridgeAdapter = createBridgeAdapter(IEtherTokenV06(wrappedNativeToken));
        // deploy a new instance of the fill quote transformer from the transformerDeployer
        fillQuoteTransformer = new FillQuoteTransformer(IBridgeAdapter(bridgeAdapter), IZeroEx(exchangeProxy));
        vm.label(address(fillQuoteTransformer), "zeroEx/FillQuoteTransformer");
        vm.stopPrank();
    }

    //utility function to be called in the `setUp()` function of a test
    //creates a fork and retrieves the correct addresses based on chainId
    function _setup() public {
        //get our addresses.json file that defines contract addresses for each chain we are currently deployed on
        string memory root = vm.projectRoot();
        string memory path = string(abi.encodePacked(root, "/", "tests/addresses/ContractAddresses.json"));
        json = vm.readFile(path);
        createForks();

        for (uint256 i = 0; i < chains.length; i++) {
            chainsByChainId[chains[i]] = chainIds[i];
            indexChainsByChain[chains[i]] = indexChainIds[i];
            bytes memory details = json.parseRaw(indexChainIds[i]);
            addresses = abi.decode(details, (ContractAddresses));
        }
    }

    /// @dev Sample sell quotes from UniswapV2.
    /// @param router Router to look up tokens and amounts
    /// @param path Token route. Should be takerToken -> makerToken.
    /// @param takerTokenAmounts Taker token sell amount for each sample.
    /// @return makerTokenAmounts Taker amounts sold at each maker token
    ///         amount.
    function sampleSellsFromUniswapV2(
        address router,
        address[] memory path,
        uint256[] memory takerTokenAmounts
    ) public view returns (uint256[] memory makerTokenAmounts) {
        uint256 numSamples = takerTokenAmounts.length;
        makerTokenAmounts = new uint256[](numSamples);
        for (uint256 i = 0; i < numSamples; i++) {
            try IUniswapV2Router01(router).getAmountsOut(takerTokenAmounts[i], path) returns (
                uint256[] memory amounts
            ) {
                makerTokenAmounts[i] = amounts[path.length - 1];
                // Break early if there are 0 amounts
                if (makerTokenAmounts[i] == 0) {
                    break;
                }
            } catch (bytes memory) {
                // Swallow failures, leaving all results as zero.
                break;
            }
        }
    }

    /// @dev Sample buy quotes from UniswapV2.
    /// @param router Router to look up tokens and amounts
    /// @param path Token route. Should be takerToken -> makerToken.
    /// @param makerTokenAmounts Maker token buy amount for each sample.
    /// @return takerTokenAmounts Taker amounts sold at each maker token
    ///         amount.
    function sampleBuysFromUniswapV2(
        address router,
        address[] memory path,
        uint256[] memory makerTokenAmounts
    ) public view returns (uint256[] memory takerTokenAmounts) {
        uint256 numSamples = makerTokenAmounts.length;
        takerTokenAmounts = new uint256[](numSamples);
        for (uint256 i = 0; i < numSamples; i++) {
            try IUniswapV2Router01(router).getAmountsIn(makerTokenAmounts[i], path) returns (uint256[] memory amounts) {
                takerTokenAmounts[i] = amounts[0];
                // Break early if there are 0 amounts
                if (takerTokenAmounts[i] == 0) {
                    break;
                }
            } catch (bytes memory) {
                // Swallow failures, leaving all results as zero.
                break;
            }
        }
    }

    modifier onlyForked() {
        if (block.number >= 15000000) {
            _;
        } else {
            emit log_string("Requires fork mode, skipping");
        }
    }
}
