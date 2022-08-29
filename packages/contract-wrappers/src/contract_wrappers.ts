import { assert } from '@0x/assert';
import { ContractAddresses } from '@0x/contract-addresses';
import { AbiDecoder } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import { SupportedProvider } from 'ethereum-types';

import { ContractWrappersConfigSchema } from './contract_wrappers_config_schema';
import { CoordinatorContract } from './generated-wrappers/coordinator';
import { IZeroExContract } from './generated-wrappers/i_zero_ex';
import { StakingContract } from './generated-wrappers/staking';
import { WETH9Contract } from './generated-wrappers/weth9';
import { ContractWrappersConfig } from './types';
import { _getDefaultContractAddresses } from './utils/contract_addresses';

/**
 * The ContractWrappers class contains smart contract wrappers helpful when building on 0x protocol.
 */
export class ContractWrappers {
    /**
     * An index of the default contract addresses for this chain.
     */
    public contractAddresses: ContractAddresses;
    /**
     * An instance of the WETH9Contract class containing methods for interacting with the
     * WETH9 smart contract.
     */
    public weth9: WETH9Contract;
    /**
     * An instance of the StakingContract class containing methods for interacting with the Staking contracts.
     */
    public staking: StakingContract;
    /**
     * An instance of the IZeroExContract class containing methods for interacting with the Exchange Proxy.
     */
    public exchangeProxy: IZeroExContract;

    private readonly _web3Wrapper: Web3Wrapper;
    /**
     * Instantiates a new ContractWrappers instance.
     * @param   supportedProvider    The Provider instance you would like the contract-wrappers library to use for interacting with
     *                      the Ethereum network.
     * @param   config      The configuration object. Look up the type for the description.
     * @return  An instance of the ContractWrappers class.
     */
    constructor(supportedProvider: SupportedProvider, config: ContractWrappersConfig) {
        assert.doesConformToSchema('config', config, ContractWrappersConfigSchema);
        const txDefaults = {
            gasPrice: config.gasPrice,
        };
        this._web3Wrapper = new Web3Wrapper(supportedProvider, txDefaults);
        const contractsArray = [CoordinatorContract, StakingContract, WETH9Contract, IZeroExContract];
        contractsArray.forEach(contract => {
            this._web3Wrapper.abiDecoder.addABI(contract.ABI(), contract.contractName);
        });
        const contractAddresses =
            config.contractAddresses === undefined
                ? _getDefaultContractAddresses(config.chainId)
                : config.contractAddresses;
        this.weth9 = new WETH9Contract(contractAddresses.etherToken, this.getProvider());
        this.staking = new StakingContract(contractAddresses.stakingProxy, this.getProvider());
        this.exchangeProxy = new IZeroExContract(contractAddresses.exchangeProxy, this.getProvider());
        this.contractAddresses = contractAddresses;
    }
    /**
     * Unsubscribes from all subscriptions for all contracts.
     */
    public unsubscribeAll(): void {
        this.weth9.unsubscribeAll();
    }
    /**
     * Get the provider instance currently used by contract-wrappers
     * @return  Web3 provider instance
     */
    public getProvider(): SupportedProvider {
        return this._web3Wrapper.getProvider();
    }
    /**
     * Get the abi decoder instance currently used by contract-wrappers
     * @return  AbiDecoder instance
     */
    public getAbiDecoder(): AbiDecoder {
        return this._web3Wrapper.abiDecoder;
    }
}
