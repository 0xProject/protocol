import { Client as RPCClient } from 'jayson';

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

    public async getSellLiquidityAsync(reqs: RpcLiquidityRequest[], rpcSamplerCallback: RPCSamplerCallback): Promise<void> {
        try {
            this._rpcClient.request(`get_sell_liquidity`, [reqs], (err: any, liquidityResponses: LiquidityResponse[]) => {
                return rpcSamplerCallback(err, liquidityResponses);
            });
        } catch (err) {
            throw new Error(`error with sampler service: ${err}`);
        }
    }
}
