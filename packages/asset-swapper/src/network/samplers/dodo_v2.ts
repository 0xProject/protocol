import { ChainId } from '@0x/contract-addresses';
import { BigNumber } from '@0x/utils';

import { ERC20BridgeSamplerContract } from '../../wrappers';

import { Chain } from '../chain';
import { OnChainSourceSampler, SamplerEthCall } from '../source_sampler';
import { Address, ERC20BridgeSource, FillData } from '../types';
import { valueByChainId } from '../utils';

export interface DodoV2FillData extends FillData {
    poolAddress: Address;
    isSellBase: boolean;
}

const DODOV2_FACTORIES_BY_CHAIN_ID = valueByChainId<string[]>(
    {
        [ChainId.Mainnet]: [
            '0x6b4fa0bc61eddc928e0df9c7f01e407bfcd3e5ef', // Private Pool
            '0x72d220ce168c4f361dd4dee5d826a01ad8598f6c', // Vending Machine
            '0x6fddb76c93299d985f4d3fc7ac468f9a168577a4', // Stability Pool
        ],
        [ChainId.BSC]: [
            '0xafe0a75dffb395eaabd0a7e1bbbd0b11f8609eef', // Private Pool
            '0x790b4a80fb1094589a3c0efc8740aa9b0c1733fb', // Vending Machine
            '0x0fb9815938ad069bf90e14fe6c596c514bede767', // Stability Pool
        ],
        [ChainId.Polygon]: [
            '0x95e887adf9eaa22cc1c6e3cb7f07adc95b4b25a8', // Private Pool
            '0x79887f65f83bdf15bcc8736b5e5bcdb48fb8fe13', // Vending Machine
            '0x43c49f8dd240e1545f147211ec9f917376ac1e87', // Stability Pool
        ],
    },
    [] as string[],
);

const MAX_DODOV2_POOLS_QUERIED = 3;
const DODO_V2_OFFSETS = [...new Array(MAX_DODOV2_POOLS_QUERIED)].map((_v, i) => new BigNumber(i));

type SellContract = ERC20BridgeSamplerContract;
type BuyContract = ERC20BridgeSamplerContract;
type SellContractSellFunction = SellContract['sampleSellsFromDODOV2'];
type BuyContractBuyFunction = BuyContract['sampleBuysFromDODOV2'];
type SamplerSellEthCall = SamplerEthCall<DodoV2FillData, SellContractSellFunction>;
type SamplerBuyEthCall = SamplerEthCall<DodoV2FillData, BuyContractBuyFunction>;

export class DodoV2Sampler extends OnChainSourceSampler<
    SellContract,
    BuyContract,
    SellContractSellFunction,
    BuyContractBuyFunction,
    DodoV2FillData
> {
    public static async createAsync(chain: Chain): Promise<DodoV2Sampler> {
        return new DodoV2Sampler(chain, DODOV2_FACTORIES_BY_CHAIN_ID[chain.chainId]);
    }

    protected constructor(chain: Chain, private readonly _factories: Address[]) {
        super({
            chain,
            sellSamplerContractType: ERC20BridgeSamplerContract,
            buySamplerContractType: ERC20BridgeSamplerContract,
            sellContractSellFunctionName: 'sampleSellsFromDODOV2',
            buyContractBuyFunctionName: 'sampleBuysFromDODOV2',
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
        return this._factories
            .map(factory =>
                DODO_V2_OFFSETS.map(
                    offset =>
                        ({
                            args: [factory, offset, takerToken, makerToken, takerFillAmounts],
                            getDexSamplesFromResult: ([isSellBase, poolAddress, samples]) => {
                                return takerFillAmounts.map((a, i) => ({
                                    source: ERC20BridgeSource.DodoV2,
                                    fillData: { poolAddress, isSellBase },
                                    input: a,
                                    output: samples[i],
                                }));
                            },
                        } as SamplerSellEthCall),
                ),
            )
            .flat(1);
    }

    protected async _getBuyQuoteCallsAsync(
        tokenAddressPath: string[],
        makerFillAmounts: BigNumber[],
    ): Promise<SamplerBuyEthCall[]> {
        const [takerToken, makerToken] = tokenAddressPath;
        return this._factories
            .map(factory =>
                DODO_V2_OFFSETS.map(
                    offset =>
                        ({
                            args: [factory, offset, takerToken, makerToken, makerFillAmounts],
                            getDexSamplesFromResult: ([isSellBase, poolAddress, samples]) => {
                                return makerFillAmounts.map((a, i) => ({
                                    source: ERC20BridgeSource.DodoV2,
                                    fillData: { poolAddress, isSellBase },
                                    input: a,
                                    output: samples[i],
                                }));
                            },
                        } as SamplerBuyEthCall),
                ),
            )
            .flat(1);
    }
}
