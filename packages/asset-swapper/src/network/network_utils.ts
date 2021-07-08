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
        return (
            await this._networkUtilsContractHelper.ethCallAsync(this._networkUtilsContract.getTokenDecimals, [tokens])
        ).map(d => d.toNumber());
    }

    public async isAddressContractAsync(address: Address): Promise<boolean> {
        return this._networkUtilsContractHelper.ethCallAsync(this._networkUtilsContract.isContract, [address]);
    }
}
