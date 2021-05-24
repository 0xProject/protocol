import { ChainId } from '@0x/contract-addresses';
import { BigNumber } from '@0x/utils';

import { ERC20BridgeSamplerContract } from '../../wrappers';

import { Chain } from '../chain';
import { NULL_ADDRESS } from '../constants';
import { OnChainSourceSampler, SamplerEthCall } from '../source_sampler';
import { Address, ERC20BridgeSource, FillData } from "../types";
import { valueByChainId } from '../utils';

const OASIS_ROUTER_BY_CHAIN_ID = valueByChainId<string>(
    {
        [ChainId.Mainnet]: '0x5e3e0548935a83ad29fb2a9153d331dc6d49020f',
    },
    NULL_ADDRESS,
);

export interface OasisFillData extends FillData {
    router: Address;
}

type SellContract = ERC20BridgeSamplerContract;
type BuyContract = ERC20BridgeSamplerContract;
type SellContractSellFunction = SellContract['sampleSellsFromEth2Dai'];
type BuyContractBuyFunction = BuyContract['sampleBuysFromEth2Dai'];
type SamplerSellEthCall = SamplerEthCall<OasisFillData,SellContractSellFunction>;
type SamplerBuyEthCall = SamplerEthCall<OasisFillData,BuyContractBuyFunction>;

export class OasisSampler extends
    OnChainSourceSampler<
        SellContract,
        BuyContract,
        SellContractSellFunction,
        BuyContractBuyFunction,
        OasisFillData
    >
{
    public static async createAsync(chain: Chain): Promise<OasisSampler> {
        return new OasisSampler(
            chain,
            OASIS_ROUTER_BY_CHAIN_ID[chain.chainId],
        );
    }

    protected constructor(chain: Chain, private readonly _router: Address) {
        super({
            chain,
            sellSamplerContractType: ERC20BridgeSamplerContract,
            buySamplerContractType: ERC20BridgeSamplerContract,
            sellContractSellFunctionName: 'sampleSellsFromEth2Dai',
            buyContractBuyFunctionName: 'sampleBuysFromEth2Dai',
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
                this._router,
                takerToken,
                makerToken,
                takerFillAmounts,
            ],
            getDexSamplesFromResult: samples =>
                takerFillAmounts.map((a, i) => ({
                    source: ERC20BridgeSource.Eth2Dai,
                    fillData: { router: this._router },
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
                this._router,
                takerToken,
                makerToken,
                makerFillAmounts,
            ],
            getDexSamplesFromResult: samples =>
                makerFillAmounts.map((a, i) => ({
                    source: ERC20BridgeSource.Eth2Dai,
                    fillData: { router: this._router },
                    input: a,
                    output: samples[i],
                })),
        }];
    }
}
