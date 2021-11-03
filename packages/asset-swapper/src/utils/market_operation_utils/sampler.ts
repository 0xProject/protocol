import { ChainId } from '@0x/contract-addresses';
import { BigNumber } from '@0x/utils';

import { Address } from '../../types';

import { DexSample, ERC20BridgeSource, TokenAdjacencyGraph } from './types';
import { SamplerServiceRpcClient } from './sampler_service_rpc_client';

interface TokenInfo {
    decimals: number;
    address: Address;
    gasCost: number;
    symbol: string;
}

export interface Sampler {
    chainId: ChainId;
    getTokenInfosAsync(tokens: Address[]): Promise<TokenInfo[]>;
    getPricesAsync(paths: Address[][], sources: ERC20BridgeSource[]): Promise<BigNumber[]>;
    getSellLiquidityAsync(path: Address[], takerAmount: BigNumber, sources: ERC20BridgeSource[]): Promise<DexSample[][]>;
}

export class SamplerClient implements Sampler {
    static createFromChainIdAndEndpoint(chainId: ChainId, endpoint: string): SamplerClient {
        return new SamplerClient(chainId, new SamplerServiceRpcClient(endpoint));
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
    ): Promise<BigNumber[]> {
        return this._service.getPricesAsync(paths.map(p => ({
            tokenPath: p,
            demand: true,
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
    ): Promise<DexSample[][]> {
        const liquidity = await this._service.getSellLiquidityAsync(
            sources.map(s => ({
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
                        gasCost: pt.gasCost,
                        source: liq.source,
                    }) as DexSample),
        )).flat(1);
    }
}
