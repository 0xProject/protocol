import { ContractTxFunctionObj, BaseContract } from '@0x/base-contract';
import { ContractAbi, ContractArtifact, TxData, SupportedProvider } from 'ethereum-types';
import { BigNumber } from '@0x/utils';
import { SimpleContractArtifact } from '@0x/types';
import { Web3Wrapper } from '@0x/web3-wrapper';
export declare class BatchFillNativeOrdersFeatureContract extends BaseContract {
    /**
     * @ignore
     */
    static deployedBytecode: string | undefined;
    static contractName: string;
    private readonly _methodABIIndex;
    static deployFrom0xArtifactAsync(artifact: ContractArtifact | SimpleContractArtifact, supportedProvider: SupportedProvider, txDefaults: Partial<TxData>, logDecodeDependencies: {
        [contractName: string]: (ContractArtifact | SimpleContractArtifact);
    }, zeroExAddress: string): Promise<BatchFillNativeOrdersFeatureContract>;
    static deployWithLibrariesFrom0xArtifactAsync(artifact: ContractArtifact, libraryArtifacts: {
        [libraryName: string]: ContractArtifact;
    }, supportedProvider: SupportedProvider, txDefaults: Partial<TxData>, logDecodeDependencies: {
        [contractName: string]: (ContractArtifact | SimpleContractArtifact);
    }, zeroExAddress: string): Promise<BatchFillNativeOrdersFeatureContract>;
    static deployAsync(bytecode: string, abi: ContractAbi, supportedProvider: SupportedProvider, txDefaults: Partial<TxData>, logDecodeDependencies: {
        [contractName: string]: ContractAbi;
    }, zeroExAddress: string): Promise<BatchFillNativeOrdersFeatureContract>;
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
     * Initialize and register this feature.
 * Should be delegatecalled by `Migrate.migrate()`.
     */
    migrate(): ContractTxFunctionObj<string>;
    constructor(address: string, supportedProvider: SupportedProvider, txDefaults?: Partial<TxData>, logDecodeDependencies?: {
        [contractName: string]: ContractAbi;
    }, deployedBytecode?: string | undefined);
}
//# sourceMappingURL=batch_fill_native_orders_feature.d.ts.map