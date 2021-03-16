import { ContractTxFunctionObj, BaseContract } from '@0x/base-contract';
import { BlockRange, ContractAbi, ContractArtifact, DecodedLogArgs, LogWithDecodedArgs, TxData, SupportedProvider } from 'ethereum-types';
import { BigNumber } from '@0x/utils';
import { EventCallback, IndexedFilterValues, SimpleContractArtifact } from '@0x/types';
import { Web3Wrapper } from '@0x/web3-wrapper';
export declare type MultiplexFeatureEventArgs = MultiplexFeatureExpiredRfqOrderEventArgs | MultiplexFeatureLiquidityProviderSwapEventArgs;
export declare enum MultiplexFeatureEvents {
    ExpiredRfqOrder = "ExpiredRfqOrder",
    LiquidityProviderSwap = "LiquidityProviderSwap"
}
export interface MultiplexFeatureExpiredRfqOrderEventArgs extends DecodedLogArgs {
    orderHash: string;
    maker: string;
    expiry: BigNumber;
}
export interface MultiplexFeatureLiquidityProviderSwapEventArgs extends DecodedLogArgs {
    inputToken: string;
    outputToken: string;
    inputTokenAmount: BigNumber;
    outputTokenAmount: BigNumber;
    provider: string;
    recipient: string;
}
export declare class MultiplexFeatureContract extends BaseContract {
    /**
     * @ignore
     */
    static deployedBytecode: string | undefined;
    static contractName: string;
    private readonly _methodABIIndex;
    private readonly _subscriptionManager;
    static deployFrom0xArtifactAsync(artifact: ContractArtifact | SimpleContractArtifact, supportedProvider: SupportedProvider, txDefaults: Partial<TxData>, logDecodeDependencies: {
        [contractName: string]: (ContractArtifact | SimpleContractArtifact);
    }, zeroExAddress: string, weth_: string, sandbox_: string, greedyTokensBloomFilter: string): Promise<MultiplexFeatureContract>;
    static deployWithLibrariesFrom0xArtifactAsync(artifact: ContractArtifact, libraryArtifacts: {
        [libraryName: string]: ContractArtifact;
    }, supportedProvider: SupportedProvider, txDefaults: Partial<TxData>, logDecodeDependencies: {
        [contractName: string]: (ContractArtifact | SimpleContractArtifact);
    }, zeroExAddress: string, weth_: string, sandbox_: string, greedyTokensBloomFilter: string): Promise<MultiplexFeatureContract>;
    static deployAsync(bytecode: string, abi: ContractAbi, supportedProvider: SupportedProvider, txDefaults: Partial<TxData>, logDecodeDependencies: {
        [contractName: string]: ContractAbi;
    }, zeroExAddress: string, weth_: string, sandbox_: string, greedyTokensBloomFilter: string): Promise<MultiplexFeatureContract>;
    /**
     * @returns      The contract ABI
     */
    static ABI(): ContractAbi;
    protected static _deployLibrariesAsync(artifact: ContractArtifact, libraryArtifacts: {
        [libraryName: string]: ContractArtifact;
    }, web3Wrapper: Web3Wrapper, txDefaults: Partial<TxData>, libraryAddresses?: {
        [libraryName: string]: string;
    }): Promise<{
        [libraryName: string]: string;
    }>;
    getFunctionSignature(methodName: string): string;
    getABIDecodedTransactionData<T>(methodName: string, callData: string): T;
    getABIDecodedReturnData<T>(methodName: string, callData: string): T;
    getSelector(methodName: string): string;
    EIP712_DOMAIN_SEPARATOR(): ContractTxFunctionObj<string>;
    FEATURE_NAME(): ContractTxFunctionObj<string>;
    FEATURE_VERSION(): ContractTxFunctionObj<BigNumber>;
    GREEDY_TOKENS_BLOOM_FILTER(): ContractTxFunctionObj<string>;
    _multiHopFill(fillData: {
        tokens: string[];
        sellAmount: BigNumber;
        calls: Array<{
            selector: string;
            data: string;
        }>;
    }, totalEth: BigNumber): ContractTxFunctionObj<[BigNumber, BigNumber]>;
    _sellToLiquidityProvider(inputToken: string, outputToken: string, inputTokenAmount: BigNumber, provider: string, recipient: string, auxiliaryData: string): ContractTxFunctionObj<BigNumber>;
    _sellToUniswap(tokens: string[], sellAmount: BigNumber, isSushi: boolean, pairAddress: string, recipient: string): ContractTxFunctionObj<BigNumber>;
    /**
     * Executes a batch of fills selling `fillData.inputToken`
 * for `fillData.outputToken` in sequence. Refer to the
 * internal variant `_batchFill` for the allowed nested
 * operations.
      * @param fillData Encodes the input/output tokens, the sell        amount, and
     *     the nested operations for this batch fill.
      * @param minBuyAmount The minimum amount of `fillData.outputToken`        to
     *     buy. Reverts if this amount is not met.
     */
    batchFill(fillData: {
        inputToken: string;
        outputToken: string;
        sellAmount: BigNumber;
        calls: Array<{
            selector: string;
            sellAmount: BigNumber;
            data: string;
        }>;
    }, minBuyAmount: BigNumber): ContractTxFunctionObj<BigNumber>;
    /**
     * Initialize and register this feature.
 * Should be delegatecalled by `Migrate.migrate()`.
     */
    migrate(): ContractTxFunctionObj<string>;
    /**
     * Executes a sequence of fills "hopping" through the
 * path of tokens given by `fillData.tokens`. Refer to the
 * internal variant `_multiHopFill` for the allowed nested
 * operations.
      * @param fillData Encodes the path of tokens, the sell amount,        and the
     *     nested operations for this multi-hop fill.
      * @param minBuyAmount The minimum amount of the output token        to buy.
     *     Reverts if this amount is not met.
     */
    multiHopFill(fillData: {
        tokens: string[];
        sellAmount: BigNumber;
        calls: Array<{
            selector: string;
            data: string;
        }>;
    }, minBuyAmount: BigNumber): ContractTxFunctionObj<BigNumber>;
    sandbox(): ContractTxFunctionObj<string>;
    /**
     * Subscribe to an event type emitted by the MultiplexFeature contract.
     * @param eventName The MultiplexFeature contract event you would like to subscribe to.
     * @param indexFilterValues An object where the keys are indexed args returned by the event and
     * the value is the value you are interested in. E.g `{maker: aUserAddressHex}`
     * @param callback Callback that gets called when a log is added/removed
     * @param isVerbose Enable verbose subscription warnings (e.g recoverable network issues encountered)
     * @return Subscription token used later to unsubscribe
     */
    subscribe<ArgsType extends MultiplexFeatureEventArgs>(eventName: MultiplexFeatureEvents, indexFilterValues: IndexedFilterValues, callback: EventCallback<ArgsType>, isVerbose?: boolean, blockPollingIntervalMs?: number): string;
    /**
     * Cancel a subscription
     * @param subscriptionToken Subscription token returned by `subscribe()`
     */
    unsubscribe(subscriptionToken: string): void;
    /**
     * Cancels all existing subscriptions
     */
    unsubscribeAll(): void;
    /**
     * Gets historical logs without creating a subscription
     * @param eventName The MultiplexFeature contract event you would like to subscribe to.
     * @param blockRange Block range to get logs from.
     * @param indexFilterValues An object where the keys are indexed args returned by the event and
     * the value is the value you are interested in. E.g `{_from: aUserAddressHex}`
     * @return Array of logs that match the parameters
     */
    getLogsAsync<ArgsType extends MultiplexFeatureEventArgs>(eventName: MultiplexFeatureEvents, blockRange: BlockRange, indexFilterValues: IndexedFilterValues): Promise<Array<LogWithDecodedArgs<ArgsType>>>;
    constructor(address: string, supportedProvider: SupportedProvider, txDefaults?: Partial<TxData>, logDecodeDependencies?: {
        [contractName: string]: ContractAbi;
    }, deployedBytecode?: string | undefined);
}
//# sourceMappingURL=multiplex_feature.d.ts.map