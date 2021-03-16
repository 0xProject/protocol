import { ContractTxFunctionObj, BaseContract } from '@0x/base-contract';
import { BlockRange, ContractAbi, ContractArtifact, DecodedLogArgs, LogWithDecodedArgs, TxData, SupportedProvider } from 'ethereum-types';
import { EventCallback, IndexedFilterValues, SimpleContractArtifact } from '@0x/types';
import { Web3Wrapper } from '@0x/web3-wrapper';
export declare type PermissionlessTransformerDeployerEventArgs = PermissionlessTransformerDeployerDeployedEventArgs;
export declare enum PermissionlessTransformerDeployerEvents {
    Deployed = "Deployed"
}
export interface PermissionlessTransformerDeployerDeployedEventArgs extends DecodedLogArgs {
    deployedAddress: string;
    salt: string;
    sender: string;
}
export declare class PermissionlessTransformerDeployerContract extends BaseContract {
    /**
     * @ignore
     */
    static deployedBytecode: string | undefined;
    static contractName: string;
    private readonly _methodABIIndex;
    private readonly _subscriptionManager;
    static deployFrom0xArtifactAsync(artifact: ContractArtifact | SimpleContractArtifact, supportedProvider: SupportedProvider, txDefaults: Partial<TxData>, logDecodeDependencies: {
        [contractName: string]: (ContractArtifact | SimpleContractArtifact);
    }): Promise<PermissionlessTransformerDeployerContract>;
    static deployWithLibrariesFrom0xArtifactAsync(artifact: ContractArtifact, libraryArtifacts: {
        [libraryName: string]: ContractArtifact;
    }, supportedProvider: SupportedProvider, txDefaults: Partial<TxData>, logDecodeDependencies: {
        [contractName: string]: (ContractArtifact | SimpleContractArtifact);
    }): Promise<PermissionlessTransformerDeployerContract>;
    static deployAsync(bytecode: string, abi: ContractAbi, supportedProvider: SupportedProvider, txDefaults: Partial<TxData>, logDecodeDependencies: {
        [contractName: string]: ContractAbi;
    }): Promise<PermissionlessTransformerDeployerContract>;
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
     * Deploy a new contract. Any attached ETH will be forwarded.
     */
    deploy(bytecode: string, salt: string): ContractTxFunctionObj<string>;
    /**
     * Checks whether a given address is safe to be called via
 * delegatecall. A contract is considered unsafe if it includes any
 * of the following opcodes: CALLCODE, DELEGATECALL, SELFDESTRUCT,
 * CREATE, CREATE2, SLOAD, and STORE. This code is adapted from
 * https://github.com/dharma-eng/dharma-smart-wallet/blob/master/contracts/helpers/IndestructibleRegistry.sol
      * @param target The address to check.
     */
    isDelegateCallSafe(target: string): ContractTxFunctionObj<boolean>;
    toDeploymentSalt(index_0: string): ContractTxFunctionObj<string>;
    toInitCodeHash(index_0: string): ContractTxFunctionObj<string>;
    /**
     * Subscribe to an event type emitted by the PermissionlessTransformerDeployer contract.
     * @param eventName The PermissionlessTransformerDeployer contract event you would like to subscribe to.
     * @param indexFilterValues An object where the keys are indexed args returned by the event and
     * the value is the value you are interested in. E.g `{maker: aUserAddressHex}`
     * @param callback Callback that gets called when a log is added/removed
     * @param isVerbose Enable verbose subscription warnings (e.g recoverable network issues encountered)
     * @return Subscription token used later to unsubscribe
     */
    subscribe<ArgsType extends PermissionlessTransformerDeployerEventArgs>(eventName: PermissionlessTransformerDeployerEvents, indexFilterValues: IndexedFilterValues, callback: EventCallback<ArgsType>, isVerbose?: boolean, blockPollingIntervalMs?: number): string;
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
     * @param eventName The PermissionlessTransformerDeployer contract event you would like to subscribe to.
     * @param blockRange Block range to get logs from.
     * @param indexFilterValues An object where the keys are indexed args returned by the event and
     * the value is the value you are interested in. E.g `{_from: aUserAddressHex}`
     * @return Array of logs that match the parameters
     */
    getLogsAsync<ArgsType extends PermissionlessTransformerDeployerEventArgs>(eventName: PermissionlessTransformerDeployerEvents, blockRange: BlockRange, indexFilterValues: IndexedFilterValues): Promise<Array<LogWithDecodedArgs<ArgsType>>>;
    constructor(address: string, supportedProvider: SupportedProvider, txDefaults?: Partial<TxData>, logDecodeDependencies?: {
        [contractName: string]: ContractAbi;
    }, deployedBytecode?: string | undefined);
}
//# sourceMappingURL=permissionless_transformer_deployer.d.ts.map