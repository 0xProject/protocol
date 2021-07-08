import { ChainId } from '@0x/contract-addresses';
import { SupportedProvider } from '@0x/dev-utils';
import { BigNumber } from '@0x/utils';
import { SDK } from '@bancor/sdk';
import { Ethereum } from '@bancor/sdk/dist/blockchains/ethereum';
import { BlockchainType } from '@bancor/sdk/dist/types';

import { ERC20BridgeSamplerContract } from '../../wrappers';

import { Chain } from '../chain';
import { NULL_ADDRESS } from '../constants';
import { OnChainSourceSampler, SamplerEthCall } from '../source_sampler';
import { MAINNET_TOKENS } from '../tokens';
import { Address, ERC20BridgeSource, FillData } from '../types';
import { valueByChainId } from '../utils';

export interface BancorFillData extends FillData {
    path: Address[];
    networkAddress: Address;
}

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

const BANCOR_REGISTRY_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Mainnet]: '0x52Ae12ABe5D8BD778BD5397F99cA900624CfADD4',
    },
    NULL_ADDRESS,
);

type SellContract = ERC20BridgeSamplerContract;
type BuyContract = ERC20BridgeSamplerContract;
type SellContractSellFunction = SellContract['sampleSellsFromBancor'];
type BuyContractBuyFunction = BuyContract['sampleBuysFromBancor'];
type SamplerSellEthCall = SamplerEthCall<BancorFillData, SellContractSellFunction>;
type SamplerBuyEthCall = SamplerEthCall<BancorFillData, BuyContractBuyFunction>;

export class BancorSampler extends OnChainSourceSampler<
    SellContract,
    BuyContract,
    SellContractSellFunction,
    BuyContractBuyFunction,
    BancorFillData
> {
    public static async createAsync(chain: Chain): Promise<BancorSampler> {
        return new BancorSampler(
            chain,
            BANCOR_REGISTRY_BY_CHAIN_ID[chain.chainId],
            await BancorService.createAsync(chain.provider),
        );
    }

    protected constructor(
        chain: Chain,
        private readonly _registry: Address,
        private readonly _bancorService: BancorService,
    ) {
        super({
            chain,
            sellSamplerContractType: ERC20BridgeSamplerContract,
            buySamplerContractType: ERC20BridgeSamplerContract,
            sellContractSellFunctionName: 'sampleSellsFromBancor',
            buyContractBuyFunctionName: 'sampleBuysFromBancor',
        });
    }

    public canConvertTokens(tokenAddressPath: Address[]): boolean {
        return tokenAddressPath.length === 2;
    }

    protected async _getSellQuoteCallsAsync(
        tokenAddressPath: string[],
        takerFillAmounts: BigNumber[],
    ): Promise<SamplerSellEthCall[]> {
        const [takerToken, makerToken] = tokenAddressPath;
        const paths = this._bancorService ? this._bancorService.getPaths(takerToken, makerToken) : [];
        return [
            {
                args: [{ registry: this._registry, paths }, takerToken, makerToken, takerFillAmounts],
                getDexSamplesFromResult: ([networkAddress, path, samples]) =>
                    takerFillAmounts.map((a, i) => ({
                        source: ERC20BridgeSource.Bancor,
                        fillData: {
                            networkAddress,
                            path,
                        },
                        input: a,
                        output: samples[i],
                    })),
            },
        ];
    }

    protected async _getBuyQuoteCallsAsync(
        tokenAddressPath: string[],
        makerFillAmounts: BigNumber[],
    ): Promise<SamplerBuyEthCall[]> {
        const [takerToken, makerToken] = tokenAddressPath;
        const paths = this._bancorService ? this._bancorService.getPaths(takerToken, makerToken) : [];
        return [
            {
                args: [{ registry: this._registry, paths }, takerToken, makerToken, makerFillAmounts],
                getDexSamplesFromResult: ([networkAddress, path, samples]) =>
                    makerFillAmounts.map((a, i) => ({
                        source: ERC20BridgeSource.Bancor,
                        fillData: {
                            networkAddress,
                            path,
                        },
                        input: a,
                        output: samples[i],
                    })),
            },
        ];
    }
}
