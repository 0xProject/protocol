import { ChainId } from '@0x/contract-addresses';
import { BigNumber } from '@0x/utils';

import { ERC20BridgeSamplerContract } from '../../wrappers';

import { Chain } from '../chain';
import { NULL_ADDRESS } from '../constants';
import { OnChainSourceSampler, SamplerEthCall } from '../source_sampler';
import { WRAPPED_NETWORK_TOKEN_BY_CHAIN_ID } from '../tokens';
import { Address, ERC20BridgeSource, FillData } from "../types";
import { valueByChainId } from '../utils';

export interface MooniswapFillData extends FillData {
    poolAddress: string;
}

const MOONISWAP_REGISTRIES_BY_CHAIN_ID = valueByChainId(
    {
        [ChainId.Mainnet]: [
            '0x71CD6666064C3A1354a3B4dca5fA1E2D3ee7D303',
            '0xc4a8b7e29e3c8ec560cd4945c1cf3461a85a148d',
            '0xbaf9a5d4b0052359326a6cdab54babaa3a3a9643',
        ],
        [ChainId.BSC]: ['0xd41b24bba51fac0e4827b6f94c0d6ddeb183cd64'],
    },
    [] as Address[],
);

type SellContract = ERC20BridgeSamplerContract;
type BuyContract = ERC20BridgeSamplerContract;
type SellContractSellFunction = SellContract['sampleSellsFromMooniswap'];
type BuyContractBuyFunction = BuyContract['sampleBuysFromMooniswap'];
type SamplerSellEthCall = SamplerEthCall<MooniswapFillData,SellContractSellFunction>;
type SamplerBuyEthCall = SamplerEthCall<MooniswapFillData,BuyContractBuyFunction>;

export class MooniswapSampler extends
    OnChainSourceSampler<
        SellContract,
        BuyContract,
        SellContractSellFunction,
        BuyContractBuyFunction,
        MooniswapFillData
    >
{
    public static async createAsync(chain: Chain): Promise<MooniswapSampler> {
        return new MooniswapSampler(
            chain,
            MOONISWAP_REGISTRIES_BY_CHAIN_ID[chain.chainId],
            WRAPPED_NETWORK_TOKEN_BY_CHAIN_ID[chain.chainId],
        );
    }

    protected constructor(chain: Chain, private readonly _registries: Address[], private readonly _weth: Address) {
        super({
            chain,
            sellSamplerContractType: ERC20BridgeSamplerContract,
            buySamplerContractType: ERC20BridgeSamplerContract,
            sellContractSellFunctionName: 'sampleSellsFromMooniswap',
            buyContractBuyFunctionName: 'sampleBuysFromMooniswap',
        });
    }

    public canConvertTokens(tokenAddressPath: Address[]): boolean {
        return tokenAddressPath.length === 2 && this._registries.length > 0;
    }

    protected async _getSellQuoteCallsAsync(
        tokenAddressPath: string[],
        takerFillAmounts: BigNumber[],
    ): Promise<SamplerSellEthCall[]> {
        const [takerToken, makerToken] = tokenAddressPath;
        return this._registries.map(registry => ({
            args: [
                registry,
                this._normalizeToken(takerToken),
                this._normalizeToken(makerToken),
                takerFillAmounts,
            ],
            getDexSamplesFromResult: ([poolAddress, samples]) =>
                takerFillAmounts.map((a, i) => ({
                    source: ERC20BridgeSource.Mooniswap,
                    fillData: { poolAddress },
                    input: a,
                    output: samples[i],
                })),
        }));
    }

    protected async _getBuyQuoteCallsAsync(
        tokenAddressPath: string[],
        makerFillAmounts: BigNumber[],
    ): Promise<SamplerBuyEthCall[]> {
        const [takerToken, makerToken] = tokenAddressPath;
        return this._registries.map(registry => ({
            args: [
                registry,
                this._normalizeToken(takerToken),
                this._normalizeToken(makerToken),
                makerFillAmounts,
            ],
            getDexSamplesFromResult: ([poolAddress, samples]) =>
                makerFillAmounts.map((a, i) => ({
                    source: ERC20BridgeSource.Mooniswap,
                    fillData: { poolAddress },
                    input: a,
                    output: samples[i],
                })),
        }));
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
