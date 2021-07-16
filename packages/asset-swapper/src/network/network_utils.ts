import { NetworkUtilsContract } from '../wrappers';

import { Chain } from './chain';
import { Address } from './types';
import { ContractHelper, createContractWrapperAndHelper } from './utils';

export class NetworkUtils {
    private readonly _networkUtilsContractHelper: ContractHelper<NetworkUtilsContract>;
    private readonly _networkUtilsContract: NetworkUtilsContract;
    private readonly _tokenDecimalsCache: { [tokenAddress: string]: number } = {};
    private readonly _isAddressContractCache: { [address: string]: boolean } = {};

    constructor(public readonly chain: Chain) {
        [this._networkUtilsContract, this._networkUtilsContractHelper] = createContractWrapperAndHelper(
            chain,
            NetworkUtilsContract,
            'NetworkUtils',
        );
    }

    public async getTokenDecimalsAsync(tokens: Address[]): Promise<number[]> {
        const tokensToFetch = tokens.filter(t => this._tokenDecimalsCache[t] === undefined);
        let fetchedDecimals: number[] = [];
        if (tokensToFetch.length > 0) {
            fetchedDecimals = (
                await this._networkUtilsContractHelper.ethCallAsync(
                    this._networkUtilsContract.getTokenDecimals,
                    [tokensToFetch],
                    { gas: tokensToFetch.length * 20e3 },
                )
            ).map(d => d.toNumber());
        }
        for (let i = 0; i < tokensToFetch.length; ++i) {
            this._tokenDecimalsCache[tokensToFetch[i]] = fetchedDecimals[i];
        }
        return tokens.map(t => this._tokenDecimalsCache[t]);
    }

    public async isAddressContractAsync(address: Address): Promise<boolean> {
        if (this._isAddressContractCache[address] === undefined) {
            this._isAddressContractCache[address] = await this._networkUtilsContractHelper.ethCallAsync(
                this._networkUtilsContract.isContract,
                [address],
                { gas: 20e3 },
            );
        }
        return this._isAddressContractCache[address];
    }
}
