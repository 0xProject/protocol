import { ChainId } from '@0x/contract-addresses';
import { BigNumber } from '@0x/utils';

import { Address } from '../../types';

<<<<<<< HEAD
import { DexSample, ERC20BridgeSource } from './types';
import { SamplerServiceRpcClient } from './sampler_service_rpc_client';
=======
import { BancorService } from './bancor_service';
import { PoolsCacheMap, SamplerOperations } from './sampler_operations';
import { BatchedOperation, LiquidityProviderRegistry, TokenAdjacencyGraph } from './types';
>>>>>>> 470e9a469 (AS: Balancer V2 batchSwap (#462))

const DEFAULT_LIQUIDITY_SAMPLES = 16;

interface TokenInfo {
    decimals: number;
    address: Address;
    gasCost: number;
    symbol: string;
}

export interface Sampler {
    chainId: ChainId;
    getTokenInfosAsync(tokens: Address[]): Promise<TokenInfo[]>;
    getPricesAsync(paths: Address[][], sources: ERC20BridgeSource[], demand?: boolean): Promise<BigNumber[]>;
    getSellLiquidityAsync(path: Address[], takerAmount: BigNumber, sources: ERC20BridgeSource[], numSamples?: number): Promise<DexSample[][]>;
    getBuyLiquidityAsync(path: Address[], makerAmount: BigNumber, sources: ERC20BridgeSource[], numSamples?: number): Promise<DexSample[][]>;
}

<<<<<<< HEAD
export class SamplerClient implements Sampler {
    static createFromChainIdAndEndpoint(chainId: ChainId, endpoint: string): SamplerClient {
        return new SamplerClient(chainId, new SamplerServiceRpcClient(endpoint));
=======
/**
 * Encapsulates interactions with the `ERC20BridgeSampler` contract.
 */
export class DexOrderSampler extends SamplerOperations {
    constructor(
        public readonly chainId: ChainId,
        _samplerContract: ERC20BridgeSamplerContract,
        private readonly _samplerOverrides?: SamplerOverrides,
        poolsCaches?: PoolsCacheMap,
        tokenAdjacencyGraph?: TokenAdjacencyGraph,
        liquidityProviderRegistry?: LiquidityProviderRegistry,
        bancorServiceFn: () => Promise<BancorService | undefined> = async () => undefined,
    ) {
        super(chainId, _samplerContract, poolsCaches, tokenAdjacencyGraph, liquidityProviderRegistry, bancorServiceFn);
>>>>>>> 470e9a469 (AS: Balancer V2 batchSwap (#462))
    }

    static async createFromEndpointAsync(endpoint: string): Promise<SamplerClient> {
        const service = new SamplerServiceRpcClient(endpoint);
        const chainId = await service.getChainIdAsync();
        return new SamplerClient(
            chainId,
            service,
        );
    }

    private constructor(
        private readonly _chainId: number,
        private readonly _service: SamplerServiceRpcClient,
    ) {}

    public get chainId(): ChainId {
        return this._chainId;
    }

    public async getPricesAsync(
        paths: Address[][],
        sources: ERC20BridgeSource[],
        demand: boolean = true,
    ): Promise<BigNumber[]> {
        return this._service.getPricesAsync(paths.map(p => ({
            tokenPath: p,
            demand,
            sources,
        })));
    }

    public async getTokenInfosAsync(tokens: Address[]): Promise<TokenInfo[]> {
        return this._service.getTokensAsync(tokens);
    }

    public async getSellLiquidityAsync(
        path: Address[],
        takerAmount: BigNumber,
        sources: ERC20BridgeSource[],
        numSamples: number = DEFAULT_LIQUIDITY_SAMPLES,
    ): Promise<DexSample[][]> {
        const liquidity = await this._service.getSellLiquidityAsync(
            sources.map(s => ({
                numSamples,
                tokenPath: path,
                inputAmount: takerAmount,
                source: s,
                demand: true,
            })),
        );
        return liquidity.map(
            liq => liq.liquidityCurves.map(
                pts =>
                    pts.map(pt => ({
                        input: pt.sellAmount,
                        output: pt.buyAmount,
                        encodedFillData: pt.encodedFillData,
                        metadata: pt.metadata,
                        gasCost: pt.gasCost,
                        source: liq.source,
                    }) as DexSample),
        )).flat(1);
    }

    public async getBuyLiquidityAsync(
        path: Address[],
        makerAmount: BigNumber,
        sources: ERC20BridgeSource[],
        numSamples: number = DEFAULT_LIQUIDITY_SAMPLES,
    ): Promise<DexSample[][]> {
        const liquidity = await this._service.getBuyLiquidityAsync(
            sources.map(s => ({
                numSamples,
                tokenPath: path,
                inputAmount: makerAmount,
                source: s,
                demand: true,
            })),
        );
        return liquidity.map(
            liq => liq.liquidityCurves.map(
                pts =>
                    pts.map(pt => ({
                        input: pt.buyAmount,
                        output: pt.sellAmount,
                        encodedFillData: pt.encodedFillData,
                        metadata: pt.metadata,
                        gasCost: pt.gasCost,
                        source: liq.source,
                    }) as DexSample),
        )).flat(1);
    }
}
