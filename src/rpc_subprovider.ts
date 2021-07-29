import { assert } from '@0x/assert';
import { Callback, ErrorCallback, Subprovider } from '@0x/subproviders';
import { StatusCodes } from '@0x/types';
import { JSONRPCRequestPayload } from 'ethereum-types';
import * as http from 'http';
import * as https from 'https';
import JsonRpcError = require('json-rpc-error');
import fetch, { Headers, Response } from 'node-fetch';
import { Counter, Histogram } from 'prom-client';

import { ONE_SECOND_MS, PROMETHEUS_REQUEST_BUCKETS } from './constants';

const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });
const agent = (_parsedURL: any) => (_parsedURL.protocol === 'http:' ? httpAgent : httpsAgent);

const ETH_RPC_RESPONSE_TIME = new Histogram({
    name: 'eth_rpc_response_time',
    help: 'The response time of an RPC request',
    labelNames: ['method'],
    buckets: PROMETHEUS_REQUEST_BUCKETS,
});

const ETH_RPC_REQUESTS = new Counter({
    name: 'eth_rpc_requests',
    help: 'The count of RPC requests',
    labelNames: ['method'],
});

const ETH_RPC_REQUEST_SUCCESS = new Counter({
    name: 'eth_rpc_request_success',
    help: 'The count of successful RPC requests',
    labelNames: ['method'],
});

const ETH_RPC_REQUEST_ERROR = new Counter({
    name: 'eth_rpc_request_error',
    help: 'The count of RPC request errors',
    labelNames: ['method'],
});

/**
 * This class implements the [web3-provider-engine](https://github.com/MetaMask/provider-engine) subprovider interface.
 * It forwards on JSON RPC requests to the supplied `rpcUrl` endpoint
 */
export class RPCSubprovider extends Subprovider {
    private readonly _rpcUrls: string[];
    private readonly _requestTimeoutMs: number;
    /**
     * @param rpcUrl URL to the backing Ethereum node to which JSON RPC requests should be sent
     * @param requestTimeoutMs Amount of miliseconds to wait before timing out the JSON RPC request
     */
    constructor(rpcUrl: string | string[], requestTimeoutMs: number = 5000) {
        super();
        this._rpcUrls = Array.isArray(rpcUrl) ? rpcUrl : [rpcUrl];
        this._rpcUrls.forEach((url) => assert.isString('rpcUrl', url));
        assert.isNumber('requestTimeoutMs', requestTimeoutMs);
        this._requestTimeoutMs = requestTimeoutMs;
    }
    /**
     * This method conforms to the web3-provider-engine interface.
     * It is called internally by the ProviderEngine when it is this subproviders
     * turn to handle a JSON RPC request.
     * @param payload JSON RPC payload
     * @param _next Callback to call if this subprovider decides not to handle the request
     * @param end Callback to call if subprovider handled the request and wants to pass back the request.
     */
    // tslint:disable-next-line:prefer-function-over-method async-suffix
    public async handleRequest(payload: JSONRPCRequestPayload, _next: Callback, end: ErrorCallback): Promise<void> {
        const finalPayload = Subprovider._createFinalPayload(payload);
        const headers = new Headers({
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            Connection: 'keep-alive',
            'Content-Type': 'application/json',
        });

        ETH_RPC_REQUESTS.labels(finalPayload.method!).inc();
        const begin = Date.now();

        let response: Response;
        const rpcUrl = this._rpcUrls[Math.floor(Math.random() * this._rpcUrls.length)];
        try {
            response = await fetch(rpcUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify(finalPayload),
                timeout: this._requestTimeoutMs,
                compress: true,
                agent,
            });
        } catch (err) {
            ETH_RPC_REQUEST_ERROR.labels(finalPayload.method!).inc();
            end(new JsonRpcError.InternalError(err));
            return;
        } finally {
            const duration = (Date.now() - begin) / ONE_SECOND_MS;
            ETH_RPC_RESPONSE_TIME.labels(finalPayload.method!).observe(duration);
        }

        const text = await response.text();
        if (!response.ok) {
            ETH_RPC_REQUEST_ERROR.labels(finalPayload.method!).inc();
            const statusCode = response.status;
            switch (statusCode) {
                case StatusCodes.MethodNotAllowed:
                    end(new JsonRpcError.MethodNotFound());
                    return;
                case StatusCodes.GatewayTimeout:
                    const errMsg =
                        'Gateway timeout. The request took too long to process. This can happen when querying logs over too wide a block range.';
                    const err = new Error(errMsg);
                    end(new JsonRpcError.InternalError(err));
                    return;
                default:
                    end(new JsonRpcError.InternalError(text));
                    return;
            }
        }

        let data;
        try {
            data = JSON.parse(text);
        } catch (err) {
            ETH_RPC_REQUEST_ERROR.labels(finalPayload.method!).inc();
            end(new JsonRpcError.InternalError(err));
            return;
        }

        if (data.error) {
            ETH_RPC_REQUEST_ERROR.labels(finalPayload.method!).inc();
            end(data.error);
            return;
        }
        ETH_RPC_REQUEST_SUCCESS.labels(finalPayload.method!).inc();
        end(null, data.result);
    }
}
