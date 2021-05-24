import { ChainId } from '@0x/contract-addresses';
import { BigNumber } from '@0x/utils';

import { ERC20BridgeSamplerContract } from '../../wrappers';

import { Chain } from '../chain';
import { NULL_ADDRESS } from '../constants';
import { OnChainSourceSampler, SamplerEthCall } from '../source_sampler';
import { MAINNET_TOKENS, POLYGON_TOKENS } from '../tokens';
import { Address, ERC20BridgeSource } from "../types";
import { valueByChainId } from '../utils';

import { ShellFillData, ShellPoolInfo } from './shell';

export type MStableFillData = ShellFillData;

const MSTABLE_POOLS_BY_CHAIN_ID = valueByChainId(
    {
        [ChainId.Mainnet]: {
            mUSD: {
                poolAddress: '0xe2f2a5c287993345a840db3b0845fbc70f5935a5',
                tokens: [MAINNET_TOKENS.DAI, MAINNET_TOKENS.USDC, MAINNET_TOKENS.USDT],
            },
            mBTC: {
                poolAddress: '0x945facb997494cc2570096c74b5f66a3507330a1',
                tokens: [MAINNET_TOKENS.WBTC, MAINNET_TOKENS.RenBTC, MAINNET_TOKENS.sBTC],
            },
        },
        [ChainId.Polygon]: {
            mUSD: {
                poolAddress: '0xe840b73e5287865eec17d250bfb1536704b43b21',
                tokens: [POLYGON_TOKENS.DAI, POLYGON_TOKENS.USDC, POLYGON_TOKENS.USDT],
            },
            mBTC: {
                poolAddress: NULL_ADDRESS,
                tokens: [] as string[],
            },
        },
    },
    {
        mUSD: {
            poolAddress: NULL_ADDRESS,
            tokens: [] as string[],
        },
        mBTC: {
            poolAddress: NULL_ADDRESS,
            tokens: [] as string[],
        },
    },
);

type SellContract = ERC20BridgeSamplerContract;
type BuyContract = ERC20BridgeSamplerContract;
type SellContractSellFunction = SellContract['sampleSellsFromMStable'];
type BuyContractBuyFunction = BuyContract['sampleBuysFromMStable'];
type SamplerSellEthCall = SamplerEthCall<MStableFillData,SellContractSellFunction>;
type SamplerBuyEthCall = SamplerEthCall<MStableFillData,BuyContractBuyFunction>;

export class MStableSampler extends
    OnChainSourceSampler<
        SellContract,
        BuyContract,
        SellContractSellFunction,
        BuyContractBuyFunction,
        MStableFillData
    >
{
    public static async createAsync(
        chain: Chain,
    ): Promise<MStableSampler> {
        return new MStableSampler(chain, Object.values(MSTABLE_POOLS_BY_CHAIN_ID[chain.chainId]));
    }

    protected constructor(
        chain: Chain,
        private readonly _pools: ShellPoolInfo[],
    ) {
        super({
            chain,
            sellSamplerContractType: ERC20BridgeSamplerContract,
            buySamplerContractType: ERC20BridgeSamplerContract,
            sellContractSellFunctionName: 'sampleSellsFromMStable',
            buyContractBuyFunctionName: 'sampleBuysFromMStable',
        });
    }

    public canConvertTokens(tokenAddressPath: Address[], pools?: Address[]): boolean {
        if (tokenAddressPath.length != 2) {
            return false;
        }
        const _pools = pools || this._getPoolsForTokens(tokenAddressPath);
        if (_pools.length === 0) {
            return false;
        }
        return true;
    }

    protected async _getSellQuoteCallsAsync(
        tokenAddressPath: string[],
        takerFillAmounts: BigNumber[],
    ): Promise<SamplerSellEthCall[]> {
        const pools = this._getPoolsForTokens(tokenAddressPath);
        const [takerToken, makerToken] = tokenAddressPath;
        return pools.map(poolAddress => ({
            args: [
                poolAddress,
                takerToken,
                makerToken,
                takerFillAmounts,
            ],
            getDexSamplesFromResult: samples =>
                takerFillAmounts.map((a, i) => ({
                    source: ERC20BridgeSource.MStable,
                    fillData: { poolAddress: poolAddress },
                    input: a,
                    output: samples[i]
                })),
        }));
    }

    protected async _getBuyQuoteCallsAsync(
        tokenAddressPath: string[],
        makerFillAmounts: BigNumber[],
    ): Promise<SamplerBuyEthCall[]> {
        const pools = this._getPoolsForTokens(tokenAddressPath);
        const [takerToken, makerToken] = tokenAddressPath;
        return pools.map(poolAddress => ({
            args: [
                poolAddress,
                takerToken,
                makerToken,
                makerFillAmounts,
            ],
            getDexSamplesFromResult: samples =>
                makerFillAmounts.map((a, i) => ({
                    source: ERC20BridgeSource.MStable,
                    fillData: { poolAddress: poolAddress },
                    input: a,
                    output: samples[i]
                })),
        }));
    }

    private _getPoolsForTokens(tokens: Address[]): Address[] {
        return this._pools.filter(p => tokens.every(t => p.tokens.includes(t))).map(p => p.poolAddress);
    }
}
