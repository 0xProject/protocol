import { SupportedProvider } from '@0x/dev-utils';
import { SDK } from '@bancor/sdk';
import { Ethereum } from '@bancor/sdk/dist/blockchains/ethereum';
import { BlockchainType } from '@bancor/sdk/dist/types';

import { MAINNET_TOKENS } from './constants';

const findToken = (tokenAddress: string, graph: object): string =>
    // If we're looking for WETH it is stored by Bancor as the 0xeee address
    tokenAddress.toLowerCase() === MAINNET_TOKENS.WETH.toLowerCase()
        ? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
        : Object.keys(graph).filter(k => k.toLowerCase() === tokenAddress.toLowerCase())[0];

export class BancorService {
    public static async createAsync(provider: SupportedProvider): Promise<BancorService> {
        const sdk = await SDK.create({ ethereumNodeEndpoint: provider });
        const service = new BancorService(sdk);
        return service;
    }

    constructor(public sdk: SDK) {}
    public getPaths(_fromToken: string, _toToken: string): string[][] {
        // HACK: We reach into the blockchain object and pull in it's cache of tokens
        // and we use it's internal non-async getPathsFunc
        try {
            const blockchain = this.sdk._core.blockchains[BlockchainType.Ethereum] as Ethereum;
            const fromToken = findToken(_fromToken, blockchain.graph);
            const toToken = findToken(_toToken, blockchain.graph);
            return blockchain.getPathsFunc.bind(blockchain)(fromToken, toToken);
        } catch (e) {
            return [];
        }
    }
}
