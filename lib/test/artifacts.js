"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AffiliateFeeTransformer = require("../test/generated-artifacts/AffiliateFeeTransformer.json");
const AllowanceTarget = require("../test/generated-artifacts/AllowanceTarget.json");
const BatchFillNativeOrdersFeature = require("../test/generated-artifacts/BatchFillNativeOrdersFeature.json");
const BootstrapFeature = require("../test/generated-artifacts/BootstrapFeature.json");
const BridgeAdapter = require("../test/generated-artifacts/BridgeAdapter.json");
const BridgeSource = require("../test/generated-artifacts/BridgeSource.json");
const CurveLiquidityProvider = require("../test/generated-artifacts/CurveLiquidityProvider.json");
const FeeCollector = require("../test/generated-artifacts/FeeCollector.json");
const FeeCollectorController = require("../test/generated-artifacts/FeeCollectorController.json");
const FillQuoteTransformer = require("../test/generated-artifacts/FillQuoteTransformer.json");
const FixinCommon = require("../test/generated-artifacts/FixinCommon.json");
const FixinEIP712 = require("../test/generated-artifacts/FixinEIP712.json");
const FixinProtocolFees = require("../test/generated-artifacts/FixinProtocolFees.json");
const FixinReentrancyGuard = require("../test/generated-artifacts/FixinReentrancyGuard.json");
const FixinTokenSpender = require("../test/generated-artifacts/FixinTokenSpender.json");
const FlashWallet = require("../test/generated-artifacts/FlashWallet.json");
const FullMigration = require("../test/generated-artifacts/FullMigration.json");
const IAllowanceTarget = require("../test/generated-artifacts/IAllowanceTarget.json");
const IBatchFillNativeOrdersFeature = require("../test/generated-artifacts/IBatchFillNativeOrdersFeature.json");
const IBootstrapFeature = require("../test/generated-artifacts/IBootstrapFeature.json");
const IBridgeAdapter = require("../test/generated-artifacts/IBridgeAdapter.json");
const IERC20Bridge = require("../test/generated-artifacts/IERC20Bridge.json");
const IERC20Transformer = require("../test/generated-artifacts/IERC20Transformer.json");
const IFeature = require("../test/generated-artifacts/IFeature.json");
const IFlashWallet = require("../test/generated-artifacts/IFlashWallet.json");
const ILiquidityProvider = require("../test/generated-artifacts/ILiquidityProvider.json");
const ILiquidityProviderFeature = require("../test/generated-artifacts/ILiquidityProviderFeature.json");
const ILiquidityProviderSandbox = require("../test/generated-artifacts/ILiquidityProviderSandbox.json");
const IMetaTransactionsFeature = require("../test/generated-artifacts/IMetaTransactionsFeature.json");
const IMooniswapPool = require("../test/generated-artifacts/IMooniswapPool.json");
const IMultiplexFeature = require("../test/generated-artifacts/IMultiplexFeature.json");
const INativeOrdersEvents = require("../test/generated-artifacts/INativeOrdersEvents.json");
const INativeOrdersFeature = require("../test/generated-artifacts/INativeOrdersFeature.json");
const InitialMigration = require("../test/generated-artifacts/InitialMigration.json");
const IOwnableFeature = require("../test/generated-artifacts/IOwnableFeature.json");
const ISimpleFunctionRegistryFeature = require("../test/generated-artifacts/ISimpleFunctionRegistryFeature.json");
const IStaking = require("../test/generated-artifacts/IStaking.json");
const ITestSimpleFunctionRegistryFeature = require("../test/generated-artifacts/ITestSimpleFunctionRegistryFeature.json");
const ITokenSpenderFeature = require("../test/generated-artifacts/ITokenSpenderFeature.json");
const ITransformERC20Feature = require("../test/generated-artifacts/ITransformERC20Feature.json");
const IUniswapFeature = require("../test/generated-artifacts/IUniswapFeature.json");
const IUniswapV2Pair = require("../test/generated-artifacts/IUniswapV2Pair.json");
const IZeroEx = require("../test/generated-artifacts/IZeroEx.json");
const LibBootstrap = require("../test/generated-artifacts/LibBootstrap.json");
const LibCommonRichErrors = require("../test/generated-artifacts/LibCommonRichErrors.json");
const LibERC20Transformer = require("../test/generated-artifacts/LibERC20Transformer.json");
const LibFeeCollector = require("../test/generated-artifacts/LibFeeCollector.json");
const LibLiquidityProviderRichErrors = require("../test/generated-artifacts/LibLiquidityProviderRichErrors.json");
const LibMetaTransactionsRichErrors = require("../test/generated-artifacts/LibMetaTransactionsRichErrors.json");
const LibMetaTransactionsStorage = require("../test/generated-artifacts/LibMetaTransactionsStorage.json");
const LibMigrate = require("../test/generated-artifacts/LibMigrate.json");
const LibNativeOrder = require("../test/generated-artifacts/LibNativeOrder.json");
const LibNativeOrdersRichErrors = require("../test/generated-artifacts/LibNativeOrdersRichErrors.json");
const LibNativeOrdersStorage = require("../test/generated-artifacts/LibNativeOrdersStorage.json");
const LibOwnableRichErrors = require("../test/generated-artifacts/LibOwnableRichErrors.json");
const LibOwnableStorage = require("../test/generated-artifacts/LibOwnableStorage.json");
const LibProxyRichErrors = require("../test/generated-artifacts/LibProxyRichErrors.json");
const LibProxyStorage = require("../test/generated-artifacts/LibProxyStorage.json");
const LibReentrancyGuardStorage = require("../test/generated-artifacts/LibReentrancyGuardStorage.json");
const LibSignature = require("../test/generated-artifacts/LibSignature.json");
const LibSignatureRichErrors = require("../test/generated-artifacts/LibSignatureRichErrors.json");
const LibSimpleFunctionRegistryRichErrors = require("../test/generated-artifacts/LibSimpleFunctionRegistryRichErrors.json");
const LibSimpleFunctionRegistryStorage = require("../test/generated-artifacts/LibSimpleFunctionRegistryStorage.json");
const LibSpenderRichErrors = require("../test/generated-artifacts/LibSpenderRichErrors.json");
const LibStorage = require("../test/generated-artifacts/LibStorage.json");
const LibTokenSpenderStorage = require("../test/generated-artifacts/LibTokenSpenderStorage.json");
const LibTransformERC20RichErrors = require("../test/generated-artifacts/LibTransformERC20RichErrors.json");
const LibTransformERC20Storage = require("../test/generated-artifacts/LibTransformERC20Storage.json");
const LibWalletRichErrors = require("../test/generated-artifacts/LibWalletRichErrors.json");
const LiquidityProviderFeature = require("../test/generated-artifacts/LiquidityProviderFeature.json");
const LiquidityProviderSandbox = require("../test/generated-artifacts/LiquidityProviderSandbox.json");
const LogMetadataTransformer = require("../test/generated-artifacts/LogMetadataTransformer.json");
const MetaTransactionsFeature = require("../test/generated-artifacts/MetaTransactionsFeature.json");
const MixinBalancer = require("../test/generated-artifacts/MixinBalancer.json");
const MixinBancor = require("../test/generated-artifacts/MixinBancor.json");
const MixinCoFiX = require("../test/generated-artifacts/MixinCoFiX.json");
const MixinCryptoCom = require("../test/generated-artifacts/MixinCryptoCom.json");
const MixinCurve = require("../test/generated-artifacts/MixinCurve.json");
const MixinDodo = require("../test/generated-artifacts/MixinDodo.json");
const MixinDodoV2 = require("../test/generated-artifacts/MixinDodoV2.json");
const MixinKyber = require("../test/generated-artifacts/MixinKyber.json");
const MixinMooniswap = require("../test/generated-artifacts/MixinMooniswap.json");
const MixinMStable = require("../test/generated-artifacts/MixinMStable.json");
const MixinOasis = require("../test/generated-artifacts/MixinOasis.json");
const MixinShell = require("../test/generated-artifacts/MixinShell.json");
const MixinSushiswap = require("../test/generated-artifacts/MixinSushiswap.json");
const MixinUniswap = require("../test/generated-artifacts/MixinUniswap.json");
const MixinUniswapV2 = require("../test/generated-artifacts/MixinUniswapV2.json");
const MixinZeroExBridge = require("../test/generated-artifacts/MixinZeroExBridge.json");
const MooniswapLiquidityProvider = require("../test/generated-artifacts/MooniswapLiquidityProvider.json");
const MultiplexFeature = require("../test/generated-artifacts/MultiplexFeature.json");
const NativeOrdersCancellation = require("../test/generated-artifacts/NativeOrdersCancellation.json");
const NativeOrdersFeature = require("../test/generated-artifacts/NativeOrdersFeature.json");
const NativeOrdersInfo = require("../test/generated-artifacts/NativeOrdersInfo.json");
const NativeOrdersProtocolFees = require("../test/generated-artifacts/NativeOrdersProtocolFees.json");
const NativeOrdersSettlement = require("../test/generated-artifacts/NativeOrdersSettlement.json");
const OwnableFeature = require("../test/generated-artifacts/OwnableFeature.json");
const PayTakerTransformer = require("../test/generated-artifacts/PayTakerTransformer.json");
const PermissionlessTransformerDeployer = require("../test/generated-artifacts/PermissionlessTransformerDeployer.json");
const PositiveSlippageFeeTransformer = require("../test/generated-artifacts/PositiveSlippageFeeTransformer.json");
const SimpleFunctionRegistryFeature = require("../test/generated-artifacts/SimpleFunctionRegistryFeature.json");
const TestBridge = require("../test/generated-artifacts/TestBridge.json");
const TestCallTarget = require("../test/generated-artifacts/TestCallTarget.json");
const TestCurve = require("../test/generated-artifacts/TestCurve.json");
const TestDelegateCaller = require("../test/generated-artifacts/TestDelegateCaller.json");
const TestFeeCollectorController = require("../test/generated-artifacts/TestFeeCollectorController.json");
const TestFillQuoteTransformerBridge = require("../test/generated-artifacts/TestFillQuoteTransformerBridge.json");
const TestFillQuoteTransformerExchange = require("../test/generated-artifacts/TestFillQuoteTransformerExchange.json");
const TestFillQuoteTransformerHost = require("../test/generated-artifacts/TestFillQuoteTransformerHost.json");
const TestFixinProtocolFees = require("../test/generated-artifacts/TestFixinProtocolFees.json");
const TestFixinTokenSpender = require("../test/generated-artifacts/TestFixinTokenSpender.json");
const TestFullMigration = require("../test/generated-artifacts/TestFullMigration.json");
const TestInitialMigration = require("../test/generated-artifacts/TestInitialMigration.json");
const TestLibNativeOrder = require("../test/generated-artifacts/TestLibNativeOrder.json");
const TestLibSignature = require("../test/generated-artifacts/TestLibSignature.json");
const TestLiquidityProvider = require("../test/generated-artifacts/TestLiquidityProvider.json");
const TestMetaTransactionsNativeOrdersFeature = require("../test/generated-artifacts/TestMetaTransactionsNativeOrdersFeature.json");
const TestMetaTransactionsTransformERC20Feature = require("../test/generated-artifacts/TestMetaTransactionsTransformERC20Feature.json");
const TestMigrator = require("../test/generated-artifacts/TestMigrator.json");
const TestMintableERC20Token = require("../test/generated-artifacts/TestMintableERC20Token.json");
const TestMintTokenERC20Transformer = require("../test/generated-artifacts/TestMintTokenERC20Transformer.json");
const TestMooniswap = require("../test/generated-artifacts/TestMooniswap.json");
const TestNativeOrdersFeature = require("../test/generated-artifacts/TestNativeOrdersFeature.json");
const TestPermissionlessTransformerDeployerSuicidal = require("../test/generated-artifacts/TestPermissionlessTransformerDeployerSuicidal.json");
const TestPermissionlessTransformerDeployerTransformer = require("../test/generated-artifacts/TestPermissionlessTransformerDeployerTransformer.json");
const TestRfqOriginRegistration = require("../test/generated-artifacts/TestRfqOriginRegistration.json");
const TestSimpleFunctionRegistryFeatureImpl1 = require("../test/generated-artifacts/TestSimpleFunctionRegistryFeatureImpl1.json");
const TestSimpleFunctionRegistryFeatureImpl2 = require("../test/generated-artifacts/TestSimpleFunctionRegistryFeatureImpl2.json");
const TestStaking = require("../test/generated-artifacts/TestStaking.json");
const TestTokenSpender = require("../test/generated-artifacts/TestTokenSpender.json");
const TestTokenSpenderERC20Token = require("../test/generated-artifacts/TestTokenSpenderERC20Token.json");
const TestTransformerBase = require("../test/generated-artifacts/TestTransformerBase.json");
const TestTransformERC20 = require("../test/generated-artifacts/TestTransformERC20.json");
const TestTransformerDeployerTransformer = require("../test/generated-artifacts/TestTransformerDeployerTransformer.json");
const TestTransformerHost = require("../test/generated-artifacts/TestTransformerHost.json");
const TestWeth = require("../test/generated-artifacts/TestWeth.json");
const TestWethTransformerHost = require("../test/generated-artifacts/TestWethTransformerHost.json");
const TestZeroExFeature = require("../test/generated-artifacts/TestZeroExFeature.json");
const TokenSpenderFeature = require("../test/generated-artifacts/TokenSpenderFeature.json");
const Transformer = require("../test/generated-artifacts/Transformer.json");
const TransformERC20Feature = require("../test/generated-artifacts/TransformERC20Feature.json");
const TransformerDeployer = require("../test/generated-artifacts/TransformerDeployer.json");
const UniswapFeature = require("../test/generated-artifacts/UniswapFeature.json");
const WethTransformer = require("../test/generated-artifacts/WethTransformer.json");
const ZeroEx = require("../test/generated-artifacts/ZeroEx.json");
const ZeroExOptimized = require("../test/generated-artifacts/ZeroExOptimized.json");
exports.artifacts = {
    IZeroEx: IZeroEx,
    ZeroEx: ZeroEx,
    ZeroExOptimized: ZeroExOptimized,
    LibCommonRichErrors: LibCommonRichErrors,
    LibLiquidityProviderRichErrors: LibLiquidityProviderRichErrors,
    LibMetaTransactionsRichErrors: LibMetaTransactionsRichErrors,
    LibNativeOrdersRichErrors: LibNativeOrdersRichErrors,
    LibOwnableRichErrors: LibOwnableRichErrors,
    LibProxyRichErrors: LibProxyRichErrors,
    LibSignatureRichErrors: LibSignatureRichErrors,
    LibSimpleFunctionRegistryRichErrors: LibSimpleFunctionRegistryRichErrors,
    LibSpenderRichErrors: LibSpenderRichErrors,
    LibTransformERC20RichErrors: LibTransformERC20RichErrors,
    LibWalletRichErrors: LibWalletRichErrors,
    AllowanceTarget: AllowanceTarget,
    FeeCollector: FeeCollector,
    FeeCollectorController: FeeCollectorController,
    FlashWallet: FlashWallet,
    IAllowanceTarget: IAllowanceTarget,
    IFlashWallet: IFlashWallet,
    ILiquidityProviderSandbox: ILiquidityProviderSandbox,
    LibFeeCollector: LibFeeCollector,
    LiquidityProviderSandbox: LiquidityProviderSandbox,
    PermissionlessTransformerDeployer: PermissionlessTransformerDeployer,
    TransformerDeployer: TransformerDeployer,
    BatchFillNativeOrdersFeature: BatchFillNativeOrdersFeature,
    BootstrapFeature: BootstrapFeature,
    LiquidityProviderFeature: LiquidityProviderFeature,
    MetaTransactionsFeature: MetaTransactionsFeature,
    MultiplexFeature: MultiplexFeature,
    NativeOrdersFeature: NativeOrdersFeature,
    OwnableFeature: OwnableFeature,
    SimpleFunctionRegistryFeature: SimpleFunctionRegistryFeature,
    TokenSpenderFeature: TokenSpenderFeature,
    TransformERC20Feature: TransformERC20Feature,
    UniswapFeature: UniswapFeature,
    IBatchFillNativeOrdersFeature: IBatchFillNativeOrdersFeature,
    IBootstrapFeature: IBootstrapFeature,
    IFeature: IFeature,
    ILiquidityProviderFeature: ILiquidityProviderFeature,
    IMetaTransactionsFeature: IMetaTransactionsFeature,
    IMultiplexFeature: IMultiplexFeature,
    INativeOrdersEvents: INativeOrdersEvents,
    INativeOrdersFeature: INativeOrdersFeature,
    IOwnableFeature: IOwnableFeature,
    ISimpleFunctionRegistryFeature: ISimpleFunctionRegistryFeature,
    ITokenSpenderFeature: ITokenSpenderFeature,
    ITransformERC20Feature: ITransformERC20Feature,
    IUniswapFeature: IUniswapFeature,
    LibNativeOrder: LibNativeOrder,
    LibSignature: LibSignature,
    NativeOrdersCancellation: NativeOrdersCancellation,
    NativeOrdersInfo: NativeOrdersInfo,
    NativeOrdersProtocolFees: NativeOrdersProtocolFees,
    NativeOrdersSettlement: NativeOrdersSettlement,
    FixinCommon: FixinCommon,
    FixinEIP712: FixinEIP712,
    FixinProtocolFees: FixinProtocolFees,
    FixinReentrancyGuard: FixinReentrancyGuard,
    FixinTokenSpender: FixinTokenSpender,
    CurveLiquidityProvider: CurveLiquidityProvider,
    MooniswapLiquidityProvider: MooniswapLiquidityProvider,
    FullMigration: FullMigration,
    InitialMigration: InitialMigration,
    LibBootstrap: LibBootstrap,
    LibMigrate: LibMigrate,
    LibMetaTransactionsStorage: LibMetaTransactionsStorage,
    LibNativeOrdersStorage: LibNativeOrdersStorage,
    LibOwnableStorage: LibOwnableStorage,
    LibProxyStorage: LibProxyStorage,
    LibReentrancyGuardStorage: LibReentrancyGuardStorage,
    LibSimpleFunctionRegistryStorage: LibSimpleFunctionRegistryStorage,
    LibStorage: LibStorage,
    LibTokenSpenderStorage: LibTokenSpenderStorage,
    LibTransformERC20Storage: LibTransformERC20Storage,
    AffiliateFeeTransformer: AffiliateFeeTransformer,
    FillQuoteTransformer: FillQuoteTransformer,
    IERC20Transformer: IERC20Transformer,
    LibERC20Transformer: LibERC20Transformer,
    LogMetadataTransformer: LogMetadataTransformer,
    PayTakerTransformer: PayTakerTransformer,
    PositiveSlippageFeeTransformer: PositiveSlippageFeeTransformer,
    Transformer: Transformer,
    WethTransformer: WethTransformer,
    BridgeAdapter: BridgeAdapter,
    BridgeSource: BridgeSource,
    IBridgeAdapter: IBridgeAdapter,
    MixinBalancer: MixinBalancer,
    MixinBancor: MixinBancor,
    MixinCoFiX: MixinCoFiX,
    MixinCryptoCom: MixinCryptoCom,
    MixinCurve: MixinCurve,
    MixinDodo: MixinDodo,
    MixinDodoV2: MixinDodoV2,
    MixinKyber: MixinKyber,
    MixinMStable: MixinMStable,
    MixinMooniswap: MixinMooniswap,
    MixinOasis: MixinOasis,
    MixinShell: MixinShell,
    MixinSushiswap: MixinSushiswap,
    MixinUniswap: MixinUniswap,
    MixinUniswapV2: MixinUniswapV2,
    MixinZeroExBridge: MixinZeroExBridge,
    ILiquidityProvider: ILiquidityProvider,
    IMooniswapPool: IMooniswapPool,
    IUniswapV2Pair: IUniswapV2Pair,
    IERC20Bridge: IERC20Bridge,
    IStaking: IStaking,
    ITestSimpleFunctionRegistryFeature: ITestSimpleFunctionRegistryFeature,
    TestBridge: TestBridge,
    TestCallTarget: TestCallTarget,
    TestCurve: TestCurve,
    TestDelegateCaller: TestDelegateCaller,
    TestFeeCollectorController: TestFeeCollectorController,
    TestFillQuoteTransformerBridge: TestFillQuoteTransformerBridge,
    TestFillQuoteTransformerExchange: TestFillQuoteTransformerExchange,
    TestFillQuoteTransformerHost: TestFillQuoteTransformerHost,
    TestFixinProtocolFees: TestFixinProtocolFees,
    TestFixinTokenSpender: TestFixinTokenSpender,
    TestFullMigration: TestFullMigration,
    TestInitialMigration: TestInitialMigration,
    TestLibNativeOrder: TestLibNativeOrder,
    TestLibSignature: TestLibSignature,
    TestLiquidityProvider: TestLiquidityProvider,
    TestMetaTransactionsNativeOrdersFeature: TestMetaTransactionsNativeOrdersFeature,
    TestMetaTransactionsTransformERC20Feature: TestMetaTransactionsTransformERC20Feature,
    TestMigrator: TestMigrator,
    TestMintTokenERC20Transformer: TestMintTokenERC20Transformer,
    TestMintableERC20Token: TestMintableERC20Token,
    TestMooniswap: TestMooniswap,
    TestNativeOrdersFeature: TestNativeOrdersFeature,
    TestPermissionlessTransformerDeployerSuicidal: TestPermissionlessTransformerDeployerSuicidal,
    TestPermissionlessTransformerDeployerTransformer: TestPermissionlessTransformerDeployerTransformer,
    TestRfqOriginRegistration: TestRfqOriginRegistration,
    TestSimpleFunctionRegistryFeatureImpl1: TestSimpleFunctionRegistryFeatureImpl1,
    TestSimpleFunctionRegistryFeatureImpl2: TestSimpleFunctionRegistryFeatureImpl2,
    TestStaking: TestStaking,
    TestTokenSpender: TestTokenSpender,
    TestTokenSpenderERC20Token: TestTokenSpenderERC20Token,
    TestTransformERC20: TestTransformERC20,
    TestTransformerBase: TestTransformerBase,
    TestTransformerDeployerTransformer: TestTransformerDeployerTransformer,
    TestTransformerHost: TestTransformerHost,
    TestWeth: TestWeth,
    TestWethTransformerHost: TestWethTransformerHost,
    TestZeroExFeature: TestZeroExFeature,
};
//# sourceMappingURL=artifacts.js.map