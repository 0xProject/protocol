import { ContractTxFunctionObj, BaseContract } from '@0x/base-contract';
import { BlockRange, ContractAbi, ContractArtifact, DecodedLogArgs, LogWithDecodedArgs, TxData, SupportedProvider } from 'ethereum-types';
import { BigNumber } from '@0x/utils';
import { EventCallback, IndexedFilterValues, SimpleContractArtifact } from '@0x/types';
import { Web3Wrapper } from '@0x/web3-wrapper';
export declare type MooniswapLiquidityProviderEventArgs = MooniswapLiquidityProviderLiquidityProviderFillEventArgs;
export declare enum MooniswapLiquidityProviderEvents {
    LiquidityProviderFill = "LiquidityProviderFill"
}
export interface MooniswapLiquidityProviderLiquidityProviderFillEventArgs extends DecodedLogArgs {
    inputToken: string;
    outputToken: string;
    inputTokenAmount: BigNumber;
    outputTokenAmount: BigNumber;
    sourceId: string;
    sourceAddress: string;
    sender: string;
    recipient: string;
}
export declare class MooniswapLiquidityProviderContract extends BaseContract {
    /**
     * @ignore
     */
    static deployedBytecode: string | undefined;
    static contractName: string;
    private readonly _methodABIIndex;
    private readonly _subscriptionManager;
    static deployFrom0xArtifactAsync(artifact: ContractArtifact | SimpleContractArtifact, supportedProvider: SupportedProvider, txDefaults: Partial<TxData>, logDecodeDependencies: {
        [contractName: string]: (ContractArtifact | SimpleContractArtifact);
    }, weth: string): Promise<MooniswapLiquidityProviderContract>;
    static deployWithLibrariesFrom0xArtifactAsync(artifact: ContractArtifact, libraryArtifacts: {
        [libraryName: string]: ContractArtifact;
    }, supportedProvider: SupportedProvider, txDefaults: Partial<TxData>, logDecodeDependencies: {
        [contractName: string]: (ContractArtifact | SimpleContractArtifact);
    }, weth: string): Promise<MooniswapLiquidityProviderContract>;
    static deployAsync(bytecode: string, abi: ContractAbi, supportedProvider: SupportedProvider, txDefaults: Partial<TxData>, logDecodeDependencies: {
        [contractName: string]: ContractAbi;
    }, weth: string): Promise<MooniswapLiquidityProviderContract>;
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
     * Quotes the amount of `outputToken` that would be obtained by
 * selling `sellAmount` of `inputToken`.
     */
    getSellQuote(index_0: string, index_1: string, index_2: BigNumber): ContractTxFunctionObj<BigNumber>;
    /**
     * Trades ETH for token. ETH must either be attached to this function
 * call or sent to the contract prior to calling this function to
 * trigger the trade.
      * @param outputToken The token being bought.
      * @param recipient The recipient of the bought tokens.
      * @param minBuyAmount The minimum acceptable amount of `outputToken` to buy.
      * @param auxiliaryData Arbitrary auxiliary data supplied to the contract.
     */
    sellEthForToken(outputToken: string, recipient: string, minBuyAmount: BigNumber, auxiliaryData: string): ContractTxFunctionObj<BigNumber>;
    /**
     * Trades token for ETH. The token must be sent to the contract prior
 * to calling this function to trigger the trade.
      * @param inputToken The token being sold.
      * @param recipient The recipient of the bought tokens.
      * @param minBuyAmount The minimum acceptable amount of ETH to buy.
      * @param auxiliaryData Arbitrary auxiliary data supplied to the contract.
     */
    sellTokenForEth(inputToken: string, recipient: string, minBuyAmount: BigNumber, auxiliaryData: string): ContractTxFunctionObj<BigNumber>;
    /**
     * Trades `inputToken` for `outputToken`. The amount of `inputToken`
 * to sell must be transferred to the contract prior to calling this
 * function to trigger the trade.
      * @param inputToken The token being sold.
      * @param outputToken The token being bought.
      * @param recipient The recipient of the bought tokens.
      * @param minBuyAmount The minimum acceptable amount of `outputToken` to buy.
      * @param auxiliaryData Arbitrary auxiliary data supplied to the contract.
     */
    sellTokenForToken(inputToken: string, outputToken: string, recipient: string, minBuyAmount: BigNumber, auxiliaryData: string): ContractTxFunctionObj<BigNumber>;
    /**
     * Subscribe to an event type emitted by the MooniswapLiquidityProvider contract.
     * @param eventName The MooniswapLiquidityProvider contract event you would like to subscribe to.
     * @param indexFilterValues An object where the keys are indexed args returned by the event and
     * the value is the value you are interested in. E.g `{maker: aUserAddressHex}`
     * @param callback Callback that gets called when a log is added/removed
     * @param isVerbose Enable verbose subscription warnings (e.g recoverable network issues encountered)
     * @return Subscription token used later to unsubscribe
     */
    subscribe<ArgsType extends MooniswapLiquidityProviderEventArgs>(eventName: MooniswapLiquidityProviderEvents, indexFilterValues: IndexedFilterValues, callback: EventCallback<ArgsType>, isVerbose?: boolean, blockPollingIntervalMs?: number): string;
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
     * @param eventName The MooniswapLiquidityProvider contract event you would like to subscribe to.
     * @param blockRange Block range to get logs from.
     * @param indexFilterValues An object where the keys are indexed args returned by the event and
     * the value is the value you are interested in. E.g `{_from: aUserAddressHex}`
     * @return Array of logs that match the parameters
     */
    getLogsAsync<ArgsType extends MooniswapLiquidityProviderEventArgs>(eventName: MooniswapLiquidityProviderEvents, blockRange: BlockRange, indexFilterValues: IndexedFilterValues): Promise<Array<LogWithDecodedArgs<ArgsType>>>;
    constructor(address: string, supportedProvider: SupportedProvider, txDefaults?: Partial<TxData>, logDecodeDependencies?: {
        [contractName: string]: ContractAbi;
    }, deployedBytecode?: string | undefined);
}
//# sourceMappingURL=mooniswap_liquidity_provider.d.ts.map