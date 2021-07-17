import { ChainId } from '@0x/contract-addresses';
import { BigNumber } from '@0x/utils';

import { ERC20BridgeSamplerContract } from '../../wrappers';

import { Chain } from '../chain';
import { OnChainSourceSampler, SamplerEthCall } from '../source_sampler';
import { BSC_TOKENS, MAINNET_TOKENS } from '../tokens';
import { Address, ERC20BridgeSource } from '../types';
import { valueByChainId } from '../utils';

import { CurveFillData, CurveFunctionSelectors, CurveInfo, isCurveCompatible } from './curve';

export type SmoothyFillData = CurveFillData;

const SMOOTHY_POOLS = {
    syUSD: '0xe5859f4efc09027a9b718781dcb2c6910cac6e91',
};

const SMOOTHY_MAINNET_INFOS: { [name: string]: CurveInfo } = {
    [SMOOTHY_POOLS.syUSD]: {
        exchangeFunctionSelector: CurveFunctionSelectors.swap_uint256,
        sellQuoteFunctionSelector: CurveFunctionSelectors.get_swap_amount,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: SMOOTHY_POOLS.syUSD,
        tokens: [
            MAINNET_TOKENS.USDT,
            MAINNET_TOKENS.USDC,
            MAINNET_TOKENS.DAI,
            MAINNET_TOKENS.TUSD,
            MAINNET_TOKENS.sUSD,
            MAINNET_TOKENS.BUSD,
            MAINNET_TOKENS.PAX,
            MAINNET_TOKENS.GUSD,
        ],
        metaTokens: undefined,
        gasSchedule: 190e3,
    },
};

const SMOOTHY_BSC_INFOS: { [name: string]: CurveInfo } = {
    [SMOOTHY_POOLS.syUSD]: {
        exchangeFunctionSelector: CurveFunctionSelectors.swap_uint256,
        sellQuoteFunctionSelector: CurveFunctionSelectors.get_swap_amount,
        buyQuoteFunctionSelector: CurveFunctionSelectors.None,
        poolAddress: SMOOTHY_POOLS.syUSD,
        tokens: [BSC_TOKENS.BUSD, BSC_TOKENS.USDT, BSC_TOKENS.USDC, BSC_TOKENS.DAI, BSC_TOKENS.PAX, BSC_TOKENS.UST],
        metaTokens: undefined,
        gasSchedule: 90e3,
    },
};

const SMOOTHYLIKE_INFOS_BY_CHAIN_ID = valueByChainId(
    {
        [ChainId.Mainnet]: {
            ...SMOOTHY_MAINNET_INFOS,
        },
        [ChainId.BSC]: {
            ...SMOOTHY_BSC_INFOS,
        },
    },
    {},
);

type SellContract = ERC20BridgeSamplerContract;
type BuyContract = ERC20BridgeSamplerContract;
type SellContractSellFunction = SellContract['sampleSellsFromSmoothy'];
type BuyContractBuyFunction = BuyContract['sampleBuysFromSmoothy'];
type SamplerSellEthCall = SamplerEthCall<SmoothyFillData, SellContractSellFunction>;
type SamplerBuyEthCall = SamplerEthCall<SmoothyFillData, BuyContractBuyFunction>;

export class SmoothySampler extends OnChainSourceSampler<
    SellContract,
    BuyContract,
    SellContractSellFunction,
    BuyContractBuyFunction,
    SmoothyFillData
> {
    public static async createAsync(
        chain: Chain,
        fork: ERC20BridgeSource = ERC20BridgeSource.Smoothy,
    ): Promise<SmoothySampler> {
        const curveInfos = SMOOTHYLIKE_INFOS_BY_CHAIN_ID[chain.chainId];
        if (!curveInfos) {
            throw new Error(`No smoothy configs for chain ${chain.chainId}`);
        }
        return new SmoothySampler(chain, fork, Object.values(curveInfos));
    }

    protected constructor(
        chain: Chain,
        public readonly fork: ERC20BridgeSource,
        private readonly _curveInfos: CurveInfo[],
    ) {
        super({
            chain,
            sellSamplerContractType: ERC20BridgeSamplerContract,
            buySamplerContractType: ERC20BridgeSamplerContract,
            sellContractSellFunctionName: 'sampleSellsFromSmoothy',
            buyContractBuyFunctionName: 'sampleBuysFromSmoothy',
        });
    }

    public canConvertTokens(tokenAddressPath: Address[]): boolean {
        if (tokenAddressPath.length !== 2) {
            return false;
        }
        return this._curveInfos.some(c => isCurveCompatible(c, tokenAddressPath));
    }

    protected async _getSellQuoteCallsAsync(
        tokenAddressPath: string[],
        takerFillAmounts: BigNumber[],
    ): Promise<SamplerSellEthCall[]> {
        const [takerToken, makerToken] = tokenAddressPath;
        const curves = this._findCompatibleCurves(tokenAddressPath);
        return curves.map(c => {
            const fromTokenIdx = c.tokens.indexOf(takerToken);
            const toTokenIdx = c.tokens.indexOf(makerToken);
            return {
                args: [
                    {
                        poolAddress: c.poolAddress,
                        sellQuoteFunctionSelector: c.sellQuoteFunctionSelector,
                        buyQuoteFunctionSelector: c.buyQuoteFunctionSelector,
                    },
                    new BigNumber(fromTokenIdx),
                    new BigNumber(toTokenIdx),
                    takerFillAmounts,
                ],
                getDexSamplesFromResult: samples =>
                    takerFillAmounts.map((a, i) => ({
                        source: this.fork,
                        fillData: { fromTokenIdx, toTokenIdx, pool: c },
                        input: a,
                        output: samples[i],
                    })),
            };
        });
    }

    protected async _getBuyQuoteCallsAsync(
        tokenAddressPath: string[],
        makerFillAmounts: BigNumber[],
    ): Promise<SamplerBuyEthCall[]> {
        const [takerToken, makerToken] = tokenAddressPath;
        const curves = this._findCompatibleCurves(tokenAddressPath);
        return curves.map(c => {
            const fromTokenIdx = c.tokens.indexOf(takerToken);
            const toTokenIdx = c.tokens.indexOf(makerToken);
            return {
                args: [
                    {
                        poolAddress: c.poolAddress,
                        sellQuoteFunctionSelector: c.sellQuoteFunctionSelector,
                        buyQuoteFunctionSelector: c.buyQuoteFunctionSelector,
                    },
                    new BigNumber(fromTokenIdx),
                    new BigNumber(toTokenIdx),
                    makerFillAmounts,
                ],
                getDexSamplesFromResult: samples =>
                    makerFillAmounts.map((a, i) => ({
                        source: this.fork,
                        fillData: { fromTokenIdx, toTokenIdx, pool: c },
                        input: a,
                        output: samples[i],
                    })),
            };
        });
    }

    private _findCompatibleCurves(tokenAddressPath: Address[]): CurveInfo[] {
        return this._curveInfos.filter(c => isCurveCompatible(c, tokenAddressPath));
    }
}
