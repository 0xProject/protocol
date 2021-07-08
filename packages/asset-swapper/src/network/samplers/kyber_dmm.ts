import { ChainId } from '@0x/contract-addresses';
import { BigNumber } from '@0x/utils';

import { ERC20BridgeSamplerContract } from '../../wrappers';

import { Chain } from '../chain';
import { NULL_ADDRESS } from '../constants';
import { OnChainSourceSampler, SamplerEthCall } from '../source_sampler';
import { Address, ERC20BridgeSource } from '../types';
import { valueByChainId } from '../utils';

import { UniswapV2FillData } from './uniswap_v2';

export interface KyberDmmFillData extends UniswapV2FillData {
    poolsPath: Address[];
}

const KYBER_DMM_ROUTER_BY_CHAIN_ID = valueByChainId<Address>(
    {
        [ChainId.Mainnet]: '0x1c87257f5e8609940bc751a07bb085bb7f8cdbe6',
    },
    NULL_ADDRESS,
);

type SellContract = ERC20BridgeSamplerContract;
type BuyContract = ERC20BridgeSamplerContract;
type SellContractSellFunction = SellContract['sampleSellsFromKyberDmm'];
type BuyContractBuyFunction = BuyContract['sampleBuysFromKyberDmm'];
type SamplerSellEthCall = SamplerEthCall<KyberDmmFillData, SellContractSellFunction>;
type SamplerBuyEthCall = SamplerEthCall<KyberDmmFillData, BuyContractBuyFunction>;

export class KyberDmmSampler extends OnChainSourceSampler<
    SellContract,
    BuyContract,
    SellContractSellFunction,
    BuyContractBuyFunction,
    KyberDmmFillData
> {
    public static async createAsync(chain: Chain): Promise<KyberDmmSampler> {
        return new KyberDmmSampler(chain, KYBER_DMM_ROUTER_BY_CHAIN_ID[chain.chainId]);
    }

    protected constructor(chain: Chain, private readonly _router: Address) {
        super({
            chain,
            sellSamplerContractType: ERC20BridgeSamplerContract,
            buySamplerContractType: ERC20BridgeSamplerContract,
            sellContractSellFunctionName: 'sampleSellsFromKyberDmm',
            buyContractBuyFunctionName: 'sampleBuysFromKyberDmm',
        });
    }

    protected async _getSellQuoteCallsAsync(
        tokenAddressPath: string[],
        takerFillAmounts: BigNumber[],
    ): Promise<SamplerSellEthCall[]> {
        return [
            {
                args: [this._router, tokenAddressPath, takerFillAmounts],
                getDexSamplesFromResult: ([pools, samples]) =>
                    takerFillAmounts.map((a, i) => ({
                        source: ERC20BridgeSource.KyberDmm,
                        fillData: {
                            router: this._router,
                            poolsPath: pools,
                            tokenAddressPath,
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
        return [
            {
                args: [this._router, tokenAddressPath, makerFillAmounts],
                getDexSamplesFromResult: ([pools, samples]) =>
                    makerFillAmounts.map((a, i) => ({
                        source: ERC20BridgeSource.KyberDmm,
                        fillData: {
                            router: this._router,
                            poolsPath: pools,
                            tokenAddressPath,
                        },
                        input: a,
                        output: samples[i],
                    })),
            },
        ];
    }
}
