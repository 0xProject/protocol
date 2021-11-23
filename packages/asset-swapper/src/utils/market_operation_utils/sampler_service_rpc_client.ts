import { BigNumber } from '@0x/utils';
import { Client as OpenRpcClient, HTTPTransport, RequestManager } from '@open-rpc/client-js';

import { Address, Bytes } from '../../types';

type DecimalString = string;

export interface LiquidityCurvePoint {
    sellAmount: BigNumber;
    buyAmount: BigNumber;
    encodedFillData: Bytes;
    gasCost: number;
}

type RpcLiquidityCurvePoint = Omit<Omit<LiquidityCurvePoint, 'sellAmount'>, 'buyAmount'> & {
    sellAmount: DecimalString;
    buyAmount: DecimalString;
}

export interface LiquidityRequest {
    tokenPath: Address[];
    inputAmount: BigNumber;
    source: string;
    demand?: boolean;
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
