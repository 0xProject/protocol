// SPDX-License-Identifier: Apache-2.0
/*
  Copyright 2023 ZeroEx Intl.
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
import "@0x/contracts-erc20/src/IEtherToken.sol";
import "@0x/contracts-erc20/src/IERC20Token.sol";
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
    IERC20Token DAI;
    IERC20Token USDC;
    IERC20Token USDT;
    IEtherToken WrappedNativeToken;
}

// keep the names of the struct members in alphabetical order for correct json unparsing
struct LiquiditySources {
    address KyberElasticPool;
    address KyberElasticQuoter;
    address KyberElasticRouter;
    address TraderJoeV2Quoter;
    address TraderJoeV2Router;
    address UniswapV2Router;
    address UniswapV3Router;
}

interface IFQT {
    function bridgeAdapter() external returns (address);
}

interface ITraderJoeV2Quoter {
    enum Version {
        V1,
        V2,
        V2_1
    }

    struct Quote {
        address[] route;
        address[] pairs;
        uint256[] binSteps;
        Version[] versions;
        uint128[] amounts;
        uint128[] virtualAmountsWithoutSlippage;
        uint128[] fees;
    }

    function findBestPathFromAmountIn(
        address[] calldata route,
        uint128 amountIn
    ) external view returns (Quote memory quote);
}

interface IKyberElasticQuoter {
    function quoteExactInput(
        bytes memory path,
        uint256 amountIn
    )
        external
        returns (
            uint256 amountOut,
            uint160[] memory afterSqrtPList,
            uint32[] memory initializedTicksCrossedList,
            uint256 gasEstimate
        );
}

interface IKyberElasticPool {
    function token0() external view returns (address);

    function token1() external view returns (address);

    /// @notice The fee to be charged for a swap in basis points
    /// @return The swap fee in basis points
    function swapFeeUnits() external view returns (uint24);
}

interface IUniswapV2Router01 {
    function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts);

    function getAmountsIn(uint256 amountOut, address[] calldata path) external view returns (uint256[] memory amounts);
}

interface IUniswapV3QuoterV2 {
    function factory() external view returns (IUniswapV3Factory factory);

    // @notice Returns the amount out received for a given exact input swap without executing the swap
    // @param path The path of the swap, i.e. each token pair and the pool fee
    // @param amountIn The amount of the first token to swap
    // @return amountOut The amount of the last token that would be received
    // @return sqrtPriceX96AfterList List of the sqrt price after the swap for each pool in the path
    // @return initializedTicksCrossedList List of the initialized ticks that the swap crossed for each pool in the path
    // @return gasEstimate The estimate of the gas that the swap consumes
    function quoteExactInput(
        bytes memory path,
        uint256 amountIn
    )
        external
        returns (
            uint256 amountOut,
            uint160[] memory sqrtPriceX96AfterList,
            uint32[] memory initializedTicksCrossedList,
            uint256 gasEstimate
        );

    // @notice Returns the amount in required for a given exact output swap without executing the swap
    // @param path The path of the swap, i.e. each token pair and the pool fee. Path must be provided in reverse order
    // @param amountOut The amount of the last token to receive
    // @return amountIn The amount of first token required to be paid
    // @return sqrtPriceX96AfterList List of the sqrt price after the swap for each pool in the path
    // @return initializedTicksCrossedList List of the initialized ticks that the swap crossed for each pool in the path
    // @return gasEstimate The estimate of the gas that the swap consumes
    function quoteExactOutput(
        bytes memory path,
        uint256 amountOut
    )
        external
        returns (
            uint256 amountIn,
            uint160[] memory sqrtPriceX96AfterList,
            uint32[] memory initializedTicksCrossedList,
            uint256 gasEstimate
        );
}

interface IUniswapV3Factory {
    function getPool(IERC20Token a, IERC20Token b, uint24 fee) external view returns (IUniswapV3Pool pool);
}

interface IUniswapV3Pool {
    function token0() external view returns (IERC20Token);

    function token1() external view returns (IERC20Token);

    function fee() external view returns (uint24);
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

    //read the uniswapV2 router addresses from file
    function readLiquiditySourceAddresses() internal returns (string memory) {
        string memory root = vm.projectRoot();
        string memory path = string(abi.encodePacked(root, "/", "tests/addresses/SourceAddresses.json"));
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
        string memory path = string(abi.encodePacked(root, "/", "tests/addresses/TokenAddresses.json"));
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
    function createBridgeAdapter(IEtherToken weth) public returns (IBridgeAdapter bridgeAdapter) {
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
        } else {
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
        IEtherToken wrappedNativeToken,
        address payable exchangeProxy,
        address transformerDeployer
    ) public {
        vm.startPrank(transformerDeployer);
        // deploy a new instance of the bridge adapter from the transformerDeployer
        bridgeAdapter = createBridgeAdapter(IEtherToken(wrappedNativeToken));
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

    /// @dev Sample sell quotes from UniswapV3.
    /// @param quoter UniswapV3 Quoter contract.
    /// @param path Token route. Should be takerToken -> makerToken (at most two hops).
    /// @param takerTokenAmounts Taker token sell amount for each sample.
    /// @return uniswapPaths The encoded uniswap path for each sample.
    /// @return uniswapGasUsed Estimated amount of gas used
    /// @return makerTokenAmounts Maker amounts bought at each taker token amount.
    function sampleSellsFromUniswapV3(
        IUniswapV3QuoterV2 quoter,
        IERC20Token[] memory path,
        uint256[] memory takerTokenAmounts
    )
        public
        returns (bytes[] memory uniswapPaths, uint256[] memory uniswapGasUsed, uint256[] memory makerTokenAmounts)
    {
        IUniswapV3Pool[][] memory poolPaths = _getPoolPaths(
            quoter,
            path,
            takerTokenAmounts[takerTokenAmounts.length - 1]
        );

        makerTokenAmounts = new uint256[](takerTokenAmounts.length);
        uniswapPaths = new bytes[](takerTokenAmounts.length);
        uniswapGasUsed = new uint256[](takerTokenAmounts.length);

        for (uint256 i = 0; i < takerTokenAmounts.length; ++i) {
            // Pick the best result from the pool paths.
            uint256 topBuyAmount = 0;
            for (uint256 j = 0; j < poolPaths.length; ++j) {
                if (!isValidPoolPath(poolPaths[j])) {
                    continue;
                }

                bytes memory uniswapPath = _toUniswapPath(path, poolPaths[j]);
                try quoter.quoteExactInput(uniswapPath, takerTokenAmounts[i]) returns (
                    uint256 buyAmount,
                    uint160[] memory /* sqrtPriceX96AfterList */,
                    uint32[] memory /* initializedTicksCrossedList */,
                    uint256 gasUsed
                ) {
                    if (topBuyAmount <= buyAmount) {
                        topBuyAmount = buyAmount;
                        uniswapPaths[i] = uniswapPath;
                        uniswapGasUsed[i] = gasUsed;
                    }
                } catch {}
            }
            // Break early if we can't complete the sells.
            if (topBuyAmount == 0) {
                // HACK(kimpers): To avoid too many local variables, paths and gas used is set directly in the loop
                // then reset if no valid valid quote was found
                uniswapPaths[i] = "";
                uniswapGasUsed[i] = 0;
                break;
            }
            makerTokenAmounts[i] = topBuyAmount;
        }
    }

    /// @dev Sample buy quotes from UniswapV3.
    /// @param quoter UniswapV3 Quoter contract.
    /// @param path Token route. Should be takerToken -> makerToken (at most two hops).
    /// @param makerTokenAmounts Maker token buy amount for each sample.
    /// @return uniswapPaths The encoded uniswap path for each sample.
    /// @return uniswapGasUsed Estimated amount of gas used
    /// @return takerTokenAmounts Taker amounts sold at each maker token amount.
    function sampleBuysFromUniswapV3(
        IUniswapV3QuoterV2 quoter,
        IERC20Token[] memory path,
        uint256[] memory makerTokenAmounts
    )
        public
        returns (bytes[] memory uniswapPaths, uint256[] memory uniswapGasUsed, uint256[] memory takerTokenAmounts)
    {
        IERC20Token[] memory reversedPath = _reverseTokenPath(path);
        IUniswapV3Pool[][] memory poolPaths = _getPoolPaths(
            quoter,
            reversedPath,
            makerTokenAmounts[makerTokenAmounts.length - 1]
        );

        takerTokenAmounts = new uint256[](makerTokenAmounts.length);
        uniswapPaths = new bytes[](makerTokenAmounts.length);
        uniswapGasUsed = new uint256[](makerTokenAmounts.length);

        for (uint256 i = 0; i < makerTokenAmounts.length; ++i) {
            // Pick the best result from the pool paths.
            uint256 topSellAmount = 0;
            for (uint256 j = 0; j < poolPaths.length; ++j) {
                if (!isValidPoolPath(poolPaths[j])) {
                    continue;
                }

                // quoter requires path to be reversed for buys.
                bytes memory uniswapPath = _toUniswapPath(reversedPath, poolPaths[j]);
                try quoter.quoteExactOutput(uniswapPath, makerTokenAmounts[i]) returns (
                    uint256 sellAmount,
                    uint160[] memory /* sqrtPriceX96AfterList */,
                    uint32[] memory /* initializedTicksCrossedList */,
                    uint256 gasUsed
                ) {
                    if (topSellAmount == 0 || topSellAmount >= sellAmount) {
                        topSellAmount = sellAmount;
                        // But the output path should still be encoded for sells.
                        uniswapPaths[i] = _toUniswapPath(path, _reversePoolPath(poolPaths[j]));
                        uniswapGasUsed[i] = gasUsed;
                    }
                } catch {}
            }
            // Break early if we can't complete the buys.
            if (topSellAmount == 0) {
                // HACK(kimpers): To avoid too many local variables, paths and gas used is set directly in the loop
                // then reset if no valid valid quote was found
                uniswapPaths[i] = "";
                uniswapGasUsed[i] = 0;
                break;
            }
            takerTokenAmounts[i] = topSellAmount;
        }
    }

    function _getPoolPaths(
        IUniswapV3QuoterV2 quoter,
        IERC20Token[] memory path,
        uint256 inputAmount
    ) private returns (IUniswapV3Pool[][] memory poolPaths) {
        if (path.length == 2) {
            return _getPoolPathSingleHop(quoter, path, inputAmount);
        }
        if (path.length == 3) {
            return _getPoolPathTwoHop(quoter, path, inputAmount);
        }
        revert("UniswapV3Sampler/unsupported token path length");
    }

    function _getPoolPathSingleHop(
        IUniswapV3QuoterV2 quoter,
        IERC20Token[] memory path,
        uint256 inputAmount
    ) public returns (IUniswapV3Pool[][] memory poolPaths) {
        poolPaths = new IUniswapV3Pool[][](2);
        (IUniswapV3Pool[2] memory topPools, ) = _getTopTwoPools(
            quoter,
            quoter.factory(),
            path[0],
            path[1],
            inputAmount
        );

        uint256 pathCount = 0;
        for (uint256 i = 0; i < 2; i++) {
            IUniswapV3Pool topPool = topPools[i];
            poolPaths[pathCount] = new IUniswapV3Pool[](1);
            poolPaths[pathCount][0] = topPool;
            pathCount++;
        }
    }

    function _getPoolPathTwoHop(
        IUniswapV3QuoterV2 quoter,
        IERC20Token[] memory path,
        uint256 inputAmount
    ) private returns (IUniswapV3Pool[][] memory poolPaths) {
        IUniswapV3Factory factory = quoter.factory();
        poolPaths = new IUniswapV3Pool[][](4);
        (IUniswapV3Pool[2] memory firstHopTopPools, uint256[2] memory firstHopAmounts) = _getTopTwoPools(
            quoter,
            factory,
            path[0],
            path[1],
            inputAmount
        );
        (IUniswapV3Pool[2] memory secondHopTopPools, ) = _getTopTwoPools(
            quoter,
            factory,
            path[1],
            path[2],
            firstHopAmounts[0]
        );

        uint256 pathCount = 0;
        for (uint256 i = 0; i < 2; i++) {
            for (uint256 j = 0; j < 2; j++) {
                poolPaths[pathCount] = new IUniswapV3Pool[](2);
                IUniswapV3Pool[] memory currentPath = poolPaths[pathCount];
                currentPath[0] = firstHopTopPools[i];
                currentPath[1] = secondHopTopPools[j];
                pathCount++;
            }
        }
    }

    /// @dev Returns top 0-2 pools and corresponding output amounts based on swaping `inputAmount`.
    /// Addresses in `topPools` can be zero addresses when there are pool isn't available.
    function _getTopTwoPools(
        IUniswapV3QuoterV2 quoter,
        IUniswapV3Factory factory,
        IERC20Token inputToken,
        IERC20Token outputToken,
        uint256 inputAmount
    ) private returns (IUniswapV3Pool[2] memory topPools, uint256[2] memory outputAmounts) {
        IERC20Token[] memory path = new IERC20Token[](2);
        path[0] = inputToken;
        path[1] = outputToken;

        uint24[4] memory validPoolFees = [uint24(0.0001e6), uint24(0.0005e6), uint24(0.003e6), uint24(0.01e6)];
        for (uint256 i = 0; i < validPoolFees.length; ++i) {
            IUniswapV3Pool pool = factory.getPool(inputToken, outputToken, validPoolFees[i]);
            if (!_isValidPool(pool)) {
                continue;
            }

            IUniswapV3Pool[] memory poolPath = new IUniswapV3Pool[](1);
            poolPath[0] = pool;
            bytes memory uniswapPath = _toUniswapPath(path, poolPath);
            try quoter.quoteExactInput(uniswapPath, inputAmount) returns (
                uint256 outputAmount,
                uint160[] memory /* sqrtPriceX96AfterList */,
                uint32[] memory /* initializedTicksCrossedList */,
                uint256 /* gasUsed */
            ) {
                // Keeping track of the top 2 pools.
                if (outputAmount > outputAmounts[0]) {
                    outputAmounts[1] = outputAmounts[0];
                    topPools[1] = topPools[0];
                    outputAmounts[0] = outputAmount;
                    topPools[0] = pool;
                } else if (outputAmount > outputAmounts[1]) {
                    outputAmounts[1] = outputAmount;
                    topPools[1] = pool;
                }
            } catch {}
        }
    }

    function _reverseTokenPath(IERC20Token[] memory tokenPath) private pure returns (IERC20Token[] memory reversed) {
        reversed = new IERC20Token[](tokenPath.length);
        for (uint256 i = 0; i < tokenPath.length; ++i) {
            reversed[i] = tokenPath[tokenPath.length - i - 1];
        }
    }

    function _reversePoolPath(
        IUniswapV3Pool[] memory poolPath
    ) private pure returns (IUniswapV3Pool[] memory reversed) {
        reversed = new IUniswapV3Pool[](poolPath.length);
        for (uint256 i = 0; i < poolPath.length; ++i) {
            reversed[i] = poolPath[poolPath.length - i - 1];
        }
    }

    function _isValidPool(IUniswapV3Pool pool) private view returns (bool isValid) {
        // Check if it has been deployed.
        {
            uint256 codeSize;
            assembly {
                codeSize := extcodesize(pool)
            }
            if (codeSize == 0) {
                return false;
            }
        }
        // Must have a balance of both tokens.
        if (pool.token0().balanceOf(address(pool)) == 0) {
            return false;
        }
        if (pool.token1().balanceOf(address(pool)) == 0) {
            return false;
        }
        return true;
    }

    function isValidPoolPath(IUniswapV3Pool[] memory poolPaths) private pure returns (bool) {
        for (uint256 i = 0; i < poolPaths.length; i++) {
            if (address(poolPaths[i]) == address(0)) {
                return false;
            }
        }
        return true;
    }

    function _toUniswapPath(
        IERC20Token[] memory tokenPath,
        IUniswapV3Pool[] memory poolPath
    ) private view returns (bytes memory uniswapPath) {
        require(
            tokenPath.length >= 2 && tokenPath.length == poolPath.length + 1,
            "UniswapV3Sampler/invalid path lengths"
        );
        // Uniswap paths are tightly packed as:
        // [token0, token0token1PairFee, token1, token1Token2PairFee, token2, ...]
        uniswapPath = new bytes(tokenPath.length * 20 + poolPath.length * 3);
        uint256 o;
        assembly {
            o := add(uniswapPath, 32)
        }
        for (uint256 i = 0; i < tokenPath.length; ++i) {
            if (i > 0) {
                uint24 poolFee = poolPath[i - 1].fee();
                assembly {
                    mstore(o, shl(232, poolFee))
                    o := add(o, 3)
                }
            }
            IERC20Token token = tokenPath[i];
            assembly {
                mstore(o, shl(96, token))
                o := add(o, 20)
            }
        }
    }

    function _toKyberElasticPath(
        address[] memory tokenPath,
        address[] memory poolPath
    ) internal returns (bytes memory path) {
        require(tokenPath.length >= 2 && tokenPath.length == poolPath.length + 1, "invalid path lengths");
        // paths are tightly packed as:
        // [token0, token0token1PairFee, token1, token1Token2PairFee, token2, ...]
        path = new bytes(tokenPath.length * 20 + poolPath.length * 3);
        uint256 o;
        assembly {
            o := add(path, 32)
        }
        for (uint256 i = 0; i < tokenPath.length; ++i) {
            if (i > 0) {
                uint24 poolFee = IKyberElasticPool(poolPath[i - 1]).swapFeeUnits();
                assembly {
                    mstore(o, shl(232, poolFee))
                    o := add(o, 3)
                }
            }
            address token = tokenPath[i];
            assembly {
                mstore(o, shl(96, token))
                o := add(o, 20)
            }
        }
    }

    modifier onlyForked() {
        if (block.number >= 15000000) {
            _;
        } else {
            revert("Requires fork mode");
        }
    }

    function writeTokenBalance(address who, address token, uint256 amt) internal {
        stdstore.target(token).sig(IERC20Token(token).balanceOf.selector).with_key(who).checked_write(amt);
    }
}
