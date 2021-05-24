import { ChainId } from '@0x/contract-addresses';
import { BigNumber } from '@0x/utils';

import { ERC20BridgeSamplerContract } from '../../wrappers';

import { Chain } from '../chain';
import { OnChainSourceSampler, SamplerEthCall } from '../source_sampler';
import { Address, ERC20BridgeSource, FillData } from "../types";

const UNISWAP_V2_ROUTER_BY_CHAIN_ID_BY_FORK = {
    [ChainId.Mainnet]: {
        [ERC20BridgeSource.UniswapV2]: '0xf164fc0ec4e93095b804a4795bbe1e041497b92a',
        [ERC20BridgeSource.SushiSwap]: '0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f',
        [ERC20BridgeSource.CryptoCom]: '0xceb90e4c17d626be0facd78b79c9c87d7ca181b3',
        [ERC20BridgeSource.Linkswap]: '0xa7ece0911fe8c60bff9e99f8fafcdbe56e07aff1',
    },
    [ChainId.Ropsten]: {
        [ERC20BridgeSource.UniswapV2]: '0xf164fc0ec4e93095b804a4795bbe1e041497b92a',
        [ERC20BridgeSource.SushiSwap]: '0x1b02da8cb0d097eb8d57a175b88c7d8b47997506',
    },
    [ChainId.BSC]: {
        [ERC20BridgeSource.SushiSwap]: '0x1b02da8cb0d097eb8d57a175b88c7d8b47997506',
        [ERC20BridgeSource.PancakeSwap]: '0x05ff2b0db69458a0750badebc4f9e13add608c7f',
        [ERC20BridgeSource.PancakeSwapV2]: '0x10ed43c718714eb63d5aa57b78b54704e256024e',
        [ERC20BridgeSource.BakerySwap]: '0xcde540d7eafe93ac5fe6233bee57e1270d3e330f',
        [ERC20BridgeSource.ApeSwap]: '0xc0788a3ad43d79aa53b09c2eacc313a787d1d607',
        [ERC20BridgeSource.CafeSwap]: '0x933daea3a5995fb94b14a7696a5f3ffd7b1e385a',
        [ERC20BridgeSource.CheeseSwap]: '0x3047799262d8d2ef41ed2a222205968bc9b0d895',
        [ERC20BridgeSource.JulSwap]: '0xbd67d157502a23309db761c41965600c2ec788b2',
        [ERC20BridgeSource.WaultSwap]: '0xd48745e39bbed146eec15b79cbf964884f9877c2',
    },
    [ChainId.Polygon]: {
        [ERC20BridgeSource.Dfyn]: '0xa102072a4c07f06ec3b4900fdc4c7b80b6c57429',
        [ERC20BridgeSource.ComethSwap]: '0x93bcdc45f7e62f89a8e901dc4a0e2c6c427d9f25',
        [ERC20BridgeSource.QuickSwap]: '0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff',
        [ERC20BridgeSource.ApeSwap]: '0xc0788a3ad43d79aa53b09c2eacc313a787d1d607',
        [ERC20BridgeSource.WaultSwap]: '0x3a1d87f206d12415f5b0a33e786967680aab4f6d',
        [ERC20BridgeSource.Polydex]: '0xe5c67ba380fb2f70a47b489e94bced486bb8fb74',
    },
};

export interface UniswapV2FillData extends FillData {
    tokenAddressPath: string[];
    router: string;
}

type SellContract = ERC20BridgeSamplerContract;
type BuyContract = ERC20BridgeSamplerContract;
type SellContractSellFunction = SellContract['sampleSellsFromUniswapV2'];
type BuyContractBuyFunction = BuyContract['sampleBuysFromUniswapV2'];
type SamplerSellEthCall = SamplerEthCall<UniswapV2FillData,SellContractSellFunction>;
type SamplerBuyEthCall = SamplerEthCall<UniswapV2FillData,BuyContractBuyFunction>;

export class UniswapV2Sampler extends
    OnChainSourceSampler<
        SellContract,
        BuyContract,
        SellContractSellFunction,
        BuyContractBuyFunction,
        UniswapV2FillData
    >
{
    private readonly _router: Address;

    public static async createAsync(chain: Chain, fork: ERC20BridgeSource): Promise<UniswapV2Sampler> {
        return new UniswapV2Sampler(chain, fork);
    }

    protected constructor(chain: Chain, public readonly fork: ERC20BridgeSource) {
        super({
            chain,
            sellSamplerContractType: ERC20BridgeSamplerContract,
            buySamplerContractType: ERC20BridgeSamplerContract,
            sellContractSellFunctionName: 'sampleSellsFromUniswapV2',
            buyContractBuyFunctionName: 'sampleBuysFromUniswapV2',
        });
        this._router = (UNISWAP_V2_ROUTER_BY_CHAIN_ID_BY_FORK as any)[chain.chainId]?.[fork]! as Address;
    }

    protected async _getSellQuoteCallsAsync(
        tokenAddressPath: string[],
        takerFillAmounts: BigNumber[],
    ): Promise<SamplerSellEthCall[]> {
        return [{
            args: [
                this._router,
                tokenAddressPath,
                takerFillAmounts,
            ],
            getDexSamplesFromResult: samples =>
                takerFillAmounts.map((a, i) => ({
                    source: this.fork,
                    fillData: {
                        router: this._router,
                        tokenAddressPath: tokenAddressPath,
                    },
                    input: a,
                    output: samples[i],
                }),
            ),
        }];
    }

    protected async _getBuyQuoteCallsAsync(
        tokenAddressPath: string[],
        makerFillAmounts: BigNumber[],
    ): Promise<SamplerBuyEthCall[]> {
        return [{
            args: [
                this._router,
                tokenAddressPath,
                makerFillAmounts,
            ],
            getDexSamplesFromResult: samples =>
                makerFillAmounts.map((a, i) => ({
                    source: this.fork,
                    fillData: {
                        router: this._router,
                        tokenAddressPath: tokenAddressPath,
                    },
                    input: a,
                    output: samples[i],
                }),
            ),
        }];
    }
}
