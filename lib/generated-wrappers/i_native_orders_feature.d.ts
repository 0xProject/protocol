import { ContractTxFunctionObj, BaseContract } from '@0x/base-contract';
import { BlockRange, ContractAbi, ContractArtifact, DecodedLogArgs, LogWithDecodedArgs, TxData, SupportedProvider } from 'ethereum-types';
import { BigNumber } from '@0x/utils';
import { EventCallback, IndexedFilterValues, SimpleContractArtifact } from '@0x/types';
import { Web3Wrapper } from '@0x/web3-wrapper';
export declare type INativeOrdersFeatureEventArgs = INativeOrdersFeatureLimitOrderFilledEventArgs | INativeOrdersFeatureOrderCancelledEventArgs | INativeOrdersFeaturePairCancelledLimitOrdersEventArgs | INativeOrdersFeaturePairCancelledRfqOrdersEventArgs | INativeOrdersFeatureRfqOrderFilledEventArgs | INativeOrdersFeatureRfqOrderOriginsAllowedEventArgs;
export declare enum INativeOrdersFeatureEvents {
    LimitOrderFilled = "LimitOrderFilled",
    OrderCancelled = "OrderCancelled",
    PairCancelledLimitOrders = "PairCancelledLimitOrders",
    PairCancelledRfqOrders = "PairCancelledRfqOrders",
    RfqOrderFilled = "RfqOrderFilled",
    RfqOrderOriginsAllowed = "RfqOrderOriginsAllowed"
}
export interface INativeOrdersFeatureLimitOrderFilledEventArgs extends DecodedLogArgs {
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
export interface INativeOrdersFeatureOrderCancelledEventArgs extends DecodedLogArgs {
    orderHash: string;
    maker: string;
}
export interface INativeOrdersFeaturePairCancelledLimitOrdersEventArgs extends DecodedLogArgs {
    maker: string;
    makerToken: string;
    takerToken: string;
    minValidSalt: BigNumber;
}
export interface INativeOrdersFeaturePairCancelledRfqOrdersEventArgs extends DecodedLogArgs {
    maker: string;
    makerToken: string;
    takerToken: string;
    minValidSalt: BigNumber;
}
export interface INativeOrdersFeatureRfqOrderFilledEventArgs extends DecodedLogArgs {
    orderHash: string;
    maker: string;
    taker: string;
    makerToken: string;
    takerToken: string;
    takerTokenFilledAmount: BigNumber;
    makerTokenFilledAmount: BigNumber;
    pool: string;
}
export interface INativeOrdersFeatureRfqOrderOriginsAllowedEventArgs extends DecodedLogArgs {
    origin: string;
    addrs: string[];
    allowed: boolean;
}
export declare class INativeOrdersFeatureContract extends BaseContract {
    /**
     * @ignore
     */
    static deployedBytecode: string | undefined;
    static contractName: string;
    private readonly _methodABIIndex;
    private readonly _subscriptionManager;
    static deployFrom0xArtifactAsync(artifact: ContractArtifact | SimpleContractArtifact, supportedProvider: SupportedProvider, txDefaults: Partial<TxData>, logDecodeDependencies: {
        [contractName: string]: (ContractArtifact | SimpleContractArtifact);
    }): Promise<INativeOrdersFeatureContract>;
    static deployWithLibrariesFrom0xArtifactAsync(artifact: ContractArtifact, libraryArtifacts: {
        [libraryName: string]: ContractArtifact;
    }, supportedProvider: SupportedProvider, txDefaults: Partial<TxData>, logDecodeDependencies: {
        [contractName: string]: (ContractArtifact | SimpleContractArtifact);
    }): Promise<INativeOrdersFeatureContract>;
    static deployAsync(bytecode: string, abi: ContractAbi, supportedProvider: SupportedProvider, txDefaults: Partial<TxData>, logDecodeDependencies: {
        [contractName: string]: ContractAbi;
    }): Promise<INativeOrdersFeatureContract>;
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
     * Fill a limit order. Internal variant. ETH protocol fees can be
 * attached to this call. Any unspent ETH will be refunded to
 * `msg.sender` (not `sender`).
      * @param order The limit order.
      * @param signature The order signature.
      * @param takerTokenFillAmount Maximum taker token to fill this order with.
      * @param taker The order taker.
      * @param sender The order sender.
     */
    _fillLimitOrder(order: {
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
    }, takerTokenFillAmount: BigNumber, taker: string, sender: string): ContractTxFunctionObj<[BigNumber, BigNumber]>;
    /**
     * Fill an RFQ order. Internal variant.
      * @param order The RFQ order.
      * @param signature The order signature.
      * @param takerTokenFillAmount Maximum taker token to fill this order with.
      * @param taker The order taker.
     */
    _fillRfqOrder(order: {
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
    }, takerTokenFillAmount: BigNumber, taker: string): ContractTxFunctionObj<[BigNumber, BigNumber]>;
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
     * Fill a limit order. The taker and sender will be the caller.
      * @param order The limit order. ETH protocol fees can be      attached to this
     *     call. Any unspent ETH will be refunded to      the caller.
      * @param signature The order signature.
      * @param takerTokenFillAmount Maximum taker token amount to fill this order
     *     with.
     */
    fillLimitOrder(order: {
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
    }, takerTokenFillAmount: BigNumber): ContractTxFunctionObj<[BigNumber, BigNumber]>;
    /**
     * Fill an RFQ order for exactly `takerTokenFillAmount` taker tokens.
 * The taker will be the caller. ETH protocol fees can be
 * attached to this call. Any unspent ETH will be refunded to
 * the caller.
      * @param order The limit order.
      * @param signature The order signature.
      * @param takerTokenFillAmount How much taker token to fill this order with.
     */
    fillOrKillLimitOrder(order: {
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
    }, takerTokenFillAmount: BigNumber): ContractTxFunctionObj<BigNumber>;
    /**
     * Fill an RFQ order for exactly `takerTokenFillAmount` taker tokens.
 * The taker will be the caller.
      * @param order The RFQ order.
      * @param signature The order signature.
      * @param takerTokenFillAmount How much taker token to fill this order with.
     */
    fillOrKillRfqOrder(order: {
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
    }, takerTokenFillAmount: BigNumber): ContractTxFunctionObj<BigNumber>;
    /**
     * Fill an RFQ order for up to `takerTokenFillAmount` taker tokens.
 * The taker will be the caller.
      * @param order The RFQ order.
      * @param signature The order signature.
      * @param takerTokenFillAmount Maximum taker token amount to fill this order
     *     with.
     */
    fillRfqOrder(order: {
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
    }, takerTokenFillAmount: BigNumber): ContractTxFunctionObj<[BigNumber, BigNumber]>;
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
     * Get the protocol fee multiplier. This should be multiplied by the
 * gas price to arrive at the required protocol fee to fill a native order.
     */
    getProtocolFeeMultiplier(): ContractTxFunctionObj<number>;
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
     * Mark what tx.origin addresses are allowed to fill an order that
 * specifies the message sender as its txOrigin.
      * @param origins An array of origin addresses to update.
      * @param allowed True to register, false to unregister.
     */
    registerAllowedRfqOrigins(origins: string[], allowed: boolean): ContractTxFunctionObj<void>;
    /**
     * Transfers protocol fees from the `FeeCollector` pools into
 * the staking contract.
      * @param poolIds Staking pool IDs
     */
    transferProtocolFeesForPools(poolIds: string[]): ContractTxFunctionObj<void>;
    /**
     * Subscribe to an event type emitted by the INativeOrdersFeature contract.
     * @param eventName The INativeOrdersFeature contract event you would like to subscribe to.
     * @param indexFilterValues An object where the keys are indexed args returned by the event and
     * the value is the value you are interested in. E.g `{maker: aUserAddressHex}`
     * @param callback Callback that gets called when a log is added/removed
     * @param isVerbose Enable verbose subscription warnings (e.g recoverable network issues encountered)
     * @return Subscription token used later to unsubscribe
     */
    subscribe<ArgsType extends INativeOrdersFeatureEventArgs>(eventName: INativeOrdersFeatureEvents, indexFilterValues: IndexedFilterValues, callback: EventCallback<ArgsType>, isVerbose?: boolean, blockPollingIntervalMs?: number): string;
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
     * @param eventName The INativeOrdersFeature contract event you would like to subscribe to.
     * @param blockRange Block range to get logs from.
     * @param indexFilterValues An object where the keys are indexed args returned by the event and
     * the value is the value you are interested in. E.g `{_from: aUserAddressHex}`
     * @return Array of logs that match the parameters
     */
    getLogsAsync<ArgsType extends INativeOrdersFeatureEventArgs>(eventName: INativeOrdersFeatureEvents, blockRange: BlockRange, indexFilterValues: IndexedFilterValues): Promise<Array<LogWithDecodedArgs<ArgsType>>>;
    constructor(address: string, supportedProvider: SupportedProvider, txDefaults?: Partial<TxData>, logDecodeDependencies?: {
        [contractName: string]: ContractAbi;
    }, deployedBytecode?: string | undefined);
}
//# sourceMappingURL=i_native_orders_feature.d.ts.map