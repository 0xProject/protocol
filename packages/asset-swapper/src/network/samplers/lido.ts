import { ChainId } from '@0x/contract-addresses';
import { BigNumber } from '@0x/utils';

import { ERC20BridgeSamplerContract } from '../../wrappers';

import { Chain } from '../chain';
import { NULL_ADDRESS } from '../constants';
import { OnChainSourceSampler, SamplerEthCall } from '../source_sampler';
import { MAINNET_TOKENS } from '../tokens';
import { Address, ERC20BridgeSource, FillData } from "../types";
import { valueByChainId } from '../utils';

export interface LidoInfo {
    stEthToken: string;
    wethToken: string;
}

export interface LidoFillData extends FillData {
    stEthTokenAddress: string;
    takerToken: string;
}

const LIDO_INFO_BY_CHAIN = valueByChainId<LidoInfo>(
    {
        [ChainId.Mainnet]: {
            stEthToken: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
            wethToken: MAINNET_TOKENS.WETH,
        },
    },
    {
        stEthToken: NULL_ADDRESS,
        wethToken: NULL_ADDRESS,
    },
);

type SellContract = ERC20BridgeSamplerContract;
type BuyContract = ERC20BridgeSamplerContract;
type SellContractSellFunction = SellContract['sampleSellsFromLido'];
type BuyContractBuyFunction = BuyContract['sampleBuysFromLido'];
type SamplerSellEthCall = SamplerEthCall<LidoFillData,SellContractSellFunction>;
type SamplerBuyEthCall = SamplerEthCall<LidoFillData,BuyContractBuyFunction>;

export class LidoSampler extends
    OnChainSourceSampler<
        SellContract,
        BuyContract,
        SellContractSellFunction,
        BuyContractBuyFunction,
        LidoFillData
    >
{
    public static async createAsync(chain: Chain): Promise<LidoSampler> {
        return new LidoSampler(
            chain,
            LIDO_INFO_BY_CHAIN[chain.chainId],
        );
    }

    protected constructor(chain: Chain, private readonly _lidoInfo: LidoInfo) {
        super({
            chain,
            sellSamplerContractType: ERC20BridgeSamplerContract,
            buySamplerContractType: ERC20BridgeSamplerContract,
            sellContractSellFunctionName: 'sampleSellsFromLido',
            buyContractBuyFunctionName: 'sampleBuysFromLido',
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
        return [{
            args: [
                this._lidoInfo,
                takerToken,
                makerToken,
                takerFillAmounts,
            ],
            getDexSamplesFromResult: samples =>
                takerFillAmounts.map((a, i) => ({
                    source: ERC20BridgeSource.Uniswap,
                    fillData: { takerToken, stEthTokenAddress: this._lidoInfo.stEthToken },
                    input: a,
                    output: samples[i],
                })),
        }];
    }

    protected async _getBuyQuoteCallsAsync(
        tokenAddressPath: string[],
        makerFillAmounts: BigNumber[],
    ): Promise<SamplerBuyEthCall[]> {
        const [takerToken, makerToken] = tokenAddressPath;
        return [{
            args: [
                this._lidoInfo,
                takerToken,
                makerToken,
                makerFillAmounts,
            ],
            getDexSamplesFromResult: samples =>
                makerFillAmounts.map((a, i) => ({
                    source: ERC20BridgeSource.Uniswap,
                    fillData: { takerToken, stEthTokenAddress: this._lidoInfo.stEthToken },
                    input: a,
                    output: samples[i],
                })),
        }];
    }
}
