/*
 * -----------------------------------------------------------------------------
 * Warning: This file is auto-generated by contracts-gen. Don't edit manually.
 * -----------------------------------------------------------------------------
 */
import { ContractArtifact } from 'ethereum-types';

import * as AffiliateFeeTransformer from '../test/generated-artifacts/AffiliateFeeTransformer.json';
import * as AllowanceTarget from '../test/generated-artifacts/AllowanceTarget.json';
import * as BootstrapFeature from '../test/generated-artifacts/BootstrapFeature.json';
import * as BridgeAdapter from '../test/generated-artifacts/BridgeAdapter.json';
import * as BridgeSource from '../test/generated-artifacts/BridgeSource.json';
import * as CurveLiquidityProvider from '../test/generated-artifacts/CurveLiquidityProvider.json';
import * as FeeCollector from '../test/generated-artifacts/FeeCollector.json';
import * as FeeCollectorController from '../test/generated-artifacts/FeeCollectorController.json';
import * as FillQuoteTransformer from '../test/generated-artifacts/FillQuoteTransformer.json';
import * as FixinCommon from '../test/generated-artifacts/FixinCommon.json';
import * as FixinEIP712 from '../test/generated-artifacts/FixinEIP712.json';
import * as FixinProtocolFees from '../test/generated-artifacts/FixinProtocolFees.json';
import * as FixinReentrancyGuard from '../test/generated-artifacts/FixinReentrancyGuard.json';
import * as FixinTokenSpender from '../test/generated-artifacts/FixinTokenSpender.json';
import * as FlashWallet from '../test/generated-artifacts/FlashWallet.json';
import * as FullMigration from '../test/generated-artifacts/FullMigration.json';
import * as IAllowanceTarget from '../test/generated-artifacts/IAllowanceTarget.json';
import * as IBootstrapFeature from '../test/generated-artifacts/IBootstrapFeature.json';
import * as IBridgeAdapter from '../test/generated-artifacts/IBridgeAdapter.json';
import * as IERC20Bridge from '../test/generated-artifacts/IERC20Bridge.json';
import * as IERC20Transformer from '../test/generated-artifacts/IERC20Transformer.json';
import * as IFeature from '../test/generated-artifacts/IFeature.json';
import * as IFlashWallet from '../test/generated-artifacts/IFlashWallet.json';
import * as ILiquidityProvider from '../test/generated-artifacts/ILiquidityProvider.json';
import * as ILiquidityProviderFeature from '../test/generated-artifacts/ILiquidityProviderFeature.json';
import * as ILiquidityProviderSandbox from '../test/generated-artifacts/ILiquidityProviderSandbox.json';
import * as IMetaTransactionsFeature from '../test/generated-artifacts/IMetaTransactionsFeature.json';
import * as INativeOrdersFeature from '../test/generated-artifacts/INativeOrdersFeature.json';
import * as InitialMigration from '../test/generated-artifacts/InitialMigration.json';
import * as IOwnableFeature from '../test/generated-artifacts/IOwnableFeature.json';
import * as ISimpleFunctionRegistryFeature from '../test/generated-artifacts/ISimpleFunctionRegistryFeature.json';
import * as IStaking from '../test/generated-artifacts/IStaking.json';
import * as ITestSimpleFunctionRegistryFeature from '../test/generated-artifacts/ITestSimpleFunctionRegistryFeature.json';
import * as ITokenSpenderFeature from '../test/generated-artifacts/ITokenSpenderFeature.json';
import * as ITransformERC20Feature from '../test/generated-artifacts/ITransformERC20Feature.json';
import * as IUniswapFeature from '../test/generated-artifacts/IUniswapFeature.json';
import * as IZeroEx from '../test/generated-artifacts/IZeroEx.json';
import * as LibBootstrap from '../test/generated-artifacts/LibBootstrap.json';
import * as LibCommonRichErrors from '../test/generated-artifacts/LibCommonRichErrors.json';
import * as LibERC20Transformer from '../test/generated-artifacts/LibERC20Transformer.json';
import * as LibFeeCollector from '../test/generated-artifacts/LibFeeCollector.json';
import * as LibLiquidityProviderRichErrors from '../test/generated-artifacts/LibLiquidityProviderRichErrors.json';
import * as LibMetaTransactionsRichErrors from '../test/generated-artifacts/LibMetaTransactionsRichErrors.json';
import * as LibMetaTransactionsStorage from '../test/generated-artifacts/LibMetaTransactionsStorage.json';
import * as LibMigrate from '../test/generated-artifacts/LibMigrate.json';
import * as LibNativeOrder from '../test/generated-artifacts/LibNativeOrder.json';
import * as LibNativeOrdersRichErrors from '../test/generated-artifacts/LibNativeOrdersRichErrors.json';
import * as LibNativeOrdersStorage from '../test/generated-artifacts/LibNativeOrdersStorage.json';
import * as LibOwnableRichErrors from '../test/generated-artifacts/LibOwnableRichErrors.json';
import * as LibOwnableStorage from '../test/generated-artifacts/LibOwnableStorage.json';
import * as LibProxyRichErrors from '../test/generated-artifacts/LibProxyRichErrors.json';
import * as LibProxyStorage from '../test/generated-artifacts/LibProxyStorage.json';
import * as LibReentrancyGuardStorage from '../test/generated-artifacts/LibReentrancyGuardStorage.json';
import * as LibSignature from '../test/generated-artifacts/LibSignature.json';
import * as LibSignatureRichErrors from '../test/generated-artifacts/LibSignatureRichErrors.json';
import * as LibSimpleFunctionRegistryRichErrors from '../test/generated-artifacts/LibSimpleFunctionRegistryRichErrors.json';
import * as LibSimpleFunctionRegistryStorage from '../test/generated-artifacts/LibSimpleFunctionRegistryStorage.json';
import * as LibSpenderRichErrors from '../test/generated-artifacts/LibSpenderRichErrors.json';
import * as LibStorage from '../test/generated-artifacts/LibStorage.json';
import * as LibTokenSpenderStorage from '../test/generated-artifacts/LibTokenSpenderStorage.json';
import * as LibTransformERC20RichErrors from '../test/generated-artifacts/LibTransformERC20RichErrors.json';
import * as LibTransformERC20Storage from '../test/generated-artifacts/LibTransformERC20Storage.json';
import * as LibWalletRichErrors from '../test/generated-artifacts/LibWalletRichErrors.json';
import * as LiquidityProviderFeature from '../test/generated-artifacts/LiquidityProviderFeature.json';
import * as LiquidityProviderSandbox from '../test/generated-artifacts/LiquidityProviderSandbox.json';
import * as LogMetadataTransformer from '../test/generated-artifacts/LogMetadataTransformer.json';
import * as MetaTransactionsFeature from '../test/generated-artifacts/MetaTransactionsFeature.json';
import * as MixinBalancer from '../test/generated-artifacts/MixinBalancer.json';
import * as MixinBancor from '../test/generated-artifacts/MixinBancor.json';
import * as MixinCoFiX from '../test/generated-artifacts/MixinCoFiX.json';
import * as MixinCryptoCom from '../test/generated-artifacts/MixinCryptoCom.json';
import * as MixinCurve from '../test/generated-artifacts/MixinCurve.json';
import * as MixinDodo from '../test/generated-artifacts/MixinDodo.json';
import * as MixinDodoV2 from '../test/generated-artifacts/MixinDodoV2.json';
import * as MixinKyber from '../test/generated-artifacts/MixinKyber.json';
import * as MixinMooniswap from '../test/generated-artifacts/MixinMooniswap.json';
import * as MixinMStable from '../test/generated-artifacts/MixinMStable.json';
import * as MixinOasis from '../test/generated-artifacts/MixinOasis.json';
import * as MixinShell from '../test/generated-artifacts/MixinShell.json';
import * as MixinSushiswap from '../test/generated-artifacts/MixinSushiswap.json';
import * as MixinUniswap from '../test/generated-artifacts/MixinUniswap.json';
import * as MixinUniswapV2 from '../test/generated-artifacts/MixinUniswapV2.json';
import * as MixinZeroExBridge from '../test/generated-artifacts/MixinZeroExBridge.json';
import * as NativeOrdersFeature from '../test/generated-artifacts/NativeOrdersFeature.json';
import * as OwnableFeature from '../test/generated-artifacts/OwnableFeature.json';
import * as PayTakerTransformer from '../test/generated-artifacts/PayTakerTransformer.json';
import * as PermissionlessTransformerDeployer from '../test/generated-artifacts/PermissionlessTransformerDeployer.json';
import * as PositiveSlippageFeeTransformer from '../test/generated-artifacts/PositiveSlippageFeeTransformer.json';
import * as SimpleFunctionRegistryFeature from '../test/generated-artifacts/SimpleFunctionRegistryFeature.json';
import * as TestBridge from '../test/generated-artifacts/TestBridge.json';
import * as TestCallTarget from '../test/generated-artifacts/TestCallTarget.json';
import * as TestCurve from '../test/generated-artifacts/TestCurve.json';
import * as TestDelegateCaller from '../test/generated-artifacts/TestDelegateCaller.json';
import * as TestFeeCollectorController from '../test/generated-artifacts/TestFeeCollectorController.json';
import * as TestFillQuoteTransformerBridge from '../test/generated-artifacts/TestFillQuoteTransformerBridge.json';
import * as TestFillQuoteTransformerExchange from '../test/generated-artifacts/TestFillQuoteTransformerExchange.json';
import * as TestFillQuoteTransformerHost from '../test/generated-artifacts/TestFillQuoteTransformerHost.json';
import * as TestFixinProtocolFees from '../test/generated-artifacts/TestFixinProtocolFees.json';
import * as TestFixinTokenSpender from '../test/generated-artifacts/TestFixinTokenSpender.json';
import * as TestFullMigration from '../test/generated-artifacts/TestFullMigration.json';
import * as TestInitialMigration from '../test/generated-artifacts/TestInitialMigration.json';
import * as TestLibNativeOrder from '../test/generated-artifacts/TestLibNativeOrder.json';
import * as TestLibSignature from '../test/generated-artifacts/TestLibSignature.json';
import * as TestLiquidityProvider from '../test/generated-artifacts/TestLiquidityProvider.json';
import * as TestMetaTransactionsNativeOrdersFeature from '../test/generated-artifacts/TestMetaTransactionsNativeOrdersFeature.json';
import * as TestMetaTransactionsTransformERC20Feature from '../test/generated-artifacts/TestMetaTransactionsTransformERC20Feature.json';
import * as TestMigrator from '../test/generated-artifacts/TestMigrator.json';
import * as TestMintableERC20Token from '../test/generated-artifacts/TestMintableERC20Token.json';
import * as TestMintTokenERC20Transformer from '../test/generated-artifacts/TestMintTokenERC20Transformer.json';
import * as TestNativeOrdersFeature from '../test/generated-artifacts/TestNativeOrdersFeature.json';
import * as TestPermissionlessTransformerDeployerSuicidal from '../test/generated-artifacts/TestPermissionlessTransformerDeployerSuicidal.json';
import * as TestPermissionlessTransformerDeployerTransformer from '../test/generated-artifacts/TestPermissionlessTransformerDeployerTransformer.json';
import * as TestRfqOriginRegistration from '../test/generated-artifacts/TestRfqOriginRegistration.json';
import * as TestSimpleFunctionRegistryFeatureImpl1 from '../test/generated-artifacts/TestSimpleFunctionRegistryFeatureImpl1.json';
import * as TestSimpleFunctionRegistryFeatureImpl2 from '../test/generated-artifacts/TestSimpleFunctionRegistryFeatureImpl2.json';
import * as TestStaking from '../test/generated-artifacts/TestStaking.json';
import * as TestTokenSpender from '../test/generated-artifacts/TestTokenSpender.json';
import * as TestTokenSpenderERC20Token from '../test/generated-artifacts/TestTokenSpenderERC20Token.json';
import * as TestTransformerBase from '../test/generated-artifacts/TestTransformerBase.json';
import * as TestTransformERC20 from '../test/generated-artifacts/TestTransformERC20.json';
import * as TestTransformerDeployerTransformer from '../test/generated-artifacts/TestTransformerDeployerTransformer.json';
import * as TestTransformerHost from '../test/generated-artifacts/TestTransformerHost.json';
import * as TestWeth from '../test/generated-artifacts/TestWeth.json';
import * as TestWethTransformerHost from '../test/generated-artifacts/TestWethTransformerHost.json';
import * as TestZeroExFeature from '../test/generated-artifacts/TestZeroExFeature.json';
import * as TokenSpenderFeature from '../test/generated-artifacts/TokenSpenderFeature.json';
import * as Transformer from '../test/generated-artifacts/Transformer.json';
import * as TransformERC20Feature from '../test/generated-artifacts/TransformERC20Feature.json';
import * as TransformerDeployer from '../test/generated-artifacts/TransformerDeployer.json';
import * as UniswapFeature from '../test/generated-artifacts/UniswapFeature.json';
import * as WethTransformer from '../test/generated-artifacts/WethTransformer.json';
import * as ZeroEx from '../test/generated-artifacts/ZeroEx.json';
import * as ZeroExOptimized from '../test/generated-artifacts/ZeroExOptimized.json';
export const artifacts = {
    IZeroEx: IZeroEx as ContractArtifact,
    ZeroEx: ZeroEx as ContractArtifact,
    ZeroExOptimized: ZeroExOptimized as ContractArtifact,
    LibCommonRichErrors: LibCommonRichErrors as ContractArtifact,
    LibLiquidityProviderRichErrors: LibLiquidityProviderRichErrors as ContractArtifact,
    LibMetaTransactionsRichErrors: LibMetaTransactionsRichErrors as ContractArtifact,
    LibNativeOrdersRichErrors: LibNativeOrdersRichErrors as ContractArtifact,
    LibOwnableRichErrors: LibOwnableRichErrors as ContractArtifact,
    LibProxyRichErrors: LibProxyRichErrors as ContractArtifact,
    LibSignatureRichErrors: LibSignatureRichErrors as ContractArtifact,
    LibSimpleFunctionRegistryRichErrors: LibSimpleFunctionRegistryRichErrors as ContractArtifact,
    LibSpenderRichErrors: LibSpenderRichErrors as ContractArtifact,
    LibTransformERC20RichErrors: LibTransformERC20RichErrors as ContractArtifact,
    LibWalletRichErrors: LibWalletRichErrors as ContractArtifact,
    AllowanceTarget: AllowanceTarget as ContractArtifact,
    FeeCollector: FeeCollector as ContractArtifact,
    FeeCollectorController: FeeCollectorController as ContractArtifact,
    FlashWallet: FlashWallet as ContractArtifact,
    IAllowanceTarget: IAllowanceTarget as ContractArtifact,
    IFlashWallet: IFlashWallet as ContractArtifact,
    ILiquidityProviderSandbox: ILiquidityProviderSandbox as ContractArtifact,
    LibFeeCollector: LibFeeCollector as ContractArtifact,
    LiquidityProviderSandbox: LiquidityProviderSandbox as ContractArtifact,
    PermissionlessTransformerDeployer: PermissionlessTransformerDeployer as ContractArtifact,
    TransformerDeployer: TransformerDeployer as ContractArtifact,
    BootstrapFeature: BootstrapFeature as ContractArtifact,
    IBootstrapFeature: IBootstrapFeature as ContractArtifact,
    IFeature: IFeature as ContractArtifact,
    ILiquidityProviderFeature: ILiquidityProviderFeature as ContractArtifact,
    IMetaTransactionsFeature: IMetaTransactionsFeature as ContractArtifact,
    INativeOrdersFeature: INativeOrdersFeature as ContractArtifact,
    IOwnableFeature: IOwnableFeature as ContractArtifact,
    ISimpleFunctionRegistryFeature: ISimpleFunctionRegistryFeature as ContractArtifact,
    ITokenSpenderFeature: ITokenSpenderFeature as ContractArtifact,
    ITransformERC20Feature: ITransformERC20Feature as ContractArtifact,
    IUniswapFeature: IUniswapFeature as ContractArtifact,
    LiquidityProviderFeature: LiquidityProviderFeature as ContractArtifact,
    MetaTransactionsFeature: MetaTransactionsFeature as ContractArtifact,
    NativeOrdersFeature: NativeOrdersFeature as ContractArtifact,
    OwnableFeature: OwnableFeature as ContractArtifact,
    SimpleFunctionRegistryFeature: SimpleFunctionRegistryFeature as ContractArtifact,
    TokenSpenderFeature: TokenSpenderFeature as ContractArtifact,
    TransformERC20Feature: TransformERC20Feature as ContractArtifact,
    UniswapFeature: UniswapFeature as ContractArtifact,
    LibNativeOrder: LibNativeOrder as ContractArtifact,
    LibSignature: LibSignature as ContractArtifact,
    FixinCommon: FixinCommon as ContractArtifact,
    FixinEIP712: FixinEIP712 as ContractArtifact,
    FixinProtocolFees: FixinProtocolFees as ContractArtifact,
    FixinReentrancyGuard: FixinReentrancyGuard as ContractArtifact,
    FixinTokenSpender: FixinTokenSpender as ContractArtifact,
    CurveLiquidityProvider: CurveLiquidityProvider as ContractArtifact,
    FullMigration: FullMigration as ContractArtifact,
    InitialMigration: InitialMigration as ContractArtifact,
    LibBootstrap: LibBootstrap as ContractArtifact,
    LibMigrate: LibMigrate as ContractArtifact,
    LibMetaTransactionsStorage: LibMetaTransactionsStorage as ContractArtifact,
    LibNativeOrdersStorage: LibNativeOrdersStorage as ContractArtifact,
    LibOwnableStorage: LibOwnableStorage as ContractArtifact,
    LibProxyStorage: LibProxyStorage as ContractArtifact,
    LibReentrancyGuardStorage: LibReentrancyGuardStorage as ContractArtifact,
    LibSimpleFunctionRegistryStorage: LibSimpleFunctionRegistryStorage as ContractArtifact,
    LibStorage: LibStorage as ContractArtifact,
    LibTokenSpenderStorage: LibTokenSpenderStorage as ContractArtifact,
    LibTransformERC20Storage: LibTransformERC20Storage as ContractArtifact,
    AffiliateFeeTransformer: AffiliateFeeTransformer as ContractArtifact,
    FillQuoteTransformer: FillQuoteTransformer as ContractArtifact,
    IERC20Transformer: IERC20Transformer as ContractArtifact,
    LibERC20Transformer: LibERC20Transformer as ContractArtifact,
    LogMetadataTransformer: LogMetadataTransformer as ContractArtifact,
    PayTakerTransformer: PayTakerTransformer as ContractArtifact,
    PositiveSlippageFeeTransformer: PositiveSlippageFeeTransformer as ContractArtifact,
    Transformer: Transformer as ContractArtifact,
    WethTransformer: WethTransformer as ContractArtifact,
    BridgeAdapter: BridgeAdapter as ContractArtifact,
    BridgeSource: BridgeSource as ContractArtifact,
    IBridgeAdapter: IBridgeAdapter as ContractArtifact,
    MixinBalancer: MixinBalancer as ContractArtifact,
    MixinBancor: MixinBancor as ContractArtifact,
    MixinCoFiX: MixinCoFiX as ContractArtifact,
    MixinCryptoCom: MixinCryptoCom as ContractArtifact,
    MixinCurve: MixinCurve as ContractArtifact,
    MixinDodo: MixinDodo as ContractArtifact,
    MixinDodoV2: MixinDodoV2 as ContractArtifact,
    MixinKyber: MixinKyber as ContractArtifact,
    MixinMStable: MixinMStable as ContractArtifact,
    MixinMooniswap: MixinMooniswap as ContractArtifact,
    MixinOasis: MixinOasis as ContractArtifact,
    MixinShell: MixinShell as ContractArtifact,
    MixinSushiswap: MixinSushiswap as ContractArtifact,
    MixinUniswap: MixinUniswap as ContractArtifact,
    MixinUniswapV2: MixinUniswapV2 as ContractArtifact,
    MixinZeroExBridge: MixinZeroExBridge as ContractArtifact,
    ILiquidityProvider: ILiquidityProvider as ContractArtifact,
    IERC20Bridge: IERC20Bridge as ContractArtifact,
    IStaking: IStaking as ContractArtifact,
    ITestSimpleFunctionRegistryFeature: ITestSimpleFunctionRegistryFeature as ContractArtifact,
    TestBridge: TestBridge as ContractArtifact,
    TestCallTarget: TestCallTarget as ContractArtifact,
    TestCurve: TestCurve as ContractArtifact,
    TestDelegateCaller: TestDelegateCaller as ContractArtifact,
    TestFeeCollectorController: TestFeeCollectorController as ContractArtifact,
    TestFillQuoteTransformerBridge: TestFillQuoteTransformerBridge as ContractArtifact,
    TestFillQuoteTransformerExchange: TestFillQuoteTransformerExchange as ContractArtifact,
    TestFillQuoteTransformerHost: TestFillQuoteTransformerHost as ContractArtifact,
    TestFixinProtocolFees: TestFixinProtocolFees as ContractArtifact,
    TestFixinTokenSpender: TestFixinTokenSpender as ContractArtifact,
    TestFullMigration: TestFullMigration as ContractArtifact,
    TestInitialMigration: TestInitialMigration as ContractArtifact,
    TestLibNativeOrder: TestLibNativeOrder as ContractArtifact,
    TestLibSignature: TestLibSignature as ContractArtifact,
    TestLiquidityProvider: TestLiquidityProvider as ContractArtifact,
    TestMetaTransactionsNativeOrdersFeature: TestMetaTransactionsNativeOrdersFeature as ContractArtifact,
    TestMetaTransactionsTransformERC20Feature: TestMetaTransactionsTransformERC20Feature as ContractArtifact,
    TestMigrator: TestMigrator as ContractArtifact,
    TestMintTokenERC20Transformer: TestMintTokenERC20Transformer as ContractArtifact,
    TestMintableERC20Token: TestMintableERC20Token as ContractArtifact,
    TestNativeOrdersFeature: TestNativeOrdersFeature as ContractArtifact,
    TestPermissionlessTransformerDeployerSuicidal: TestPermissionlessTransformerDeployerSuicidal as ContractArtifact,
    TestPermissionlessTransformerDeployerTransformer: TestPermissionlessTransformerDeployerTransformer as ContractArtifact,
    TestRfqOriginRegistration: TestRfqOriginRegistration as ContractArtifact,
    TestSimpleFunctionRegistryFeatureImpl1: TestSimpleFunctionRegistryFeatureImpl1 as ContractArtifact,
    TestSimpleFunctionRegistryFeatureImpl2: TestSimpleFunctionRegistryFeatureImpl2 as ContractArtifact,
    TestStaking: TestStaking as ContractArtifact,
    TestTokenSpender: TestTokenSpender as ContractArtifact,
    TestTokenSpenderERC20Token: TestTokenSpenderERC20Token as ContractArtifact,
    TestTransformERC20: TestTransformERC20 as ContractArtifact,
    TestTransformerBase: TestTransformerBase as ContractArtifact,
    TestTransformerDeployerTransformer: TestTransformerDeployerTransformer as ContractArtifact,
    TestTransformerHost: TestTransformerHost as ContractArtifact,
    TestWeth: TestWeth as ContractArtifact,
    TestWethTransformerHost: TestWethTransformerHost as ContractArtifact,
    TestZeroExFeature: TestZeroExFeature as ContractArtifact,
};
