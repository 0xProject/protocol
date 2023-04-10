// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.5;

pragma experimental ABIEncoderV2;

import "forge-std/Script.sol";
import "forge-std/console.sol";

import "@0x/contracts-erc20/src/IEtherToken.sol";
import "../contracts/src/external/ILiquidityProviderSandbox.sol";
import '../contracts/src/features/interfaces/IMetaTransactionsFeatureV2.sol';
import '../contracts/src/features/interfaces/IMultiplexFeature.sol';
import '../contracts/src/features/interfaces/IUniswapV3Feature.sol';
import '../contracts/src/features/MetaTransactionsFeatureV2.sol';
import '../contracts/src/features/UniswapV3Feature.sol';
import '../contracts/src/features/multiplex/MultiplexFeature.sol';

contract ContractScript is Script {
    struct ChainConfig {
        address zeroExAddress;
        address wethAddress;
        address liquidityProviderSandbox;
        address uniswapV3Factory;
        address uniswapV2Factory;
        address sushiswapFactory;
        bytes32 uniswapV3PoolInitCodeHash;
        bytes32 uniswapV2PairInitCodeHash;
        bytes32 sushiswapPairInitCodeHash;
    }

    function _getChainConfig() internal pure returns (ChainConfig memory) {
        uint256 chainId;
        assembly {
            chainId := chainid()
        }
        if (chainId == 1) { // Ethereum
            ChainConfig memory chainConfig = ChainConfig(
                0xDef1C0ded9bec7F1a1670819833240f027b25EfF, // 0x EP
                0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2, // weth address
                0x407B4128E9eCaD8769B2332312a9F655cB9F5F3A, // LP sandbox
                0x1F98431c8aD98523631AE4a59f267346ea31F984, // uniswapv3
                0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f, // uniswapv2
                0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac, // sushiswap
                bytes32(0xe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54),
                bytes32(0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f),
                bytes32(0xe18a34eb0e04b04f7a0ac29a6e80748dca96319b42c54d679cb821dca90c6303)
            );
            return chainConfig;
        }
        if (chainId == 137) { // polygon
            ChainConfig memory chainConfig = ChainConfig(
                0xDef1C0ded9bec7F1a1670819833240f027b25EfF, // 0x EP
                0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270, // wmatic address
                0x4Dd97080aDf36103bD3db822f9d3c0e44890fd69, // LP sandbox
                0x1F98431c8aD98523631AE4a59f267346ea31F984, // uniswapv3
                0xc35DADB65012eC5796536bD9864eD8773aBc74C4, // sushiswap (there is no uniswapv2 on polygon)
                0xc35DADB65012eC5796536bD9864eD8773aBc74C4, // sushiswap
                bytes32(0xe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54),
                bytes32(0xe18a34eb0e04b04f7a0ac29a6e80748dca96319b42c54d679cb821dca90c6303),
                bytes32(0xe18a34eb0e04b04f7a0ac29a6e80748dca96319b42c54d679cb821dca90c6303)
            );
            return chainConfig;
        }

        revert("unsupported chain");
    }

    function run() public {
        ChainConfig memory chainConfig = _getChainConfig();

        vm.startBroadcast();
        
        MetaTransactionsFeatureV2 mtx = new MetaTransactionsFeatureV2(chainConfig.zeroExAddress, IEtherToken(chainConfig.wethAddress));
        console.log("MetaTransactionsFeatureV2 address:", address(mtx));

        UniswapV3Feature uni = new UniswapV3Feature(
            IEtherToken(chainConfig.wethAddress), 
            chainConfig.uniswapV3Factory, 
            chainConfig.uniswapV3PoolInitCodeHash
        );
        console.log("UniswapV3Feature address:", address(uni));

        MultiplexFeature multi = new MultiplexFeature(
            chainConfig.zeroExAddress, 
            IEtherToken(chainConfig.wethAddress), 
            ILiquidityProviderSandbox(chainConfig.liquidityProviderSandbox), 
            chainConfig.uniswapV2Factory, 
            chainConfig.sushiswapFactory, 
            chainConfig.uniswapV2PairInitCodeHash, 
            chainConfig.sushiswapPairInitCodeHash
        );
        console.log("MultiplexFeature address:", address(multi));

        vm.stopBroadcast();
    }
}