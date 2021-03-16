import { ContractTxFunctionObj, BaseContract } from '@0x/base-contract';
import { BlockRange, ContractAbi, ContractArtifact, DecodedLogArgs, LogWithDecodedArgs, TxData, SupportedProvider } from 'ethereum-types';
import { BigNumber } from '@0x/utils';
import { EventCallback, IndexedFilterValues, SimpleContractArtifact } from '@0x/types';
import { Web3Wrapper } from '@0x/web3-wrapper';
export declare type NativeOrdersCancellationEventArgs = NativeOrdersCancellationLimitOrderFilledEventArgs | NativeOrdersCancellationOrderCancelledEventArgs | NativeOrdersCancellationPairCancelledLimitOrdersEventArgs | NativeOrdersCancellationPairCancelledRfqOrdersEventArgs | NativeOrdersCancellationRfqOrderFilledEventArgs | NativeOrdersCancellationRfqOrderOriginsAllowedEventArgs;
export declare enum NativeOrdersCancellationEvents {
    LimitOrderFilled = "LimitOrderFilled",
    OrderCancelled = "OrderCancelled",
    PairCancelledLimitOrders = "PairCancelledLimitOrders",
    PairCancelledRfqOrders = "PairCancelledRfqOrders",
    RfqOrderFilled = "RfqOrderFilled",
    RfqOrderOriginsAllowed = "RfqOrderOriginsAllowed"
}
export interface NativeOrdersCancellationLimitOrderFilledEventArgs extends DecodedLogArgs {
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
export interface NativeOrdersCancellationOrderCancelledEventArgs extends DecodedLogArgs {
    orderHash: string;
    maker: string;
}
export interface NativeOrdersCancellationPairCancelledLimitOrdersEventArgs extends DecodedLogArgs {
    maker: string;
    makerToken: string;
    takerToken: string;
    minValidSalt: BigNumber;
}
export interface NativeOrdersCancellationPairCancelledRfqOrdersEventArgs extends DecodedLogArgs {
    maker: string;
    makerToken: string;
    takerToken: string;
    minValidSalt: BigNumber;
}
export interface NativeOrdersCancellationRfqOrderFilledEventArgs extends DecodedLogArgs {
    orderHash: string;
    maker: string;
    taker: string;
    makerToken: string;
    takerToken: string;
    takerTokenFilledAmount: BigNumber;
    makerTokenFilledAmount: BigNumber;
    pool: string;
}
export interface NativeOrdersCancellationRfqOrderOriginsAllowedEventArgs extends DecodedLogArgs {
    origin: string;
    addrs: string[];
    allowed: boolean;
}
export declare class NativeOrdersCancellationContract extends BaseContract {
    /**
     * @ignore
     */
    static deployedBytecode: string | undefined;
    static contractName: string;
    private readonly _methodABIIndex;
    private readonly _subscriptionManager;
    static deployFrom0xArtifactAsync(artifact: ContractArtifact | SimpleContractArtifact, supportedProvider: SupportedProvider, txDefaults: Partial<TxData>, logDecodeDependencies: {
        [contractName: string]: (ContractArtifact | SimpleContractArtifact);
    }): Promise<NativeOrdersCancellationContract>;
    static deployWithLibrariesFrom0xArtifactAsync(artifact: ContractArtifact, libraryArtifacts: {
        [libraryName: string]: ContractArtifact;
    }, supportedProvider: SupportedProvider, txDefaults: Partial<TxData>, logDecodeDependencies: {
        [contractName: string]: (ContractArtifact | SimpleContractArtifact);
    }): Promise<NativeOrdersCancellationContract>;
    static deployAsync(bytecode: string, abi: ContractAbi, supportedProvider: SupportedProvider, txDefaults: Partial<TxData>, logDecodeDependencies: {
        [contractName: string]: ContractAbi;
    }): Promise<NativeOrdersCancellationContract>;
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
    GREEDY_TOKENS_BLOOM_FILTER(): ContractTxFunctionObj<string>;
    /**
     * Cancel multiple limit orders. The caller must be the maker.
 * Silently succeeds if the order has already been cancelled.
      * @param orders The limit orders.
     */
    batchCancelLimitOrders(orders: Array<{
        makerToken: string;
        takerToken: string;
        makerAmount: BigNumber;
        takerAmount: BigNumber;
        takerTokenFeeAmount: BigNumber;
        maker: string;
        taker: string;
        sender: string;
        feeRecipient: string;
        pool: string;
        expiry: BigNumber;
        salt: BigNumber;
    }>): ContractTxFunctionObj<void>;
    /**
     * Cancel all limit orders for a given maker and pair with a salt less
 * than the value provided. The caller must be the maker. Subsequent
 * calls to this function with the same caller and pair require the
 * new salt to be >= the old salt.
      * @param makerTokens The maker tokens.
      * @param takerTokens The taker tokens.
      * @param minValidSalts The new minimum valid salts.
     */
    batchCancelPairLimitOrders(makerTokens: string[], takerTokens: string[], minValidSalts: BigNumber[]): ContractTxFunctionObj<void>;
    /**
     * Cancel all RFQ orders for a given maker and pair with a salt less
 * than the value provided. The caller must be the maker. Subsequent
 * calls to this function with the same caller and pair require the
 * new salt to be >= the old salt.
      * @param makerTokens The maker tokens.
      * @param takerTokens The taker tokens.
      * @param minValidSalts The new minimum valid salts.
     */
    batchCancelPairRfqOrders(makerTokens: string[], takerTokens: string[], minValidSalts: BigNumber[]): ContractTxFunctionObj<void>;
    /**
     * Cancel multiple RFQ orders. The caller must be the maker.
 * Silently succeeds if the order has already been cancelled.
      * @param orders The RFQ orders.
     */
    batchCancelRfqOrders(orders: Array<{
        makerToken: string;
        takerToken: string;
        makerAmount: BigNumber;
        takerAmount: BigNumber;
        maker: string;
        taker: string;
        txOrigin: string;
        pool: string;
        expiry: BigNumber;
        salt: BigNumber;
    }>): ContractTxFunctionObj<void>;
    /**
     * Batch version of `getLimitOrderRelevantState()`, without reverting.
 * Orders that would normally cause `getLimitOrderRelevantState()`
 * to revert will have empty results.
      * @param orders The limit orders.
      * @param signatures The order signatures.
     */
    batchGetLimitOrderRelevantStates(orders: Array<{
        makerToken: string;
        takerToken: string;
        makerAmount: BigNumber;
        takerAmount: BigNumber;
        takerTokenFeeAmount: BigNumber;
        maker: string;
        taker: string;
        sender: string;
        feeRecipient: string;
        pool: string;
        expiry: BigNumber;
        salt: BigNumber;
    }>, signatures: Array<{
        signatureType: number | BigNumber;
        v: number | BigNumber;
        r: string;
        s: string;
    }>): ContractTxFunctionObj<[Array<{
        orderHash: string;
        status: number;
        takerTokenFilledAmount: BigNumber;
    }>, BigNumber[], boolean[]]>;
    /**
     * Batch version of `getRfqOrderRelevantState()`, without reverting.
 * Orders that would normally cause `getRfqOrderRelevantState()`
 * to revert will have empty results.
      * @param orders The RFQ orders.
      * @param signatures The order signatures.
     */
    batchGetRfqOrderRelevantStates(orders: Array<{
        makerToken: string;
        takerToken: string;
        makerAmount: BigNumber;
        takerAmount: BigNumber;
        maker: string;
        taker: string;
        txOrigin: string;
        pool: string;
        expiry: BigNumber;
        salt: BigNumber;
    }>, signatures: Array<{
        signatureType: number | BigNumber;
        v: number | BigNumber;
        r: string;
        s: string;
    }>): ContractTxFunctionObj<[Array<{
        orderHash: string;
        status: number;
        takerTokenFilledAmount: BigNumber;
    }>, BigNumber[], boolean[]]>;
    /**
     * Cancel a single limit order. The caller must be the maker.
 * Silently succeeds if the order has already been cancelled.
      * @param order The limit order.
     */
    cancelLimitOrder(order: {
        makerToken: string;
        takerToken: string;
        makerAmount: BigNumber;
        takerAmount: BigNumber;
        takerTokenFeeAmount: BigNumber;
        maker: string;
        taker: string;
        sender: string;
        feeRecipient: string;
        pool: string;
        expiry: BigNumber;
        salt: BigNumber;
    }): ContractTxFunctionObj<void>;
    /**
     * Cancel all limit orders for a given maker and pair with a salt less
 * than the value provided. The caller must be the maker. Subsequent
 * calls to this function with the same caller and pair require the
 * new salt to be >= the old salt.
      * @param makerToken The maker token.
      * @param takerToken The taker token.
      * @param minValidSalt The new minimum valid salt.
     */
    cancelPairLimitOrders(makerToken: string, takerToken: string, minValidSalt: BigNumber): ContractTxFunctionObj<void>;
    /**
     * Cancel all RFQ orders for a given maker and pair with a salt less
 * than the value provided. The caller must be the maker. Subsequent
 * calls to this function with the same caller and pair require the
 * new salt to be >= the old salt.
      * @param makerToken The maker token.
      * @param takerToken The taker token.
      * @param minValidSalt The new minimum valid salt.
     */
    cancelPairRfqOrders(makerToken: string, takerToken: string, minValidSalt: BigNumber): ContractTxFunctionObj<void>;
    /**
     * Cancel a single RFQ order. The caller must be the maker.
 * Silently succeeds if the order has already been cancelled.
      * @param order The RFQ order.
     */
    cancelRfqOrder(order: {
        makerToken: string;
        takerToken: string;
        makerAmount: BigNumber;
        takerAmount: BigNumber;
        maker: string;
        taker: string;
        txOrigin: string;
        pool: string;
        expiry: BigNumber;
        salt: BigNumber;
    }): ContractTxFunctionObj<void>;
    /**
     * Get the canonical hash of a limit order.
      * @param order The limit order.
     */
    getLimitOrderHash(order: {
        makerToken: string;
        takerToken: string;
        makerAmount: BigNumber;
        takerAmount: BigNumber;
        takerTokenFeeAmount: BigNumber;
        maker: string;
        taker: string;
        sender: string;
        feeRecipient: string;
        pool: string;
        expiry: BigNumber;
        salt: BigNumber;
    }): ContractTxFunctionObj<string>;
    /**
     * Get the order info for a limit order.
      * @param order The limit order.
     */
    getLimitOrderInfo(order: {
        makerToken: string;
        takerToken: string;
        makerAmount: BigNumber;
        takerAmount: BigNumber;
        takerTokenFeeAmount: BigNumber;
        maker: string;
        taker: string;
        sender: string;
        feeRecipient: string;
        pool: string;
        expiry: BigNumber;
        salt: BigNumber;
    }): ContractTxFunctionObj<{
        orderHash: string;
        status: number;
        takerTokenFilledAmount: BigNumber;
    }>;
    /**
     * Get order info, fillable amount, and signature validity for a limit order.
 * Fillable amount is determined using balances and allowances of the maker.
      * @param order The limit order.
      * @param signature The order signature.
     */
    getLimitOrderRelevantState(order: {
        makerToken: string;
        takerToken: string;
        makerAmount: BigNumber;
        takerAmount: BigNumber;
        takerTokenFeeAmount: BigNumber;
        maker: string;
        taker: string;
        sender: string;
        feeRecipient: string;
        pool: string;
        expiry: BigNumber;
        salt: BigNumber;
    }, signature: {
        signatureType: number | BigNumber;
        v: number | BigNumber;
        r: string;
        s: string;
    }): ContractTxFunctionObj<[{
        orderHash: string;
        status: number;
        takerTokenFilledAmount: BigNumber;
    }, BigNumber, boolean]>;
    /**
     * Get the canonical hash of an RFQ order.
      * @param order The RFQ order.
     */
    getRfqOrderHash(order: {
        makerToken: string;
        takerToken: string;
        makerAmount: BigNumber;
        takerAmount: BigNumber;
        maker: string;
        taker: string;
        txOrigin: string;
        pool: string;
        expiry: BigNumber;
        salt: BigNumber;
    }): ContractTxFunctionObj<string>;
    /**
     * Get the order info for an RFQ order.
      * @param order The RFQ order.
     */
    getRfqOrderInfo(order: {
        makerToken: string;
        takerToken: string;
        makerAmount: BigNumber;
        takerAmount: BigNumber;
        maker: string;
        taker: string;
        txOrigin: string;
        pool: string;
        expiry: BigNumber;
        salt: BigNumber;
    }): ContractTxFunctionObj<{
        orderHash: string;
        status: number;
        takerTokenFilledAmount: BigNumber;
    }>;
    /**
     * Get order info, fillable amount, and signature validity for an RFQ order.
 * Fillable amount is determined using balances and allowances of the maker.
      * @param order The RFQ order.
      * @param signature The order signature.
     */
    getRfqOrderRelevantState(order: {
        makerToken: string;
        takerToken: string;
        makerAmount: BigNumber;
        takerAmount: BigNumber;
        maker: string;
        taker: string;
        txOrigin: string;
        pool: string;
        expiry: BigNumber;
        salt: BigNumber;
    }, signature: {
        signatureType: number | BigNumber;
        v: number | BigNumber;
        r: string;
        s: string;
    }): ContractTxFunctionObj<[{
        orderHash: string;
        status: number;
        takerTokenFilledAmount: BigNumber;
    }, BigNumber, boolean]>;
    /**
     * Subscribe to an event type emitted by the NativeOrdersCancellation contract.
     * @param eventName The NativeOrdersCancellation contract event you would like to subscribe to.
     * @param indexFilterValues An object where the keys are indexed args returned by the event and
     * the value is the value you are interested in. E.g `{maker: aUserAddressHex}`
     * @param callback Callback that gets called when a log is added/removed
     * @param isVerbose Enable verbose subscription warnings (e.g recoverable network issues encountered)
     * @return Subscription token used later to unsubscribe
     */
    subscribe<ArgsType extends NativeOrdersCancellationEventArgs>(eventName: NativeOrdersCancellationEvents, indexFilterValues: IndexedFilterValues, callback: EventCallback<ArgsType>, isVerbose?: boolean, blockPollingIntervalMs?: number): string;
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
     * @param eventName The NativeOrdersCancellation contract event you would like to subscribe to.
     * @param blockRange Block range to get logs from.
     * @param indexFilterValues An object where the keys are indexed args returned by the event and
     * the value is the value you are interested in. E.g `{_from: aUserAddressHex}`
     * @return Array of logs that match the parameters
     */
    getLogsAsync<ArgsType extends NativeOrdersCancellationEventArgs>(eventName: NativeOrdersCancellationEvents, blockRange: BlockRange, indexFilterValues: IndexedFilterValues): Promise<Array<LogWithDecodedArgs<ArgsType>>>;
    constructor(address: string, supportedProvider: SupportedProvider, txDefaults?: Partial<TxData>, logDecodeDependencies?: {
        [contractName: string]: ContractAbi;
    }, deployedBytecode?: string | undefined);
}
//# sourceMappingURL=native_orders_cancellation.d.ts.map