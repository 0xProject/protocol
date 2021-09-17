import { Client as RPCClient, JSONRPCVersionOneResponse } from 'jayson';

import {
    LiquidityResponse,
    RpcLiquidityRequest,
    RPCSamplerCallback,
} from './utils/market_operation_utils/sampler_types';

const RPC_SAMPLER_SERVICE_URL = '';
const RPC_SAMPLER_SERVICE_PORT = 7002;
export class RpcSamplerClient {
    private readonly _rpcUrl: string;
    private readonly _rpcClient: RPCClient;

    /**
     * @param rpcUrl URL to the Sampler Service to which JSON RPC requests should be sent
     */
    constructor() {
        this._rpcUrl = RPC_SAMPLER_SERVICE_URL;
        this._rpcClient = RPCClient.http({ port: RPC_SAMPLER_SERVICE_PORT });
    }

    public getSellLiquidity(reqs: RpcLiquidityRequest[], rpcSamplerCallback: RPCSamplerCallback): void {
        try {
            this._rpcClient.request(`get_sell_liquidity`, [reqs], (err: any, response: JSONRPCVersionOneResponse) => {
                return rpcSamplerCallback(err, response.result);
            });
        } catch (err) {
            throw new Error(`error with sampler service: ${err}`);
        }
    }

    public async getSellLiquidityWrapperAsync(reqs: RpcLiquidityRequest[]): Promise<LiquidityResponse[]> {
        return new Promise(resolve => {
            this.getSellLiquidity(reqs, (err, liquidityResponses: LiquidityResponse[])  => {
                return resolve(liquidityResponses);
            });
        });
    }
}
