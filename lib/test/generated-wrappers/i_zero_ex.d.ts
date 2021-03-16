import { ContractTxFunctionObj, BaseContract } from '@0x/base-contract';
import { BlockRange, ContractAbi, ContractArtifact, DecodedLogArgs, LogWithDecodedArgs, TxData, SupportedProvider } from 'ethereum-types';
import { BigNumber } from '@0x/utils';
import { EventCallback, IndexedFilterValues, SimpleContractArtifact } from '@0x/types';
import { Web3Wrapper } from '@0x/web3-wrapper';
export declare type IZeroExEventArgs = IZeroExExpiredRfqOrderEventArgs | IZeroExLimitOrderFilledEventArgs | IZeroExLiquidityProviderSwapEventArgs | IZeroExMetaTransactionExecutedEventArgs | IZeroExMigratedEventArgs | IZeroExOrderCancelledEventArgs | IZeroExOwnershipTransferredEventArgs | IZeroExPairCancelledLimitOrdersEventArgs | IZeroExPairCancelledRfqOrdersEventArgs | IZeroExProxyFunctionUpdatedEventArgs | IZeroExQuoteSignerUpdatedEventArgs | IZeroExRfqOrderFilledEventArgs | IZeroExRfqOrderOriginsAllowedEventArgs | IZeroExTransformedERC20EventArgs | IZeroExTransformerDeployerUpdatedEventArgs;
export declare enum IZeroExEvents {
    ExpiredRfqOrder = "ExpiredRfqOrder",
    LimitOrderFilled = "LimitOrderFilled",
    LiquidityProviderSwap = "LiquidityProviderSwap",
    MetaTransactionExecuted = "MetaTransactionExecuted",
    Migrated = "Migrated",
    OrderCancelled = "OrderCancelled",
    OwnershipTransferred = "OwnershipTransferred",
    PairCancelledLimitOrders = "PairCancelledLimitOrders",
    PairCancelledRfqOrders = "PairCancelledRfqOrders",
    ProxyFunctionUpdated = "ProxyFunctionUpdated",
    QuoteSignerUpdated = "QuoteSignerUpdated",
    RfqOrderFilled = "RfqOrderFilled",
    RfqOrderOriginsAllowed = "RfqOrderOriginsAllowed",
    TransformedERC20 = "TransformedERC20",
    TransformerDeployerUpdated = "TransformerDeployerUpdated"
}
export interface IZeroExExpiredRfqOrderEventArgs extends DecodedLogArgs {
    orderHash: string;
    maker: string;
    expiry: BigNumber;
}
export interface IZeroExLimitOrderFilledEventArgs extends DecodedLogArgs {
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
export interface IZeroExLiquidityProviderSwapEventArgs extends DecodedLogArgs {
    inputToken: string;
    outputToken: string;
    inputTokenAmount: BigNumber;
    outputTokenAmount: BigNumber;
    provider: string;
    recipient: string;
}
export interface IZeroExMetaTransactionExecutedEventArgs extends DecodedLogArgs {
    hash: string;
    selector: string;
    signer: string;
    sender: string;
}
export interface IZeroExMigratedEventArgs extends DecodedLogArgs {
    caller: string;
    migrator: string;
    newOwner: string;
}
export interface IZeroExOrderCancelledEventArgs extends DecodedLogArgs {
    orderHash: string;
    maker: string;
}
export interface IZeroExOwnershipTransferredEventArgs extends DecodedLogArgs {
    previousOwner: string;
    newOwner: string;
}
export interface IZeroExPairCancelledLimitOrdersEventArgs extends DecodedLogArgs {
    maker: string;
    makerToken: string;
    takerToken: string;
    minValidSalt: BigNumber;
}
export interface IZeroExPairCancelledRfqOrdersEventArgs extends DecodedLogArgs {
    maker: string;
    makerToken: string;
    takerToken: string;
    minValidSalt: BigNumber;
}
export interface IZeroExProxyFunctionUpdatedEventArgs extends DecodedLogArgs {
    selector: string;
    oldImpl: string;
    newImpl: string;
}
export interface IZeroExQuoteSignerUpdatedEventArgs extends DecodedLogArgs {
    quoteSigner: string;
}
export interface IZeroExRfqOrderFilledEventArgs extends DecodedLogArgs {
    orderHash: string;
    maker: string;
    taker: string;
    makerToken: string;
    takerToken: string;
    takerTokenFilledAmount: BigNumber;
    makerTokenFilledAmount: BigNumber;
    pool: string;
}
export interface IZeroExRfqOrderOriginsAllowedEventArgs extends DecodedLogArgs {
    origin: string;
    addrs: string[];
    allowed: boolean;
}
export interface IZeroExTransformedERC20EventArgs extends DecodedLogArgs {
    taker: string;
    inputToken: string;
    outputToken: string;
    inputTokenAmount: BigNumber;
    outputTokenAmount: BigNumber;
}
export interface IZeroExTransformerDeployerUpdatedEventArgs extends DecodedLogArgs {
    transformerDeployer: string;
}
export declare class IZeroExContract extends BaseContract {
    /**
     * @ignore
     */
    static deployedBytecode: string | undefined;
    static contractName: string;
    private readonly _methodABIIndex;
    private readonly _subscriptionManager;
    static deployFrom0xArtifactAsync(artifact: ContractArtifact | SimpleContractArtifact, supportedProvider: SupportedProvider, txDefaults: Partial<TxData>, logDecodeDependencies: {
        [contractName: string]: (ContractArtifact | SimpleContractArtifact);
    }): Promise<IZeroExContract>;
    static deployWithLibrariesFrom0xArtifactAsync(artifact: ContractArtifact, libraryArtifacts: {
        [libraryName: string]: ContractArtifact;
    }, supportedProvider: SupportedProvider, txDefaults: Partial<TxData>, logDecodeDependencies: {
        [contractName: string]: (ContractArtifact | SimpleContractArtifact);
    }): Promise<IZeroExContract>;
    static deployAsync(bytecode: string, abi: ContractAbi, supportedProvider: SupportedProvider, txDefaults: Partial<TxData>, logDecodeDependencies: {
        [contractName: string]: ContractAbi;
    }): Promise<IZeroExContract>;
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
     * Transfers ERC20 tokens from `owner` to `to`.
 * Only callable from within.
      * @param token The token to spend.
      * @param owner The owner of the tokens.
      * @param to The recipient of the tokens.
      * @param amount The amount of `token` to transfer.
     */
    _spendERC20Tokens(token: string, owner: string, to: string, amount: BigNumber): ContractTxFunctionObj<void>;
    /**
     * Internal version of `transformERC20()`. Only callable from within.
      * @param args A `TransformERC20Args` struct.
     */
    _transformERC20(args: {
        taker: string;
        inputToken: string;
        outputToken: string;
        inputTokenAmount: BigNumber;
        minOutputTokenAmount: BigNumber;
        transformations: Array<{
            deploymentNonce: number | BigNumber;
            data: string;
        }>;
    }): ContractTxFunctionObj<BigNumber>;
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
     * Execute multiple meta-transactions.
      * @param mtxs The meta-transactions.
      * @param signatures The signature by each respective `mtx.signer`.
     */
    batchExecuteMetaTransactions(mtxs: Array<{
        signer: string;
        sender: string;
        minGasPrice: BigNumber;
        maxGasPrice: BigNumber;
        expirationTimeSeconds: BigNumber;
        salt: BigNumber;
        callData: string;
        value: BigNumber;
        feeToken: string;
        feeAmount: BigNumber;
    }>, signatures: Array<{
        signatureType: number | BigNumber;
        v: number | BigNumber;
        r: string;
        s: string;
    }>): ContractTxFunctionObj<string[]>;
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
     * Fills multiple limit orders.
      * @param orders Array of limit orders.
      * @param signatures Array of signatures corresponding to each order.
      * @param takerTokenFillAmounts Array of desired amounts to fill each order.
      * @param revertIfIncomplete If true, reverts if this function fails to
     *     fill the full fill amount for any individual order.
     */
    batchFillLimitOrders(orders: Array<{
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
    }>, takerTokenFillAmounts: BigNumber[], revertIfIncomplete: boolean): ContractTxFunctionObj<[BigNumber[], BigNumber[]]>;
    /**
     * Fills multiple RFQ orders.
      * @param orders Array of RFQ orders.
      * @param signatures Array of signatures corresponding to each order.
      * @param takerTokenFillAmounts Array of desired amounts to fill each order.
      * @param revertIfIncomplete If true, reverts if this function fails to
     *     fill the full fill amount for any individual order.
     */
    batchFillRfqOrders(orders: Array<{
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
    }>, takerTokenFillAmounts: BigNumber[], revertIfIncomplete: boolean): ContractTxFunctionObj<[BigNumber[], BigNumber[]]>;
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
     * Deploy a new flash wallet instance and replace the current one with it.
 * Useful if we somehow break the current wallet instance.
 * Only callable by the owner.
     */
    createTransformWallet(): ContractTxFunctionObj<string>;
    /**
     * Execute a single meta-transaction.
      * @param mtx The meta-transaction.
      * @param signature The signature by `mtx.signer`.
     */
    executeMetaTransaction(mtx: {
        signer: string;
        sender: string;
        minGasPrice: BigNumber;
        maxGasPrice: BigNumber;
        expirationTimeSeconds: BigNumber;
        salt: BigNumber;
        callData: string;
        value: BigNumber;
        feeToken: string;
        feeAmount: BigNumber;
    }, signature: {
        signatureType: number | BigNumber;
        v: number | BigNumber;
        r: string;
        s: string;
    }): ContractTxFunctionObj<string>;
    /**
     * Register or replace a function.
      * @param selector The function selector.
      * @param impl The implementation contract for the function.
     */
    extend(selector: string, impl: string): ContractTxFunctionObj<void>;
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
     * Get the address of the allowance target.
     */
    getAllowanceTarget(): ContractTxFunctionObj<string>;
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
     * Get the block at which a meta-transaction has been executed.
      * @param mtx The meta-transaction.
     */
    getMetaTransactionExecutedBlock(mtx: {
        signer: string;
        sender: string;
        minGasPrice: BigNumber;
        maxGasPrice: BigNumber;
        expirationTimeSeconds: BigNumber;
        salt: BigNumber;
        callData: string;
        value: BigNumber;
        feeToken: string;
        feeAmount: BigNumber;
    }): ContractTxFunctionObj<BigNumber>;
    /**
     * Get the EIP712 hash of a meta-transaction.
      * @param mtx The meta-transaction.
     */
    getMetaTransactionHash(mtx: {
        signer: string;
        sender: string;
        minGasPrice: BigNumber;
        maxGasPrice: BigNumber;
        expirationTimeSeconds: BigNumber;
        salt: BigNumber;
        callData: string;
        value: BigNumber;
        feeToken: string;
        feeAmount: BigNumber;
    }): ContractTxFunctionObj<string>;
    /**
     * Get the block at which a meta-transaction hash has been executed.
      * @param mtxHash The meta-transaction hash.
     */
    getMetaTransactionHashExecutedBlock(mtxHash: string): ContractTxFunctionObj<BigNumber>;
    /**
     * Get the protocol fee multiplier. This should be multiplied by the
 * gas price to arrive at the required protocol fee to fill a native order.
     */
    getProtocolFeeMultiplier(): ContractTxFunctionObj<number>;
    /**
     * Return the optional signer for `transformERC20()` calldata.
     */
    getQuoteSigner(): ContractTxFunctionObj<string>;
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
     * Retrieve an entry in the rollback history for a function.
      * @param selector The function selector.
      * @param idx The index in the rollback history.
     */
    getRollbackEntryAtIndex(selector: string, idx: BigNumber): ContractTxFunctionObj<string>;
    /**
     * Retrieve the length of the rollback history for a function.
      * @param selector The function selector.
     */
    getRollbackLength(selector: string): ContractTxFunctionObj<BigNumber>;
    /**
     * Gets the maximum amount of an ERC20 token `token` that can be
 * pulled from `owner`.
      * @param token The token to spend.
      * @param owner The owner of the tokens.
     */
    getSpendableERC20BalanceOf(token: string, owner: string): ContractTxFunctionObj<BigNumber>;
    /**
     * Return the current wallet instance that will serve as the execution
 * context for transformations.
     */
    getTransformWallet(): ContractTxFunctionObj<string>;
    /**
     * Return the allowed deployer for transformers.
     */
    getTransformerDeployer(): ContractTxFunctionObj<string>;
    /**
     * Execute a migration function in the context of the ZeroEx contract.
 * The result of the function being called should be the magic bytes
 * 0x2c64c5ef (`keccack('MIGRATE_SUCCESS')`). Only callable by the owner.
 * The owner will be temporarily set to `address(this)` inside the call.
 * Before returning, the owner will be set to `newOwner`.
      * @param target The migrator contract address.
      * @param data The call data.
      * @param newOwner The address of the new owner.
     */
    migrate(target: string, data: string, newOwner: string): ContractTxFunctionObj<void>;
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
    /**
     * The owner of this contract.
     */
    owner(): ContractTxFunctionObj<string>;
    /**
     * Mark what tx.origin addresses are allowed to fill an order that
 * specifies the message sender as its txOrigin.
      * @param origins An array of origin addresses to update.
      * @param allowed True to register, false to unregister.
     */
    registerAllowedRfqOrigins(origins: string[], allowed: boolean): ContractTxFunctionObj<void>;
    /**
     * Roll back to a prior implementation of a function.
      * @param selector The function selector.
      * @param targetImpl The address of an older implementation of the function.
     */
    rollback(selector: string, targetImpl: string): ContractTxFunctionObj<void>;
    /**
     * Sells `sellAmount` of `inputToken` to the liquidity provider
 * at the given `provider` address.
      * @param inputToken The token being sold.
      * @param outputToken The token being bought.
      * @param provider The address of the on-chain liquidity provider        to
     *     trade with.
      * @param recipient The recipient of the bought tokens. If equal to
     *     address(0), `msg.sender` is assumed to be the recipient.
      * @param sellAmount The amount of `inputToken` to sell.
      * @param minBuyAmount The minimum acceptable amount of `outputToken` to
     *     buy. Reverts if this amount is not satisfied.
      * @param auxiliaryData Auxiliary data supplied to the `provider` contract.
     */
    sellToLiquidityProvider(inputToken: string, outputToken: string, provider: string, recipient: string, sellAmount: BigNumber, minBuyAmount: BigNumber, auxiliaryData: string): ContractTxFunctionObj<BigNumber>;
    /**
     * Efficiently sell directly to uniswap/sushiswap.
      * @param tokens Sell path.
      * @param sellAmount of `tokens[0]` Amount to sell.
      * @param minBuyAmount Minimum amount of `tokens[-1]` to buy.
      * @param isSushi Use sushiswap if true.
     */
    sellToUniswap(tokens: string[], sellAmount: BigNumber, minBuyAmount: BigNumber, isSushi: boolean): ContractTxFunctionObj<BigNumber>;
    /**
     * Replace the optional signer for `transformERC20()` calldata.
 * Only callable by the owner.
      * @param quoteSigner The address of the new calldata signer.
     */
    setQuoteSigner(quoteSigner: string): ContractTxFunctionObj<void>;
    /**
     * Replace the allowed deployer for transformers.
 * Only callable by the owner.
      * @param transformerDeployer The address of the new trusted deployer
     *     for transformers.
     */
    setTransformerDeployer(transformerDeployer: string): ContractTxFunctionObj<void>;
    /**
     * Transfers ownership of the contract to a new address.
      * @param newOwner The address that will become the owner.
     */
    transferOwnership(newOwner: string): ContractTxFunctionObj<void>;
    /**
     * Transfers protocol fees from the `FeeCollector` pools into
 * the staking contract.
      * @param poolIds Staking pool IDs
     */
    transferProtocolFeesForPools(poolIds: string[]): ContractTxFunctionObj<void>;
    /**
     * Executes a series of transformations to convert an ERC20 `inputToken`
 * to an ERC20 `outputToken`.
      * @param inputToken The token being provided by the sender.        If
     *     `0xeee...`, ETH is implied and should be provided with the call.`
      * @param outputToken The token to be acquired by the sender.        `0xeee...`
     *     implies ETH.
      * @param inputTokenAmount The amount of `inputToken` to take from the sender.
      * @param minOutputTokenAmount The minimum amount of `outputToken` the sender
     *          must receive for the entire transformation to succeed.
      * @param transformations The transformations to execute on the token
     *     balance(s)        in sequence.
     */
    transformERC20(inputToken: string, outputToken: string, inputTokenAmount: BigNumber, minOutputTokenAmount: BigNumber, transformations: Array<{
        deploymentNonce: number | BigNumber;
        data: string;
    }>): ContractTxFunctionObj<BigNumber>;
    /**
     * Subscribe to an event type emitted by the IZeroEx contract.
     * @param eventName The IZeroEx contract event you would like to subscribe to.
     * @param indexFilterValues An object where the keys are indexed args returned by the event and
     * the value is the value you are interested in. E.g `{maker: aUserAddressHex}`
     * @param callback Callback that gets called when a log is added/removed
     * @param isVerbose Enable verbose subscription warnings (e.g recoverable network issues encountered)
     * @return Subscription token used later to unsubscribe
     */
    subscribe<ArgsType extends IZeroExEventArgs>(eventName: IZeroExEvents, indexFilterValues: IndexedFilterValues, callback: EventCallback<ArgsType>, isVerbose?: boolean, blockPollingIntervalMs?: number): string;
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
     * @param eventName The IZeroEx contract event you would like to subscribe to.
     * @param blockRange Block range to get logs from.
     * @param indexFilterValues An object where the keys are indexed args returned by the event and
     * the value is the value you are interested in. E.g `{_from: aUserAddressHex}`
     * @return Array of logs that match the parameters
     */
    getLogsAsync<ArgsType extends IZeroExEventArgs>(eventName: IZeroExEvents, blockRange: BlockRange, indexFilterValues: IndexedFilterValues): Promise<Array<LogWithDecodedArgs<ArgsType>>>;
    constructor(address: string, supportedProvider: SupportedProvider, txDefaults?: Partial<TxData>, logDecodeDependencies?: {
        [contractName: string]: ContractAbi;
    }, deployedBytecode?: string | undefined);
}
//# sourceMappingURL=i_zero_ex.d.ts.map