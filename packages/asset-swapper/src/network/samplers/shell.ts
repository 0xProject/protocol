import { ChainId } from '@0x/contract-addresses';
import { BigNumber } from '@0x/utils';

import { ERC20BridgeSamplerContract } from '../../wrappers';

import { Chain } from '../chain';
import { NULL_ADDRESS } from '../constants';
import { OnChainSourceSampler, SamplerEthCall } from '../source_sampler';
import { MAINNET_TOKENS } from '../tokens';
import { Address, ERC20BridgeSource, FillData } from '../types';
import { valueByChainId } from '../utils';

export interface ShellFillData extends FillData {
    poolAddress: string;
}

export interface ShellPoolInfo {
    poolAddress: Address;
    tokens: Address[];
}

const SHELL_POOLS_BY_CHAIN_ID = valueByChainId(
    {
        [ChainId.Mainnet]: {
            StableCoins: {
                poolAddress: '0x8f26d7bab7a73309141a291525c965ecdea7bf42',
                tokens: [MAINNET_TOKENS.USDC, MAINNET_TOKENS.USDT, MAINNET_TOKENS.sUSD, MAINNET_TOKENS.DAI],
            },
            Bitcoin: {
                poolAddress: '0xc2d019b901f8d4fdb2b9a65b5d226ad88c66ee8d',
                tokens: [MAINNET_TOKENS.RenBTC, MAINNET_TOKENS.WBTC, MAINNET_TOKENS.sBTC],
            },
        },
    },
    {
        StableCoins: {
            poolAddress: NULL_ADDRESS,
            tokens: [] as string[],
        },
        Bitcoin: {
            poolAddress: NULL_ADDRESS,
            tokens: [] as string[],
        },
    },
);

const COMPONENT_POOLS_BY_CHAIN_ID = valueByChainId(
    {
        [ChainId.Mainnet]: {
            USDP_USDC_USDT: {
                poolAddress: '0x49519631b404e06ca79c9c7b0dc91648d86f08db',
                tokens: [MAINNET_TOKENS.USDP, MAINNET_TOKENS.USDC, MAINNET_TOKENS.USDT],
            },
            USDP_DAI_SUSD: {
                poolAddress: '0x6477960dd932d29518d7e8087d5ea3d11e606068',
                tokens: [MAINNET_TOKENS.USDP, MAINNET_TOKENS.DAI, MAINNET_TOKENS.sUSD],
            },
        },
    },
    {
        USDP_USDC_USDT: {
            poolAddress: NULL_ADDRESS,
            tokens: [] as string[],
        },
        USDP_DAI_SUSD: {
            poolAddress: NULL_ADDRESS,
            tokens: [] as string[],
        },
    },
);

const GAS_PER_SAMPLE = 400e3;

type SellContract = ERC20BridgeSamplerContract;
type BuyContract = ERC20BridgeSamplerContract;
type SellContractSellFunction = SellContract['sampleSellsFromShell'];
type BuyContractBuyFunction = BuyContract['sampleBuysFromShell'];
type SamplerSellEthCall = SamplerEthCall<ShellFillData, SellContractSellFunction>;
type SamplerBuyEthCall = SamplerEthCall<ShellFillData, BuyContractBuyFunction>;

export class ShellSampler extends OnChainSourceSampler<
    SellContract,
    BuyContract,
    SellContractSellFunction,
    BuyContractBuyFunction,
    ShellFillData
> {
    public static async createAsync(chain: Chain, fork: ERC20BridgeSource): Promise<ShellSampler> {
        let pools: ShellPoolInfo[];
        switch (fork) {
            case ERC20BridgeSource.Shell:
                pools = Object.values(SHELL_POOLS_BY_CHAIN_ID[chain.chainId]);
                break;
            case ERC20BridgeSource.Component:
                pools = Object.values(COMPONENT_POOLS_BY_CHAIN_ID[chain.chainId]);
                break;
            default:
                throw new Error(`Invalid Shell fork: ${fork}`);
        }
        return new ShellSampler(chain, fork, pools);
    }

    protected constructor(
        chain: Chain,
        public readonly fork: ERC20BridgeSource,
        private readonly _pools: ShellPoolInfo[],
    ) {
        super({
            chain,
            sellSamplerContractType: ERC20BridgeSamplerContract,
            buySamplerContractType: ERC20BridgeSamplerContract,
            sellContractSellFunctionName: 'sampleSellsFromShell',
            buyContractBuyFunctionName: 'sampleBuysFromShell',
        });
    }

    public canConvertTokens(tokenAddressPath: Address[], pools?: Address[]): boolean {
        if (tokenAddressPath.length !== 2) {
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
            args: [poolAddress, takerToken, makerToken, takerFillAmounts],
            getDexSamplesFromResult: samples =>
                takerFillAmounts.map((a, i) => ({
                    source: this.fork,
                    fillData: { poolAddress },
                    input: a,
                    output: samples[i],
                })),
            gas: GAS_PER_SAMPLE * takerFillAmounts.length,
        }));
    }

    protected async _getBuyQuoteCallsAsync(
        tokenAddressPath: string[],
        makerFillAmounts: BigNumber[],
    ): Promise<SamplerBuyEthCall[]> {
        const pools = this._getPoolsForTokens(tokenAddressPath);
        const [takerToken, makerToken] = tokenAddressPath;
        return pools.map(poolAddress => ({
            args: [poolAddress, takerToken, makerToken, makerFillAmounts],
            getDexSamplesFromResult: samples =>
                makerFillAmounts.map((a, i) => ({
                    source: this.fork,
                    fillData: { poolAddress },
                    input: a,
                    output: samples[i],
                })),
            gas: GAS_PER_SAMPLE * makerFillAmounts.length * 2,
        }));
    }

    private _getPoolsForTokens(tokens: Address[]): Address[] {
        return this._pools.filter(p => tokens.every(t => p.tokens.includes(t))).map(p => p.poolAddress);
    }
}
