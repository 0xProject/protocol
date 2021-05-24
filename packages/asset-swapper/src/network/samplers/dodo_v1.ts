import { ChainId } from '@0x/contract-addresses';
import { BigNumber } from '@0x/utils';

import { ERC20BridgeSamplerContract } from '../../wrappers';

import { Chain } from '../chain';
import { NULL_ADDRESS } from '../constants';
import { OnChainSourceSampler, SamplerEthCall } from '../source_sampler';
import { Address, ERC20BridgeSource, FillData } from "../types";
import { valueByChainId } from '../utils';

export interface DodoV1FillData extends FillData {
    poolAddress: Address;
    isSellBase: boolean;
    helperAddress: Address;
}

interface DodoV1Info {
    helper: Address;
    registry: Address;
}

const DODOV1_CONFIG_BY_CHAIN_ID = valueByChainId(
    {
        [ChainId.Mainnet]: {
            helper: '0x533da777aedce766ceae696bf90f8541a4ba80eb',
            registry: '0x3A97247DF274a17C59A3bd12735ea3FcDFb49950',
        },
        [ChainId.BSC]: {
            helper: '0x0f859706aee7fcf61d5a8939e8cb9dbb6c1eda33',
            registry: '0xca459456a45e300aa7ef447dbb60f87cccb42828',
        },
        [ChainId.Polygon]: {
            helper: '0xdfaf9584f5d229a9dbe5978523317820a8897c5a',
            registry: '0x357c5e9cfa8b834edcef7c7aabd8f9db09119d11',
        },
    },
    { helper: NULL_ADDRESS, registry: NULL_ADDRESS },
);

type SellContract = ERC20BridgeSamplerContract;
type BuyContract = ERC20BridgeSamplerContract;
type SellContractSellFunction = SellContract['sampleSellsFromDODO'];
type BuyContractBuyFunction = BuyContract['sampleBuysFromDODO'];
type SamplerSellEthCall = SamplerEthCall<DodoV1FillData,SellContractSellFunction>;
type SamplerBuyEthCall = SamplerEthCall<DodoV1FillData,BuyContractBuyFunction>;

export class DodoV1Sampler extends
    OnChainSourceSampler<
        SellContract,
        BuyContract,
        SellContractSellFunction,
        BuyContractBuyFunction,
        DodoV1FillData
    >
{
    public static async createAsync(chain: Chain): Promise<DodoV1Sampler> {
        return new DodoV1Sampler(
            chain,
            DODOV1_CONFIG_BY_CHAIN_ID[chain.chainId],
        );
    }

    protected constructor(chain: Chain, private readonly _dodoInfo: DodoV1Info) {
        super({
            chain,
            sellSamplerContractType: ERC20BridgeSamplerContract,
            buySamplerContractType: ERC20BridgeSamplerContract,
            sellContractSellFunctionName: 'sampleSellsFromDODO',
            buyContractBuyFunctionName: 'sampleBuysFromDODO',
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
                this._dodoInfo,
                takerToken,
                makerToken,
                takerFillAmounts,
            ],
            getDexSamplesFromResult: ([isSellBase, poolAddress, samples]) =>
                takerFillAmounts.map((a, i) => ({
                    source: ERC20BridgeSource.Dodo,
                    fillData: {
                        isSellBase,
                        poolAddress,
                        helperAddress: this._dodoInfo.helper,
                    },
                    input: a,
                    output: samples[i],
                }),
            ),
        } as SamplerSellEthCall];
    }

    protected async _getBuyQuoteCallsAsync(
        tokenAddressPath: string[],
        makerFillAmounts: BigNumber[],
    ): Promise<SamplerBuyEthCall[]> {
        const [takerToken, makerToken] = tokenAddressPath;
        return [{
            args: [
                this._dodoInfo,
                takerToken,
                makerToken,
                makerFillAmounts,
            ],
            getDexSamplesFromResult: ([isSellBase, poolAddress, samples]) =>
                makerFillAmounts.map((a, i) => ({
                    source: ERC20BridgeSource.Dodo,
                    fillData: {
                        isSellBase,
                        poolAddress,
                        helperAddress: this._dodoInfo.helper,
                    },
                    input: a,
                    output: samples[i],
                }),
            ),
        } as SamplerBuyEthCall];
    }
}
