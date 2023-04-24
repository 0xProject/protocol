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

import "src/IZeroEx.sol";
import "src/ZeroEx.sol";
import "src/migrations/InitialMigration.sol";
import "src/features/OwnableFeature.sol";
import "src/features/SimpleFunctionRegistryFeature.sol";
import "src/features/NativeOrdersFeature.sol";
import "src/features/BatchFillNativeOrdersFeature.sol";
import "src/features/FundRecoveryFeature.sol";
import "src/features/TransformERC20Feature.sol";
import "src/features/OtcOrdersFeature.sol";
import "src/features/MetaTransactionsFeature.sol";
import "src/features/MetaTransactionsFeatureV2.sol";
import "src/features/nft_orders/ERC1155OrdersFeature.sol";
import "src/features/nft_orders/ERC721OrdersFeature.sol";
import "src/features/UniswapFeature.sol";
import "src/features/UniswapV3Feature.sol";
import "src/features/multiplex/MultiplexFeature.sol";
import "src/external/TransformerDeployer.sol";
import "src/external/FeeCollectorController.sol";
import "src/external/LiquidityProviderSandbox.sol";
import "src/transformers/WethTransformer.sol";
import "src/transformers/FillQuoteTransformer.sol";
import "src/transformers/PayTakerTransformer.sol";
import "src/transformers/AffiliateFeeTransformer.sol";
import "src/transformers/PositiveSlippageFeeTransformer.sol";
import "src/transformers/bridges/IBridgeAdapter.sol";
import "src/transformers/bridges/EthereumBridgeAdapter.sol";

import "@0x/contracts-erc20/src/IEtherToken.sol";
import "@0x/contracts-erc20/src/v06/WETH9V06.sol";

