import { ChainId } from '@0x/contract-addresses';
import { BigNumber, hexUtils } from '@0x/utils';

import { ERC20BridgeSamplerContract } from '../../wrappers';

import { Chain } from '../chain';
import { NULL_ADDRESS, NULL_BYTES32 } from '../constants';
import { OnChainSourceSampler, SamplerEthCall } from '../source_sampler';
import { Address, Bytes, ERC20BridgeSource, FillData } from "../types";
import { valueByChainId } from '../utils';

/**
 * Configuration for a specific PSM vault
 */
interface MakerPsmInfo {
    psmAddress: Address;
    ilkIdentifier: string;
    gemTokenAddress: Address;
}

export type MakerPsmFillData = FillData & MakerPsmInfo & { takerToken: Address; }

const MAKER_PSM_INFO_BY_CHAIN_ID = valueByChainId<MakerPsmInfo>(
    {
        [ChainId.Mainnet]: {
            // Currently only USDC is supported
            gemTokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            ilkIdentifier: packStringAsBytes32('PSM-USDC-A'),
            psmAddress: '0x89b78cfa322f6c5de0abceecab66aee45393cc5a',
        },
    },
    {
        gemTokenAddress: NULL_ADDRESS,
        ilkIdentifier: NULL_BYTES32,
        psmAddress: NULL_ADDRESS,
    },
);

function packStringAsBytes32(s: string): Bytes {
    return hexUtils.rightPad(hexUtils.toHex(Buffer.from(s)), 32);
}

type SellContract = ERC20BridgeSamplerContract;
type BuyContract = ERC20BridgeSamplerContract;
type SellContractSellFunction = SellContract['sampleSellsFromMakerPsm'];
type BuyContractBuyFunction = BuyContract['sampleBuysFromMakerPsm'];
type SamplerSellEthCall = SamplerEthCall<MakerPsmFillData, SellContractSellFunction>;
type SamplerBuyEthCall = SamplerEthCall<MakerPsmFillData, BuyContractBuyFunction>;

export class MakerPsmSampler extends
    OnChainSourceSampler<
        SellContract,
        BuyContract,
        SellContractSellFunction,
        BuyContractBuyFunction,
        MakerPsmFillData
    >
{
    public static async createAsync(chain: Chain): Promise<MakerPsmSampler> {
        return new MakerPsmSampler(chain, MAKER_PSM_INFO_BY_CHAIN_ID[chain.chainId]);
    }

    protected constructor(chain: Chain, private readonly _psmInfo: MakerPsmInfo) {
        super({
            chain,
            sellSamplerContractType: ERC20BridgeSamplerContract,
            buySamplerContractType: ERC20BridgeSamplerContract,
            sellContractSellFunctionName: 'sampleSellsFromMakerPsm',
            buyContractBuyFunctionName: 'sampleBuysFromMakerPsm',
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
                this._psmInfo,
                takerToken,
                makerToken,
                takerFillAmounts,
            ],
            getDexSamplesFromResult: (samples) =>
                takerFillAmounts.map((a, i) => ({
                    source: ERC20BridgeSource.MakerPsm,
                    fillData: { ...this._psmInfo, takerToken },
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
                this._psmInfo,
                takerToken,
                makerToken,
                makerFillAmounts,
            ],
            getDexSamplesFromResult: (samples) =>
                makerFillAmounts.map((a, i) => ({
                    source: ERC20BridgeSource.MakerPsm,
                    fillData: { ...this._psmInfo, takerToken },
                    input: a,
                    output: samples[i],
                })),
        }];
    }
}
