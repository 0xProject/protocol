import { ContractTxFunctionObj, BaseContract } from '@0x/base-contract';
import { ContractAbi, ContractArtifact, TxData, SupportedProvider } from 'ethereum-types';
import { BigNumber } from '@0x/utils';
import { SimpleContractArtifact } from '@0x/types';
import { Web3Wrapper } from '@0x/web3-wrapper';
export declare class NativeOrdersInfoContract extends BaseContract {
    /**
     * @ignore
     */
    static deployedBytecode: string | undefined;
    static contractName: string;
    private readonly _methodABIIndex;
    static deployFrom0xArtifactAsync(artifact: ContractArtifact | SimpleContractArtifact, supportedProvider: SupportedProvider, txDefaults: Partial<TxData>, logDecodeDependencies: {
        [contractName: string]: (ContractArtifact | SimpleContractArtifact);
    }): Promise<NativeOrdersInfoContract>;
    static deployWithLibrariesFrom0xArtifactAsync(artifact: ContractArtifact, libraryArtifacts: {
        [libraryName: string]: ContractArtifact;
    }, supportedProvider: SupportedProvider, txDefaults: Partial<TxData>, logDecodeDependencies: {
        [contractName: string]: (ContractArtifact | SimpleContractArtifact);
    }): Promise<NativeOrdersInfoContract>;
    static deployAsync(bytecode: string, abi: ContractAbi, supportedProvider: SupportedProvider, txDefaults: Partial<TxData>, logDecodeDependencies: {
        [contractName: string]: ContractAbi;
    }): Promise<NativeOrdersInfoContract>;
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
    constructor(address: string, supportedProvider: SupportedProvider, txDefaults?: Partial<TxData>, logDecodeDependencies?: {
        [contractName: string]: ContractAbi;
    }, deployedBytecode?: string | undefined);
}
//# sourceMappingURL=native_orders_info.d.ts.map