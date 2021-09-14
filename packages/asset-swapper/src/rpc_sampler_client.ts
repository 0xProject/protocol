import axios from 'axios';

import {
    Address,
    LiquidityResponse,
    RpcLiquidityRequest,
    TokenResponse,
} from './utils/market_operation_utils/sampler_types';

const SAMPLER_SERVICE_URL = '';

export interface SamplerServiceInterface {
    getSellLiquidityAsync(reqs: RpcLiquidityRequest[]): Promise<LiquidityResponse[]>;
    getBuyLiquidityAsync(reqs: RpcLiquidityRequest[]): Promise<LiquidityResponse[]>;
    getTokensAsync(tokenAddresses: Address[]): Promise<TokenResponse[]>;
    // getPrices(tokenPaths: Address[][]): Promise<bigint[]>;
}

export class RpcSamplerClient implements SamplerServiceInterface {
    // tslint:disable:prefer-function-over-method
    public async getSellLiquidityAsync(reqs: RpcLiquidityRequest[]): Promise<LiquidityResponse[]> {
        try {
            return await axios.post(`${SAMPLER_SERVICE_URL}/get_sell_liquidity`, reqs, {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 1000,
            });
        } catch (err) {
            throw new Error(`error with sampler service: ${err}`);
        }
    }

    // tslint:disable:prefer-function-over-method
    public async getBuyLiquidityAsync(reqs: RpcLiquidityRequest[]): Promise<LiquidityResponse[]> {
        try {
            return await axios.post(`${SAMPLER_SERVICE_URL}/get_buy_liquidity`, reqs, {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 1000,
            });
        } catch (err) {
            throw new Error(`error with sampler service: ${err}`);
        }
    }

    // tslint:disable:prefer-function-over-method
    public async getTokensAsync(tokenAddresses: Address[]): Promise<TokenResponse[]> {
        try {
            return await axios.post(`${SAMPLER_SERVICE_URL}/get_tokens`, tokenAddresses, {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 1000,
            });
        } catch (err) {
            throw new Error(`error with sampler service: ${err}`);
        }
    }
}