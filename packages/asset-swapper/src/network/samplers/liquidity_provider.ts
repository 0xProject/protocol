import { ChainId } from '@0x/contract-addresses';
import { BigNumber } from '@0x/utils';

import { ERC20BridgeSamplerContract } from '../../wrappers';

import { Chain } from '../chain';
import { OnChainSourceSampler, SamplerEthCall } from '../source_sampler';
import { MAINNET_TOKENS } from '../tokens';
import { Address, ERC20BridgeSource, FillData } from '../types';
import { valueByChainId } from '../utils';

export interface LiquidityProviderFillData extends FillData {
    poolAddress: Address;
    gasCost: number;
}

export interface LiquidityProviderInfo {
    tokens: Address[];
    gasCost: number | ((takerToken: Address, makerToken: Address) => number);
}

export interface LiquidityProviderRegistry {
    [address: string]: LiquidityProviderInfo;
}

const DEFAULT_LIQUIDITY_PROVIDER_REGISTRY_BY_CHAIN_ID = valueByChainId<LiquidityProviderRegistry>(
    {
        [ChainId.Mainnet]: {
            // OBQ
            ['0x1d0d407c5af8c86f0a6494de86e56ae21e46a951']: {
                tokens: [
                    MAINNET_TOKENS.WETH,
                    MAINNET_TOKENS.USDC,
                    MAINNET_TOKENS.USDT,
                    MAINNET_TOKENS.WBTC,
                    MAINNET_TOKENS.PAX,
                    MAINNET_TOKENS.LINK,
                    MAINNET_TOKENS.KNC,
                    MAINNET_TOKENS.MANA,
                    MAINNET_TOKENS.DAI,
                    MAINNET_TOKENS.BUSD,
                    MAINNET_TOKENS.AAVE,
                    MAINNET_TOKENS.HT,
                ],
                gasCost: (takerToken: string, makerToken: string) =>
                    [takerToken, makerToken].includes(MAINNET_TOKENS.WETH) ? 160e3 : 280e3,
            },
        },
    },
    {},
);

export type LiquidityProviderRegistryByChainId = typeof DEFAULT_LIQUIDITY_PROVIDER_REGISTRY_BY_CHAIN_ID;

export function mergeLiquidityProviderRegistries(
    // tslint:disable-next-line: trailing-comma
    ...registries: LiquidityProviderRegistryByChainId[]
): LiquidityProviderRegistryByChainId {
    return {
        ...Object.values(ChainId).map(c => ({
            [c]: {
                ...registries.map(r => r[c as ChainId]),
            },
        })),
    } as any;
}

type SellContract = ERC20BridgeSamplerContract;
type BuyContract = ERC20BridgeSamplerContract;
type SellContractSellFunction = SellContract['sampleSellsFromLiquidityProvider'];
type BuyContractBuyFunction = BuyContract['sampleBuysFromLiquidityProvider'];
type SamplerSellEthCall = SamplerEthCall<LiquidityProviderFillData, SellContractSellFunction>;
type SamplerBuyEthCall = SamplerEthCall<LiquidityProviderFillData, BuyContractBuyFunction>;

export class LiquidityProviderSampler extends OnChainSourceSampler<
    SellContract,
    BuyContract,
    SellContractSellFunction,
    BuyContractBuyFunction,
    LiquidityProviderFillData
> {
    public static async createAsync(
        chain: Chain,
        registry?: LiquidityProviderRegistry,
    ): Promise<LiquidityProviderSampler> {
        return new LiquidityProviderSampler(
            chain,
            registry || DEFAULT_LIQUIDITY_PROVIDER_REGISTRY_BY_CHAIN_ID[chain.chainId],
        );
    }

    protected constructor(chain: Chain, private readonly _registry: LiquidityProviderRegistry) {
        super({
            chain,
            sellSamplerContractType: ERC20BridgeSamplerContract,
            buySamplerContractType: ERC20BridgeSamplerContract,
            sellContractSellFunctionName: 'sampleSellsFromLiquidityProvider',
            buyContractBuyFunctionName: 'sampleBuysFromLiquidityProvider',
        });
    }

    public canConvertTokens(tokenAddressPath: Address[]): boolean {
        if (tokenAddressPath.length !== 2) {
            return false;
        }
        return this._findCompatibleProviders(tokenAddressPath).length !== 0;
    }

    protected async _getSellQuoteCallsAsync(
        tokenAddressPath: string[],
        takerFillAmounts: BigNumber[],
    ): Promise<SamplerSellEthCall[]> {
        const providers = this._findCompatibleProviders(tokenAddressPath);
        const [takerToken, makerToken] = tokenAddressPath;
        return providers.map(p => ({
            args: [p, takerToken, makerToken, takerFillAmounts],
            getDexSamplesFromResult: samples =>
                takerFillAmounts.map((a, i) => ({
                    source: ERC20BridgeSource.LiquidityProvider,
                    fillData: {
                        poolAddress: p,
                        gasCost: getProviderGasCost(this._registry[p], takerToken, makerToken),
                    },
                    input: a,
                    output: samples[i],
                })),
        }));
    }

    protected async _getBuyQuoteCallsAsync(
        tokenAddressPath: string[],
        makerFillAmounts: BigNumber[],
    ): Promise<SamplerBuyEthCall[]> {
        const providers = this._findCompatibleProviders(tokenAddressPath);
        const [takerToken, makerToken] = tokenAddressPath;
        return providers.map(p => ({
            args: [p, takerToken, makerToken, makerFillAmounts],
            getDexSamplesFromResult: samples =>
                makerFillAmounts.map((a, i) => ({
                    source: ERC20BridgeSource.LiquidityProvider,
                    fillData: {
                        poolAddress: p,
                        gasCost: getProviderGasCost(this._registry[p], takerToken, makerToken),
                    },
                    input: a,
                    output: samples[i],
                })),
        }));
    }

    private _findCompatibleProviders(tokens: Address[]): Address[] {
        return Object.entries(this._registry)
            .filter(([, v]) => tokens.every(t => v.tokens.includes(t)))
            .map(([k]) => k);
    }
}

function getProviderGasCost(providerInfo: LiquidityProviderInfo, takerToken: Address, makerToken: Address): number {
    return typeof providerInfo.gasCost === 'number'
        ? providerInfo.gasCost
        : providerInfo.gasCost(takerToken, makerToken);
}
