import { ContractTxFunctionObj, BaseContract } from '@0x/base-contract';
import { ContractAbi, ContractArtifact, TxData, SupportedProvider } from 'ethereum-types';
import { BigNumber } from '@0x/utils';
import { SimpleContractArtifact } from '@0x/types';
import { Web3Wrapper } from '@0x/web3-wrapper';
export declare class ILiquidityProviderSandboxContract extends BaseContract {
    /**
     * @ignore
     */
    static deployedBytecode: string | undefined;
    static contractName: string;
    private readonly _methodABIIndex;
    static deployFrom0xArtifactAsync(artifact: ContractArtifact | SimpleContractArtifact, supportedProvider: SupportedProvider, txDefaults: Partial<TxData>, logDecodeDependencies: {
        [contractName: string]: (ContractArtifact | SimpleContractArtifact);
    }): Promise<ILiquidityProviderSandboxContract>;
    static deployWithLibrariesFrom0xArtifactAsync(artifact: ContractArtifact, libraryArtifacts: {
        [libraryName: string]: ContractArtifact;
    }, supportedProvider: SupportedProvider, txDefaults: Partial<TxData>, logDecodeDependencies: {
        [contractName: string]: (ContractArtifact | SimpleContractArtifact);
    }): Promise<ILiquidityProviderSandboxContract>;
    static deployAsync(bytecode: string, abi: ContractAbi, supportedProvider: SupportedProvider, txDefaults: Partial<TxData>, logDecodeDependencies: {
        [contractName: string]: ContractAbi;
    }): Promise<ILiquidityProviderSandboxContract>;
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
     * Calls `sellEthForToken` on the given `provider` contract to
 * trigger a trade.
      * @param provider The address of the on-chain liquidity provider.
      * @param outputToken The token being bought.
      * @param recipient The recipient of the bought tokens.
      * @param minBuyAmount The minimum acceptable amount of `outputToken` to buy.
      * @param auxiliaryData Auxiliary data supplied to the `provider` contract.
     */
    executeSellEthForToken(provider: string, outputToken: string, recipient: string, minBuyAmount: BigNumber, auxiliaryData: string): ContractTxFunctionObj<void>;
    /**
     * Calls `sellTokenForEth` on the given `provider` contract to
 * trigger a trade.
      * @param provider The address of the on-chain liquidity provider.
      * @param inputToken The token being sold.
      * @param recipient The recipient of the bought tokens.
      * @param minBuyAmount The minimum acceptable amount of ETH to buy.
      * @param auxiliaryData Auxiliary data supplied to the `provider` contract.
     */
    executeSellTokenForEth(provider: string, inputToken: string, recipient: string, minBuyAmount: BigNumber, auxiliaryData: string): ContractTxFunctionObj<void>;
    /**
     * Calls `sellTokenForToken` on the given `provider` contract to
 * trigger a trade.
      * @param provider The address of the on-chain liquidity provider.
      * @param inputToken The token being sold.
      * @param outputToken The token being bought.
      * @param recipient The recipient of the bought tokens.
      * @param minBuyAmount The minimum acceptable amount of `outputToken` to buy.
      * @param auxiliaryData Auxiliary data supplied to the `provider` contract.
     */
    executeSellTokenForToken(provider: string, inputToken: string, outputToken: string, recipient: string, minBuyAmount: BigNumber, auxiliaryData: string): ContractTxFunctionObj<void>;
    constructor(address: string, supportedProvider: SupportedProvider, txDefaults?: Partial<TxData>, logDecodeDependencies?: {
        [contractName: string]: ContractAbi;
    }, deployedBytecode?: string | undefined);
}
//# sourceMappingURL=i_liquidity_provider_sandbox.d.ts.map