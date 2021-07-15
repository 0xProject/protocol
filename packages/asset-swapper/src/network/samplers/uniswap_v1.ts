import { ChainId } from '@0x/contract-addresses';
import { BigNumber } from '@0x/utils';

import { ERC20BridgeSamplerContract } from '../../wrappers';

import { Chain } from '../chain';
import { NULL_ADDRESS } from '../constants';
import { OnChainSourceSampler, SamplerEthCall } from '../source_sampler';
import { WRAPPED_NETWORK_TOKEN_BY_CHAIN_ID } from '../tokens';
import { Address, ERC20BridgeSource, FillData } from '../types';
import { valueByChainId } from '../utils';

const UNISWAPV1_ROUTER_BY_CHAIN_ID = valueByChainId<Address>(
    {
        [ChainId.Mainnet]: '0xc0a47dfe034b400b47bdad5fecda2621de6c4d95',
        [ChainId.Ropsten]: '0x9c83dce8ca20e9aaf9d3efc003b2ea62abc08351',
    },
    NULL_ADDRESS,
);

export interface UniswapV1FillData extends FillData {
    router: Address;
}

const BAD_TOKENS = [
    '0xb8c77482e45f1f44de1745f52c74426c631bdd52', // BNB
];

type SellContract = ERC20BridgeSamplerContract;
type BuyContract = ERC20BridgeSamplerContract;
type SellContractSellFunction = SellContract['sampleSellsFromUniswap'];
type BuyContractBuyFunction = BuyContract['sampleBuysFromUniswap'];
type SamplerSellEthCall = SamplerEthCall<UniswapV1FillData, SellContractSellFunction>;
type SamplerBuyEthCall = SamplerEthCall<UniswapV1FillData, BuyContractBuyFunction>;

export class UniswapV1Sampler extends OnChainSourceSampler<
    SellContract,
    BuyContract,
    SellContractSellFunction,
    BuyContractBuyFunction,
    UniswapV1FillData
> {
    public static async createAsync(chain: Chain): Promise<UniswapV1Sampler> {
        return new UniswapV1Sampler(
            chain,
            UNISWAPV1_ROUTER_BY_CHAIN_ID[chain.chainId],
            WRAPPED_NETWORK_TOKEN_BY_CHAIN_ID[chain.chainId],
        );
    }

    protected constructor(chain: Chain, private readonly _router: Address, private readonly _weth: Address) {
        super({
            chain,
            sellSamplerContractType: ERC20BridgeSamplerContract,
            buySamplerContractType: ERC20BridgeSamplerContract,
            sellContractSellFunctionName: 'sampleSellsFromUniswap',
            buyContractBuyFunctionName: 'sampleBuysFromUniswap',
        });
    }

    public canConvertTokens(tokenAddressPath: Address[]): boolean {
        return tokenAddressPath.length === 2 && tokenAddressPath.every(t => !BAD_TOKENS.includes(t));
    }

    protected async _getSellQuoteCallsAsync(
        tokenAddressPath: string[],
        takerFillAmounts: BigNumber[],
    ): Promise<SamplerSellEthCall[]> {
        const [takerToken, makerToken] = tokenAddressPath;
        return [
            {
                args: [
                    this._router,
                    this._normalizeToken(takerToken),
                    this._normalizeToken(makerToken),
                    takerFillAmounts,
                ],
                getDexSamplesFromResult: samples =>
                    takerFillAmounts.map((a, i) => ({
                        source: ERC20BridgeSource.Uniswap,
                        fillData: { router: this._router },
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
        return [
            {
                args: [
                    this._router,
                    this._normalizeToken(takerToken),
                    this._normalizeToken(makerToken),
                    makerFillAmounts,
                ],
                getDexSamplesFromResult: samples =>
                    makerFillAmounts.map((a, i) => ({
                        source: ERC20BridgeSource.Uniswap,
                        fillData: { router: this._router },
                        input: a,
                        output: samples[i],
                    })),
            },
        ];
    }

    private _normalizeToken(token: Address): Address {
        // Uniswap V1 only deals in ETH, not WETH, and we treat null as ETH in
        // the sampler.
        if (token.toLowerCase() === this._weth.toLowerCase()) {
            return NULL_ADDRESS;
        }
        return token;
    }
}
