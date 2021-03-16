import { BaseContract } from '@0x/base-contract';
import { BlockRange, ContractAbi, ContractArtifact, DecodedLogArgs, LogWithDecodedArgs, TxData, SupportedProvider } from 'ethereum-types';
import { BigNumber } from '@0x/utils';
import { EventCallback, IndexedFilterValues, SimpleContractArtifact } from '@0x/types';
import { Web3Wrapper } from '@0x/web3-wrapper';
export declare type INativeOrdersEventsEventArgs = INativeOrdersEventsLimitOrderFilledEventArgs | INativeOrdersEventsOrderCancelledEventArgs | INativeOrdersEventsPairCancelledLimitOrdersEventArgs | INativeOrdersEventsPairCancelledRfqOrdersEventArgs | INativeOrdersEventsRfqOrderFilledEventArgs | INativeOrdersEventsRfqOrderOriginsAllowedEventArgs;
export declare enum INativeOrdersEventsEvents {
    LimitOrderFilled = "LimitOrderFilled",
    OrderCancelled = "OrderCancelled",
    PairCancelledLimitOrders = "PairCancelledLimitOrders",
    PairCancelledRfqOrders = "PairCancelledRfqOrders",
    RfqOrderFilled = "RfqOrderFilled",
    RfqOrderOriginsAllowed = "RfqOrderOriginsAllowed"
}
export interface INativeOrdersEventsLimitOrderFilledEventArgs extends DecodedLogArgs {
    orderHash: string;
    maker: string;
    taker: string;
    feeRecipient: string;
    makerToken: string;
    takerToken: string;
    takerTokenFilledAmount: BigNumber;
    makerTokenFilledAmount: BigNumber;
    takerTokenFeeFilledAmount: BigNumber;
    protocolFeePaid: BigNumber;
    pool: string;
}
export interface INativeOrdersEventsOrderCancelledEventArgs extends DecodedLogArgs {
    orderHash: string;
    maker: string;
}
export interface INativeOrdersEventsPairCancelledLimitOrdersEventArgs extends DecodedLogArgs {
    maker: string;
    makerToken: string;
    takerToken: string;
    minValidSalt: BigNumber;
}
export interface INativeOrdersEventsPairCancelledRfqOrdersEventArgs extends DecodedLogArgs {
    maker: string;
    makerToken: string;
    takerToken: string;
    minValidSalt: BigNumber;
}
export interface INativeOrdersEventsRfqOrderFilledEventArgs extends DecodedLogArgs {
    orderHash: string;
    maker: string;
    taker: string;
    makerToken: string;
    takerToken: string;
    takerTokenFilledAmount: BigNumber;
    makerTokenFilledAmount: BigNumber;
    pool: string;
}
export interface INativeOrdersEventsRfqOrderOriginsAllowedEventArgs extends DecodedLogArgs {
    origin: string;
    addrs: string[];
    allowed: boolean;
}
export declare class INativeOrdersEventsContract extends BaseContract {
    /**
     * @ignore
     */
    static deployedBytecode: string | undefined;
    static contractName: string;
    private readonly _methodABIIndex;
    private readonly _subscriptionManager;
    static deployFrom0xArtifactAsync(artifact: ContractArtifact | SimpleContractArtifact, supportedProvider: SupportedProvider, txDefaults: Partial<TxData>, logDecodeDependencies: {
        [contractName: string]: (ContractArtifact | SimpleContractArtifact);
    }): Promise<INativeOrdersEventsContract>;
    static deployWithLibrariesFrom0xArtifactAsync(artifact: ContractArtifact, libraryArtifacts: {
        [libraryName: string]: ContractArtifact;
    }, supportedProvider: SupportedProvider, txDefaults: Partial<TxData>, logDecodeDependencies: {
        [contractName: string]: (ContractArtifact | SimpleContractArtifact);
    }): Promise<INativeOrdersEventsContract>;
    static deployAsync(bytecode: string, abi: ContractAbi, supportedProvider: SupportedProvider, txDefaults: Partial<TxData>, logDecodeDependencies: {
        [contractName: string]: ContractAbi;
    }): Promise<INativeOrdersEventsContract>;
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
     * Subscribe to an event type emitted by the INativeOrdersEvents contract.
     * @param eventName The INativeOrdersEvents contract event you would like to subscribe to.
     * @param indexFilterValues An object where the keys are indexed args returned by the event and
     * the value is the value you are interested in. E.g `{maker: aUserAddressHex}`
     * @param callback Callback that gets called when a log is added/removed
     * @param isVerbose Enable verbose subscription warnings (e.g recoverable network issues encountered)
     * @return Subscription token used later to unsubscribe
     */
    subscribe<ArgsType extends INativeOrdersEventsEventArgs>(eventName: INativeOrdersEventsEvents, indexFilterValues: IndexedFilterValues, callback: EventCallback<ArgsType>, isVerbose?: boolean, blockPollingIntervalMs?: number): string;
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
     * @param eventName The INativeOrdersEvents contract event you would like to subscribe to.
     * @param blockRange Block range to get logs from.
     * @param indexFilterValues An object where the keys are indexed args returned by the event and
     * the value is the value you are interested in. E.g `{_from: aUserAddressHex}`
     * @return Array of logs that match the parameters
     */
    getLogsAsync<ArgsType extends INativeOrdersEventsEventArgs>(eventName: INativeOrdersEventsEvents, blockRange: BlockRange, indexFilterValues: IndexedFilterValues): Promise<Array<LogWithDecodedArgs<ArgsType>>>;
    constructor(address: string, supportedProvider: SupportedProvider, txDefaults?: Partial<TxData>, logDecodeDependencies?: {
        [contractName: string]: ContractAbi;
    }, deployedBytecode?: string | undefined);
}
//# sourceMappingURL=i_native_orders_events.d.ts.map