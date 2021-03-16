import { ContractTxFunctionObj, BaseContract } from '@0x/base-contract';
import { BlockRange, ContractAbi, ContractArtifact, DecodedLogArgs, LogWithDecodedArgs, TxData, SupportedProvider } from 'ethereum-types';
import { BigNumber } from '@0x/utils';
import { EventCallback, IndexedFilterValues, SimpleContractArtifact } from '@0x/types';
import { Web3Wrapper } from '@0x/web3-wrapper';
export declare type TestLiquidityProviderEventArgs = TestLiquidityProviderSellEthForTokenEventArgs | TestLiquidityProviderSellTokenForEthEventArgs | TestLiquidityProviderSellTokenForTokenEventArgs;
export declare enum TestLiquidityProviderEvents {
    SellEthForToken = "SellEthForToken",
    SellTokenForEth = "SellTokenForEth",
    SellTokenForToken = "SellTokenForToken"
}
export interface TestLiquidityProviderSellEthForTokenEventArgs extends DecodedLogArgs {
    outputToken: string;
    recipient: string;
    minBuyAmount: BigNumber;
    ethBalance: BigNumber;
}
export interface TestLiquidityProviderSellTokenForEthEventArgs extends DecodedLogArgs {
    inputToken: string;
    recipient: string;
    minBuyAmount: BigNumber;
    inputTokenBalance: BigNumber;
}
export interface TestLiquidityProviderSellTokenForTokenEventArgs extends DecodedLogArgs {
    inputToken: string;
    outputToken: string;
    recipient: string;
    minBuyAmount: BigNumber;
    inputTokenBalance: BigNumber;
}
export declare class TestLiquidityProviderContract extends BaseContract {
    /**
     * @ignore
     */
    static deployedBytecode: string | undefined;
    static contractName: string;
    private readonly _methodABIIndex;
    private readonly _subscriptionManager;
    static deployFrom0xArtifactAsync(artifact: ContractArtifact | SimpleContractArtifact, supportedProvider: SupportedProvider, txDefaults: Partial<TxData>, logDecodeDependencies: {
        [contractName: string]: (ContractArtifact | SimpleContractArtifact);
    }, xAsset_: string, yAsset_: string): Promise<TestLiquidityProviderContract>;
    static deployWithLibrariesFrom0xArtifactAsync(artifact: ContractArtifact, libraryArtifacts: {
        [libraryName: string]: ContractArtifact;
    }, supportedProvider: SupportedProvider, txDefaults: Partial<TxData>, logDecodeDependencies: {
        [contractName: string]: (ContractArtifact | SimpleContractArtifact);
    }, xAsset_: string, yAsset_: string): Promise<TestLiquidityProviderContract>;
    static deployAsync(bytecode: string, abi: ContractAbi, supportedProvider: SupportedProvider, txDefaults: Partial<TxData>, logDecodeDependencies: {
        [contractName: string]: ContractAbi;
    }, xAsset_: string, yAsset_: string): Promise<TestLiquidityProviderContract>;
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
    /**
     * Trades ETH for token. ETH must be sent to the contract prior to
 * calling this function to trigger the trade.
      * @param outputToken The token being bought.
      * @param recipient The recipient of the bought tokens.
      * @param minBuyAmount The minimum acceptable amount of `outputToken` to buy.
     */
    sellEthForToken(outputToken: string, recipient: string, minBuyAmount: BigNumber, index_3: string): ContractTxFunctionObj<BigNumber>;
    /**
     * Trades token for ETH. The token must be sent to the contract prior
 * to calling this function to trigger the trade.
      * @param inputToken The token being sold.
      * @param recipient The recipient of the bought tokens.
      * @param minBuyAmount The minimum acceptable amount of ETH to buy.
     */
    sellTokenForEth(inputToken: string, recipient: string, minBuyAmount: BigNumber, index_3: string): ContractTxFunctionObj<BigNumber>;
    /**
     * Trades `inputToken` for `outputToken`. The amount of `inputToken`
 * to sell must be transferred to the contract prior to calling this
 * function to trigger the trade.
      * @param inputToken The token being sold.
      * @param outputToken The token being bought.
      * @param recipient The recipient of the bought tokens.
      * @param minBuyAmount The minimum acceptable amount of `outputToken` to buy.
     */
    sellTokenForToken(inputToken: string, outputToken: string, recipient: string, minBuyAmount: BigNumber, index_4: string): ContractTxFunctionObj<BigNumber>;
    xAsset(): ContractTxFunctionObj<string>;
    yAsset(): ContractTxFunctionObj<string>;
    /**
     * Subscribe to an event type emitted by the TestLiquidityProvider contract.
     * @param eventName The TestLiquidityProvider contract event you would like to subscribe to.
     * @param indexFilterValues An object where the keys are indexed args returned by the event and
     * the value is the value you are interested in. E.g `{maker: aUserAddressHex}`
     * @param callback Callback that gets called when a log is added/removed
     * @param isVerbose Enable verbose subscription warnings (e.g recoverable network issues encountered)
     * @return Subscription token used later to unsubscribe
     */
    subscribe<ArgsType extends TestLiquidityProviderEventArgs>(eventName: TestLiquidityProviderEvents, indexFilterValues: IndexedFilterValues, callback: EventCallback<ArgsType>, isVerbose?: boolean, blockPollingIntervalMs?: number): string;
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
     * @param eventName The TestLiquidityProvider contract event you would like to subscribe to.
     * @param blockRange Block range to get logs from.
     * @param indexFilterValues An object where the keys are indexed args returned by the event and
     * the value is the value you are interested in. E.g `{_from: aUserAddressHex}`
     * @return Array of logs that match the parameters
     */
    getLogsAsync<ArgsType extends TestLiquidityProviderEventArgs>(eventName: TestLiquidityProviderEvents, blockRange: BlockRange, indexFilterValues: IndexedFilterValues): Promise<Array<LogWithDecodedArgs<ArgsType>>>;
    constructor(address: string, supportedProvider: SupportedProvider, txDefaults?: Partial<TxData>, logDecodeDependencies?: {
        [contractName: string]: ContractAbi;
    }, deployedBytecode?: string | undefined);
}
//# sourceMappingURL=test_liquidity_provider.d.ts.map