contract DeployZeroEx is Test {
    ZeroEx public ZERO_EX = ZeroEx(0xDef1C0ded9bec7F1a1670819833240f027b25EfF);
    IZeroEx public IZERO_EX = IZeroEx(address(ZERO_EX));
    address VANITY_DEPLOYER_ADDRESS = 0xe750ad66DE350F8110E305fb78Ec6A9f594445E3;
    /* solhint-disable max-line-length */
    bytes deployerBytecode =
        hex"608060405234801561001057600080fd5b506040516103da3803806103da83398101604081905261002f91610077565b8060405161003c9061006a565b610046919061011f565b604051809103906000f080158015610062573d6000803e3d6000fd5b505050610198565b6101f5806101e583390190565b600060208284031215610088578081fd5b81516001600160401b038082111561009e578283fd5b818401915084601f8301126100b1578283fd5b8151818111156100c3576100c3610182565b604051601f8201601f19908116603f011681019083821181831017156100eb576100eb610182565b81604052828152876020848701011115610103578586fd5b610114836020830160208801610152565b979650505050505050565b600060208252825180602084015261013e816040850160208701610152565b601f01601f19169190910160400192915050565b60005b8381101561016d578181015183820152602001610155565b8381111561017c576000848401525b50505050565b634e487b7160e01b600052604160045260246000fd5b603f806101a66000396000f3fe6080604052600080fdfea26469706673582212201bd8b1a777b100d67435ca4bb0b2fdccb13a2c2dde019b227bb553ff9a95bd4464736f6c63430008020033608060405234801561001057600080fd5b506040516101f53803806101f583398101604081905261002f916100c9565b60008151602083016000f090506001600160a01b0381166100865760405162461bcd60e51b815260206004820152600d60248201526c1111541313d657d19052531151609a1b604482015260640160405180910390fd5b6040516001600160a01b03821681527ff40fcec21964ffb566044d083b4073f29f7f7929110ea19e1b3ebe375d89055e9060200160405180910390a150506101a8565b600060208083850312156100db578182fd5b82516001600160401b03808211156100f1578384fd5b818501915085601f830112610104578384fd5b81518181111561011657610116610192565b604051601f8201601f19908116603f0116810190838211818310171561013e5761013e610192565b816040528281528886848701011115610155578687fd5b8693505b828410156101765784840186015181850187015292850192610159565b8284111561018657868684830101525b98975050505050505050565b634e487b7160e01b600052604160045260246000fd5b603f806101b66000396000f3fe6080604052600080fdfea2646970667358221220fbca036a163ed7f008cefa7c834d98d25109a456a051d41d9c89d55d7185d12b64736f6c63430008020033";
    /* solhint-enable max-line-length */
    address[] transformerSigners = [address(this)];

    bool isDeployed = false;

    struct Features {
        NativeOrdersFeature nativeOrdersFeature;
        BatchFillNativeOrdersFeature batchFillNativeOrdersFeature;
        OtcOrdersFeature otcOrdersFeature;
        UniswapFeature uniswapFeature;
        UniswapV3Feature uniswapV3Feature;
        FundRecoveryFeature fundRecoveryFeature;
        TransformERC20Feature transformERC20Feature;
        MetaTransactionsFeature metaTransactionsFeature;
        MetaTransactionsFeatureV2 metaTransactionsFeatureV2;
        ERC1155OrdersFeature erc1155OrdersFeature;
        ERC721OrdersFeature erc721OrdersFeature;
        MultiplexFeature multiplexFeature;
    }

    struct Transformers {
        FillQuoteTransformer fillQuoteTransformer;
        WethTransformer wethTransformer;
        AffiliateFeeTransformer affiliateFeeTransformer;
        PayTakerTransformer payTakerTransformer;
    }

    struct ZeroExDeployed {
        IZeroEx zeroEx;
        TransformerDeployer transformerDeployer;
        FeeCollectorController feeCollectorController;
        IStaking staking; // address(0)
        Features features;
        Transformers transformers;
        IEtherToken weth;
    }

    ZeroExDeployed ZERO_EX_DEPLOYED;

    struct ZeroExDeployConfiguration {
        address uniswapFactory;
        address sushiswapFactory;
        address uniswapV3Factory;
        bytes32 uniswapPairInitCodeHash;
        bytes32 sushiswapPairInitCodeHash;
        bytes32 uniswapV3PoolInitCodeHash;
        bool logDeployed;
    }

    ZeroExDeployConfiguration ZERO_EX_DEPLOY_CONFIG;

    constructor(ZeroExDeployConfiguration memory configuration) public {
        ZERO_EX_DEPLOY_CONFIG = configuration;
    }

    function getDeployedZeroEx() public returns (ZeroExDeployed memory) {
        if (!isDeployed) {
            deployZeroEx();
        }
        return ZERO_EX_DEPLOYED;
    }

    function logDeployedZeroEx() public {
        emit log_string("--- Deployed ZeroEx ---");
        emit log_named_address("ZeroEx", address(ZERO_EX));
        emit log_named_address("TransformerDeployer", address(ZERO_EX_DEPLOYED.transformerDeployer));
        emit log_named_address("FeeCollectorController", address(ZERO_EX_DEPLOYED.feeCollectorController));
        emit log_named_address("Staking", address(ZERO_EX_DEPLOYED.staking));

        emit log_string("----- Features -----");
        emit log_named_address("NativeOrdersFeature", address(ZERO_EX_DEPLOYED.features.nativeOrdersFeature));
        emit log_named_address(
            "BatchFillNativeOrdersFeature",
            address(ZERO_EX_DEPLOYED.features.batchFillNativeOrdersFeature)
        );
        emit log_named_address("OtcOrdersFeature", address(ZERO_EX_DEPLOYED.features.otcOrdersFeature));
        emit log_named_address("UniswapFeature", address(ZERO_EX_DEPLOYED.features.uniswapFeature));
        emit log_named_address("UniswapV3Feature", address(ZERO_EX_DEPLOYED.features.uniswapV3Feature));
        emit log_named_address("FundRecoveryFeature", address(ZERO_EX_DEPLOYED.features.fundRecoveryFeature));
        emit log_named_address("MetaTransactionsFeature", address(ZERO_EX_DEPLOYED.features.metaTransactionsFeature));
        emit log_named_address(
            "MetaTransactionsFeatureV2",
            address(ZERO_EX_DEPLOYED.features.metaTransactionsFeatureV2)
        );
        emit log_named_address("ERC1155OrdersFeature", address(ZERO_EX_DEPLOYED.features.erc1155OrdersFeature));
        emit log_named_address("ERC721OrdersFeature", address(ZERO_EX_DEPLOYED.features.erc721OrdersFeature));
        emit log_named_address("TransformERC20Feature", address(ZERO_EX_DEPLOYED.features.transformERC20Feature));
        emit log_named_address("MultiplexFeature", address(ZERO_EX_DEPLOYED.features.multiplexFeature));

        emit log_string("----- Transformers -----");
        emit log_named_address("FillQuoteTransformer", address(ZERO_EX_DEPLOYED.transformers.fillQuoteTransformer));
        emit log_named_address("WethTransformer", address(ZERO_EX_DEPLOYED.transformers.wethTransformer));
        emit log_named_address(
            "AffiliateFeeTransformer",
            address(ZERO_EX_DEPLOYED.transformers.affiliateFeeTransformer)
        );
        emit log_named_address("PayTakerTransformer", address(ZERO_EX_DEPLOYED.transformers.payTakerTransformer));

        emit log_string("----- Other -----");
        emit log_named_address("WETH", address(ZERO_EX_DEPLOYED.weth));
    }

    function deployZeroEx() public returns (ZeroExDeployed memory) {
        if (isDeployed) {
            return ZERO_EX_DEPLOYED;
        }

        ZERO_EX_DEPLOYED.weth = IEtherToken(address(new WETH9V06()));
        InitialMigration initialMigration = new InitialMigration(address(this));
        // Append the required ZeroEx constructor arguments (address bootstrapper)
        bytes memory zeroExDeploycode = abi.encodePacked(type(ZeroEx).creationCode, abi.encode(initialMigration));
        // Append the required deployer code constructor arguments (bytes initCode)
        bytes memory deployerDeploycode = abi.encodePacked(deployerBytecode, abi.encode(zeroExDeploycode));
        // HERE BE DRAGONS, feel free to ignore this for now
        // We want to deploy the ZeroEx contract, at 0xDef1C0ded9bec7F1a1670819833240f027b25EfF

        // We use a special mechanism to deploy the ZeroEx contract.
        // Must occur from this address as the first transaction
        // The address is technically emitted in an event, but we know we did it correctly
        //│   │   ├─  emit topic 0: 0xf40fcec21964ffb566044d083b4073f29f7f7929110ea19e1b3ebe375d89055e
        //│   │   │           data: 0x000000000000000000000000def1c0ded9bec7f1a1670819833240f027b25eff
        hoax(VANITY_DEPLOYER_ADDRESS);
        assembly {
            pop(create(0, add(deployerDeploycode, 0x20), mload(deployerDeploycode)))
        }
        // Staking = address(0);
        ZERO_EX_DEPLOYED.staking = IStaking(address(0));
        ZERO_EX_DEPLOYED.transformerDeployer = new TransformerDeployer(transformerSigners);
        ZERO_EX_DEPLOYED.feeCollectorController = new FeeCollectorController(
            IEtherToken(ZERO_EX_DEPLOYED.weth),
            IStaking(ZERO_EX_DEPLOYED.staking)
        );

        // Features
        ZERO_EX_DEPLOYED.features.transformERC20Feature = new TransformERC20Feature();
        ZERO_EX_DEPLOYED.features.nativeOrdersFeature = new NativeOrdersFeature(
            address(ZERO_EX), // EP address
            ZERO_EX_DEPLOYED.weth,
            ZERO_EX_DEPLOYED.staking,
            ZERO_EX_DEPLOYED.feeCollectorController, // feeCollectorController address
            uint32(0) // protocolFeeMultiplier
        );
        ZERO_EX_DEPLOYED.features.batchFillNativeOrdersFeature = new BatchFillNativeOrdersFeature(address(ZERO_EX));
        ZERO_EX_DEPLOYED.features.otcOrdersFeature = new OtcOrdersFeature(address(ZERO_EX), ZERO_EX_DEPLOYED.weth);
        ZERO_EX_DEPLOYED.features.uniswapFeature = new UniswapFeature(ZERO_EX_DEPLOYED.weth);
        ZERO_EX_DEPLOYED.features.uniswapV3Feature = new UniswapV3Feature(
            ZERO_EX_DEPLOYED.weth,
            ZERO_EX_DEPLOY_CONFIG.uniswapV3Factory,
            ZERO_EX_DEPLOY_CONFIG.uniswapV3PoolInitCodeHash
        );
        ZERO_EX_DEPLOYED.features.fundRecoveryFeature = new FundRecoveryFeature();
        ZERO_EX_DEPLOYED.features.metaTransactionsFeature = new MetaTransactionsFeature(address(ZERO_EX));
        ZERO_EX_DEPLOYED.features.metaTransactionsFeatureV2 = new MetaTransactionsFeatureV2(
            address(ZERO_EX),
            ZERO_EX_DEPLOYED.weth
        );
        ZERO_EX_DEPLOYED.features.erc1155OrdersFeature = new ERC1155OrdersFeature(
            address(ZERO_EX),
            ZERO_EX_DEPLOYED.weth
        );
        ZERO_EX_DEPLOYED.features.erc721OrdersFeature = new ERC721OrdersFeature(
            address(ZERO_EX),
            ZERO_EX_DEPLOYED.weth
        );
        ZERO_EX_DEPLOYED.features.multiplexFeature = new MultiplexFeature(
            address(ZERO_EX),
            ZERO_EX_DEPLOYED.weth,
            new LiquidityProviderSandbox(address(ZERO_EX)),
            ZERO_EX_DEPLOY_CONFIG.uniswapFactory,
            ZERO_EX_DEPLOY_CONFIG.sushiswapFactory,
            ZERO_EX_DEPLOY_CONFIG.uniswapPairInitCodeHash,
            ZERO_EX_DEPLOY_CONFIG.sushiswapPairInitCodeHash
        );

        initialMigration.initializeZeroEx(
            payable(address(this)),
            ZERO_EX,
            InitialMigration.BootstrapFeatures({
                registry: new SimpleFunctionRegistryFeature(),
                ownable: new OwnableFeature()
            })
        );
        IZERO_EX.migrate(
            address(ZERO_EX_DEPLOYED.features.batchFillNativeOrdersFeature),
            abi.encodeWithSelector(BatchFillNativeOrdersFeature.migrate.selector),
            address(this)
        );
        IZERO_EX.migrate(
            address(ZERO_EX_DEPLOYED.features.transformERC20Feature),
            abi.encodeWithSelector(
                TransformERC20Feature.migrate.selector,
                address(ZERO_EX_DEPLOYED.transformerDeployer)
            ),
            address(this)
        );
        IZERO_EX.migrate(
            address(ZERO_EX_DEPLOYED.features.nativeOrdersFeature),
            abi.encodeWithSelector(NativeOrdersFeature.migrate.selector),
            address(this)
        );
        IZERO_EX.migrate(
            address(ZERO_EX_DEPLOYED.features.otcOrdersFeature),
            abi.encodeWithSelector(OtcOrdersFeature.migrate.selector),
            address(this)
        );
        IZERO_EX.migrate(
            address(ZERO_EX_DEPLOYED.features.uniswapFeature),
            abi.encodeWithSelector(UniswapFeature.migrate.selector),
            address(this)
        );
        IZERO_EX.migrate(
            address(ZERO_EX_DEPLOYED.features.uniswapV3Feature),
            abi.encodeWithSelector(UniswapV3Feature.migrate.selector),
            address(this)
        );
        IZERO_EX.migrate(
            address(ZERO_EX_DEPLOYED.features.fundRecoveryFeature),
            abi.encodeWithSelector(FundRecoveryFeature.migrate.selector),
            address(this)
        );
        IZERO_EX.migrate(
            address(ZERO_EX_DEPLOYED.features.metaTransactionsFeature),
            abi.encodeWithSelector(MetaTransactionsFeature.migrate.selector),
            address(this)
        );
        IZERO_EX.migrate(
            address(ZERO_EX_DEPLOYED.features.metaTransactionsFeatureV2),
            abi.encodeWithSelector(MetaTransactionsFeatureV2.migrate.selector),
            address(this)
        );
        IZERO_EX.migrate(
            address(ZERO_EX_DEPLOYED.features.erc1155OrdersFeature),
            abi.encodeWithSelector(ERC1155OrdersFeature.migrate.selector),
            address(this)
        );
        IZERO_EX.migrate(
            address(ZERO_EX_DEPLOYED.features.erc721OrdersFeature),
            abi.encodeWithSelector(ERC721OrdersFeature.migrate.selector),
            address(this)
        );
        IZERO_EX.migrate(
            address(ZERO_EX_DEPLOYED.features.multiplexFeature),
            abi.encodeWithSelector(MultiplexFeature.migrate.selector),
            address(this)
        );

        // Transformers
        ZERO_EX_DEPLOYED.transformers.wethTransformer = WethTransformer(
            ZERO_EX_DEPLOYED.transformerDeployer.deploy(
                abi.encodePacked(
                    // Deploy the WethTransformer code
                    type(WethTransformer).creationCode,
                    // WethTransformer takes WETH address as a constructor argument
                    abi.encode(address(ZERO_EX_DEPLOYED.weth))
                )
            )
        );

        // Deploy the FQT, NOTE: No bridge adapter in tests
        ZERO_EX_DEPLOYED.transformers.fillQuoteTransformer = FillQuoteTransformer(
            ZERO_EX_DEPLOYED.transformerDeployer.deploy(
                abi.encodePacked(
                    // Deploy the FQT code
                    type(FillQuoteTransformer).creationCode,
                    // FQT takes a BridgeAdapter and ZeroEx
                    abi.encode(
                        address(0), // Note: No BridgeAdapter in tests
                        INativeOrdersFeature(address(ZERO_EX))
                    )
                )
            )
        );

        ZERO_EX_DEPLOYED.transformers.affiliateFeeTransformer = AffiliateFeeTransformer(
            ZERO_EX_DEPLOYED.transformerDeployer.deploy(type(AffiliateFeeTransformer).creationCode)
        );

        ZERO_EX_DEPLOYED.transformers.payTakerTransformer = PayTakerTransformer(
            ZERO_EX_DEPLOYED.transformerDeployer.deploy(type(PayTakerTransformer).creationCode)
        );

        ZERO_EX_DEPLOYED.zeroEx = IZERO_EX;
        isDeployed = true;
        if (ZERO_EX_DEPLOY_CONFIG.logDeployed) {
            logDeployedZeroEx();
        }

        return ZERO_EX_DEPLOYED;
    }
}
