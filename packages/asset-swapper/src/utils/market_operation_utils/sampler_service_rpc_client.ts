import { BigNumber } from '@0x/utils';
import { Client as OpenRpcClient, HTTPTransport, RequestManager } from '@open-rpc/client-js';

import { Address, Bytes } from '../../types';

type DecimalString = string;

export interface LiquidityCurvePoint {
    sellAmount: BigNumber;
    buyAmount: BigNumber;
    encodedFillData: Bytes;
    metadata: object;
    gasCost: number;
}

interface RpcLiquidityCurvePoint {
    sellAmount: DecimalString;
    buyAmount: DecimalString;
    encodedFillData: Bytes;
    jsonMetadata: string;
    gasCost: number;
}

export interface LiquidityRequest {
    tokenPath: Address[];
    inputAmount: BigNumber;
    source: string;
    demand?: boolean;
    numSamples?: number;
}

type RpcLiquidityRequest = Omit<LiquidityRequest, 'inputAmount'> & {
    inputAmount: string;
}

export interface PriceRequest {
    tokenPath: Address[];
    sources?: string[];
    demand?: boolean;
}

type RpcPriceRequest = PriceRequest;

export interface LiquidityResponse {
    source: string;
    liquidityCurves: LiquidityCurvePoint[][];
}

type RpcLiquidityResponse = & Omit<LiquidityResponse, 'liquidityCurves'> & {
    source: string;
    liquidityCurves: RpcLiquidityCurvePoint[][];
}

export interface TokenResponse {
    address: Address;
    symbol: string;
    decimals: number;
    gasCost: number;
}

type RpcTokenResponse = TokenResponse;

export class SamplerServiceRpcClient {
    private _rpcClient: OpenRpcClient;

    public constructor(url: string) {
        const transport = new HTTPTransport(url);
        // HACK(dorothy-zbornak): One of AS/API's deps globally registers a version of
        // isometric-fetch that doesn't work with open-rpc. It seems to disagree on
        // the type of 'headers'.
        (transport as any).headers = {'content-type': 'application/json'};
        this._rpcClient = new OpenRpcClient(new RequestManager([transport]));
    }

    private async _requestAsync<TResult, TArgs = any>(method: string, params: TArgs[] = []): Promise<TResult> {
        try {
            return await this._rpcClient.request({ method, params }) as Promise<TResult>;
        } catch (err) {
            throw new Error(`Error making RPC request "${method}" to sampler service: ${err}`);
        }
    }

    public async getChainIdAsync(): Promise<number> {
        return this._requestAsync<number>('get_chain_id');
    }

    public async getSellLiquidityAsync(reqs: LiquidityRequest[]): Promise<LiquidityResponse[]> {
        const resp = await this._requestAsync<RpcLiquidityResponse[], RpcLiquidityRequest[]>(
            'get_sell_liquidity',
            [
                reqs.map(r => ({
                    ...r,
                    inputAmount: r.inputAmount.toString(10),
                })),
            ],
        );
        return resp.map(r => ({
            ...r,
            liquidityCurves: r.liquidityCurves.map(a => a.map(c => ({
                ...c,
                buyAmount: new BigNumber(c.buyAmount),
                sellAmount: new BigNumber(c.sellAmount),
                metadata: decodeMetadata(c.jsonMetadata),
            }))),
        }));
    }

    public async getBuyLiquidityAsync(reqs: LiquidityRequest[]): Promise<LiquidityResponse[]> {
        const resp = await this._requestAsync<RpcLiquidityResponse[], RpcLiquidityRequest[]>(
            'get_buy_liquidity',
            [
                reqs.map(r => ({
                    ...r,
                    inputAmount: r.inputAmount.toString(10),
                })),
            ],
        );
        return resp.map(r => ({
            ...r,
            liquidityCurves: r.liquidityCurves.map(a => a.map(c => ({
                ...c,
                buyAmount: new BigNumber(c.buyAmount),
                sellAmount: new BigNumber(c.sellAmount),
                metadata: decodeMetadata(c.jsonMetadata),
            }))),
        }));
    }

    public async getPricesAsync(reqs: PriceRequest[]): Promise<BigNumber[]> {
        const resp = await this._requestAsync<DecimalString[], RpcPriceRequest[]>(
            'get_prices',
            [ reqs ],
        );
        return resp.map(r => new BigNumber(r));
    }

    public async getTokensAsync(addresses: Address[]): Promise<TokenResponse[]> {
        return this._requestAsync<RpcTokenResponse[], Address[]>(
            'get_tokens',
            [ addresses ],
        );
    }
}

function decodeMetadata(jsonMetadata: string): any {
    if (!jsonMetadata) {
        return undefined;
    }
    return unmarshallMetadata(JSON.parse(jsonMetadata));
}

function unmarshallMetadata(v: any): any {
    switch (typeof(v)) {
        case 'string':
            if (/^\d+n$/.test(v)) {
                return new BigNumber(v.slice(0, -1));
            }
            return v;
        case 'object':
            if (Array.isArray(v)) {
                return v.map(v => unmarshallMetadata(v));
            }
            return Object.assign(
                {},
                ...Object.entries(v).map(([k, v]) => ({ [k]: v})),
            );
    }
    return v;
}
