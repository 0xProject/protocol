import { NetworkUtilsContract } from '../wrappers';

import { Chain } from './chain';
import { Address } from './types';
import { ContractHelper, createContractWrapperAndHelper } from './utils';

export class NetworkUtils {
    private readonly _networkUtilsContractHelper: ContractHelper<NetworkUtilsContract>;
    private readonly _networkUtilsContract: NetworkUtilsContract;

    constructor(public readonly chain: Chain) {
        [this._networkUtilsContract, this._networkUtilsContractHelper] = createContractWrapperAndHelper(
            chain,
            NetworkUtilsContract,
            'NetworkUtils',
        );
    }

    public async getTokenDecimalsAsync(tokens: Address[]): Promise<number[]> {
        if (tokens.length === 0) {
            return [];
        }
        return (
            await this._networkUtilsContractHelper.ethCallAsync(
                this._networkUtilsContract.getTokenDecimals,
                [tokens],
                { gas: tokens.length * 64e3, maxCacheAgeMs: 300e3 },
            )
        ).map(d => d.toNumber());
    }

    public async isAddressContractAsync(address: Address): Promise<boolean> {
        return this._networkUtilsContractHelper.ethCallAsync(
            this._networkUtilsContract.isContract,
            [address],
            { gas: 32e3, maxCacheAgeMs: 300e3 },
        );
    }
}
