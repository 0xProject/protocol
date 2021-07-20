import { ChainId } from '@0x/contract-addresses';
import { BigNumber } from '@0x/utils';

import { ERC20BridgeSamplerContract } from '../../wrappers';

import { Chain } from '../chain';
import { NULL_ADDRESS, NULL_BYTES } from '../constants';
import { OnChainSourceSampler, SamplerEthCall } from '../source_sampler';
import { MAINNET_TOKENS, ROPSTEN_TOKENS } from '../tokens';
import { Address, Bytes, ERC20BridgeSource, FillData } from '../types';
import { valueByChainId } from '../utils';

const GAS_PER_SAMPLE = 6500e3;

interface KyberSamplerOpts {
    networkProxy: Address;
    hintHandler: Address;
    weth: Address;
}

export interface KyberFillData extends FillData {
    hint: Bytes;
    reserveId: string;
    networkProxy: Address;
}
/**
 * Kyber reserve prefixes
 * 0xff Fed price reserve
 * 0xaa Automated price reserve
 * 0xbb Bridged price reserve (i.e Uniswap/Curve)
 */
const KYBER_BRIDGED_LIQUIDITY_PREFIX = '0xbb';
const KYBER_BANNED_RESERVES = ['0xff4f6e65426974205175616e7400000000000000000000000000000000000000'];
const MAX_KYBER_RESERVES_QUERIED = 5;
const KYBER_RESERVE_OFFSETS = Array(MAX_KYBER_RESERVES_QUERIED)
    .fill(0)
    .map((_v, i) => new BigNumber(i));
const KYBER_OPTS_BY_CHAIN_ID = valueByChainId<KyberSamplerOpts>(
    {
        [ChainId.Mainnet]: {
            networkProxy: '0x9aab3f75489902f3a48495025729a0af77d4b11e',
            hintHandler: '0xa1c0fa73c39cfbcc11ec9eb1afc665aba9996e2c',
            weth: MAINNET_TOKENS.WETH,
        },
        [ChainId.Ropsten]: {
            networkProxy: '0x818e6fecd516ecc3849daf6845e3ec868087b755',
            hintHandler: '0x63f773c026093eef988e803bdd5772dd235a8e71',
            weth: ROPSTEN_TOKENS.WETH,
        },
    },
    {
        networkProxy: NULL_ADDRESS,
        hintHandler: NULL_ADDRESS,
        weth: NULL_ADDRESS,
    },
);

type SellContract = ERC20BridgeSamplerContract;
type BuyContract = ERC20BridgeSamplerContract;
type SellContractSellFunction = SellContract['sampleSellsFromKyberNetwork'];
type BuyContractBuyFunction = BuyContract['sampleBuysFromKyberNetwork'];
type SamplerSellEthCall = SamplerEthCall<KyberFillData, SellContractSellFunction>;
type SamplerBuyEthCall = SamplerEthCall<KyberFillData, BuyContractBuyFunction>;

export class KyberSampler extends OnChainSourceSampler<
    SellContract,
    BuyContract,
    SellContractSellFunction,
    BuyContractBuyFunction,
    KyberFillData
> {
    public static async createAsync(chain: Chain): Promise<KyberSampler> {
        return new KyberSampler(chain, KYBER_OPTS_BY_CHAIN_ID[chain.chainId]);
    }

    protected constructor(chain: Chain, private readonly _opts: KyberSamplerOpts) {
        super({
            chain,
            sellSamplerContractType: ERC20BridgeSamplerContract,
            buySamplerContractType: ERC20BridgeSamplerContract,
            sellContractSellFunctionName: 'sampleSellsFromKyberNetwork',
            buyContractBuyFunctionName: 'sampleBuysFromKyberNetwork',
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
        return KYBER_RESERVE_OFFSETS.map(reserveOffset => ({
            args: [
                {
                    ...this._opts,
                    reserveOffset,
                    hint: NULL_BYTES,
                },
                takerToken,
                makerToken,
                takerFillAmounts,
            ],
            getDexSamplesFromResult: ([reserveId, hint, samples]) =>
                isAllowedKyberReserveId(reserveId)
                    ? takerFillAmounts.map((a, i) => ({
                          source: ERC20BridgeSource.Kyber,
                          fillData: {
                              hint,
                              reserveId,
                              networkProxy: this._opts.networkProxy,
                          },
                          input: a,
                          output: samples[i],
                      }))
                    : [],
            gas: takerFillAmounts.length * GAS_PER_SAMPLE,
        }));
    }

    protected async _getBuyQuoteCallsAsync(
        tokenAddressPath: string[],
        makerFillAmounts: BigNumber[],
    ): Promise<SamplerBuyEthCall[]> {
        const [takerToken, makerToken] = tokenAddressPath;
        return KYBER_RESERVE_OFFSETS.map(reserveOffset => ({
            args: [
                {
                    ...this._opts,
                    reserveOffset,
                    hint: NULL_BYTES,
                },
                takerToken,
                makerToken,
                makerFillAmounts,
            ],
            getDexSamplesFromResult: ([reserveId, hint, samples]) =>
                isAllowedKyberReserveId(reserveId)
                    ? makerFillAmounts.map((a, i) => ({
                          source: ERC20BridgeSource.Kyber,
                          fillData: {
                              hint,
                              reserveId,
                              networkProxy: this._opts.networkProxy,
                          },
                          input: a,
                          output: samples[i],
                      }))
                    : [],
            gas: makerFillAmounts.length * GAS_PER_SAMPLE * 2,
        }));
    }
}

function isAllowedKyberReserveId(reserveId: string): boolean {
    return (
        reserveId !== NULL_BYTES &&
        !reserveId.startsWith(KYBER_BRIDGED_LIQUIDITY_PREFIX) &&
        !KYBER_BANNED_RESERVES.includes(reserveId)
    );
}
