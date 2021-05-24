import { ChainId } from '@0x/contract-addresses';
import { BigNumber } from '@0x/utils';

import { UniswapV3BuySamplerContract, UniswapV3SellSamplerContract } from '../../wrappers';
import { constants } from '../../constants';

import { Chain } from '../chain';
import { OnChainSourceSampler, SamplerEthCall } from '../source_sampler';
import { Address, Bytes, ERC20BridgeSource, FillData } from "../types";
import { valueByChainId } from '../utils';

const { NULL_ADDRESS } = constants;

interface SamplerConfig {
    quoter: Address,
    router: Address,
};

const UNISWAP_V3_CONFIG_BY_CHAIN_ID = valueByChainId(
    {
        [ChainId.Mainnet]: {
            quoter: '0xb27308f9f90d607463bb33ea1bebb41c27ce5ab6',
            router: '0xe592427a0aece92de3edee1f18e0157c05861564',
        },
        [ChainId.Ropsten]: {
            quoter: '0x2f9e608fd881861b8916257b76613cb22ee0652c',
            router: '0x03782388516e94fcd4c18666303601a12aa729ea',
        },
    },
    { quoter: NULL_ADDRESS, router: NULL_ADDRESS },
);

export interface UniswapV3FillData extends FillData {
    tokenAddressPath: Address[];
    router: Address;
    uniswapPath: Bytes;
}

type SellContract = UniswapV3SellSamplerContract;
type BuyContract = UniswapV3BuySamplerContract;
type SellContractSellFunction = SellContract['sampleSells'];
type BuyContractBuyFunction = BuyContract['sampleBuys'];
type SamplerSellEthCall = SamplerEthCall<UniswapV3FillData,SellContractSellFunction>;
type SamplerBuyEthCall = SamplerEthCall<UniswapV3FillData,BuyContractBuyFunction>;

export class UniswapV3Sampler extends
    OnChainSourceSampler<
        SellContract,
        BuyContract,
        SellContractSellFunction,
        BuyContractBuyFunction,
        UniswapV3FillData
    >
{
    public static async createAsync(chain: Chain): Promise<UniswapV3Sampler> {
        return new UniswapV3Sampler(chain, UNISWAP_V3_CONFIG_BY_CHAIN_ID[chain.chainId]);
    }

    protected constructor(chain: Chain, private readonly _config: SamplerConfig) {
        super({
            chain,
            sellSamplerContractType: UniswapV3SellSamplerContract,
            buySamplerContractType: UniswapV3BuySamplerContract,
            sellContractSellFunctionName: 'sampleSells',
            buyContractBuyFunctionName: 'sampleBuys',
        });
    }

    protected async _getSellQuoteCallsAsync(
        tokenAddressPath: string[],
        takerFillAmounts: BigNumber[],
    ): Promise<SamplerSellEthCall[]> {
        return [{
            args: [
                this._config.quoter,
                tokenAddressPath,
                takerFillAmounts,
            ],
            getDexSamplesFromResult: ([uniswapPaths, samples]) =>
                takerFillAmounts.map((a, i) => ({
                    source: ERC20BridgeSource.UniswapV3,
                    fillData: {
                        router: this._config.router,
                        tokenAddressPath: tokenAddressPath,
                        uniswapPath: uniswapPaths[i],
                    },
                    input: a,
                    output: samples[i],
                })),
        }];
    }

    protected async _getBuyQuoteCallsAsync(
        tokenAddressPath: string[],
        makerFillAmounts: BigNumber[],
    ): Promise<SamplerBuyEthCall[]> {
        return [{
            args: [
                this._config.quoter,
                tokenAddressPath,
                makerFillAmounts,
            ],
            getDexSamplesFromResult: ([uniswapPaths, samples]) =>
                makerFillAmounts.map((a, i) => ({
                    source: ERC20BridgeSource.UniswapV3,
                    fillData: {
                        router: this._config.router,
                        tokenAddressPath: tokenAddressPath,
                        uniswapPath: uniswapPaths[i],
                    },
                    input: a,
                    output: samples[i],
                })),
        }];
    }
}
