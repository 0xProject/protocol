import {
    RejectedCode,
    RejectedKind,
    RejectedOrderInfo,
    SignedOrder,
    ValidationResults,
    WSClient,
    WSOpts,
} from '@0x/mesh-rpc-client';
import { orderHashUtils } from '@0x/order-utils';
import * as _ from 'lodash';

import { MESH_ORDERS_BATCH_HTTP_BYTE_LENGTH, MESH_ORDERS_BATCH_SIZE } from '../constants';
import { logger } from '../logger';

import { retryableAxios } from './axios_utils';
import { utils } from './utils';

export class MeshClient extends WSClient {
    public async addOrdersAsync(orders: SignedOrder[], pinned: boolean = false): Promise<ValidationResults> {
        const validationResults: ValidationResults = { accepted: [], rejected: [] };
        if (_.isEmpty(this.httpURI) || orders.length <= MESH_ORDERS_BATCH_SIZE) {
            const chunks = _.chunk(orders, MESH_ORDERS_BATCH_SIZE);
            // send via websocket
            // break into chunks because mesh websocket fails when the msg is too big
            for (const chunk of chunks) {
                const results = await super.addOrdersAsync(chunk, pinned);
                validationResults.accepted = [...validationResults.accepted, ...results.accepted];
                validationResults.rejected = [...validationResults.rejected, ...results.rejected];
            }
        } else {
            const chunks = utils.chunkByByteLength<SignedOrder>(orders, MESH_ORDERS_BATCH_HTTP_BYTE_LENGTH);
            for (const [i, chunk] of chunks.entries()) {
                // send via http
                // format JSON-RPC request payload
                const data = {
                    jsonrpc: '2.0',
                    id: +new Date(),
                    method: 'mesh_addOrders',
                    params: [chunk, { pinned }],
                };

                try {
                    const startTime = Date.now();
                    // send the request
                    const response = await retryableAxios({
                        method: 'post',
                        url: this.httpURI,
                        data,
                        raxConfig: {
                            httpMethodsToRetry: ['POST'],
                            retryDelay: 3000,
                        },
                    });
                    const endTime = Date.now();

                    // validate the response
                    utils.isValidJsonRpcResponseOrThrow(response.data, data);
                    const results = response.data.result;
                    validationResults.accepted = [...validationResults.accepted, ...results.accepted];
                    validationResults.rejected = [...validationResults.rejected, ...results.rejected];
                    logger.info(`Mesh HTTP sync ${i + 1}/${chunks.length} complete ${endTime - startTime}ms`);
                } catch (err) {
                    logger.error(`Mesh HTTP sync ${i + 1}/${chunks.length} failed ${err.message}`);
                    // If we can't validate orders, and have exhausted retries, then we need to reject
                    const rejected: RejectedOrderInfo[] = await Promise.all(
                        orders.map(o => ({
                            orderHash: orderHashUtils.getOrderHash(o),
                            signedOrder: o,
                            kind: RejectedKind.MeshError,
                            status: {
                                code: RejectedCode.NetworkRequestFailed,
                                message: 'Unable to verify order with Mesh',
                            },
                        })),
                    );
                    validationResults.rejected = [...validationResults.rejected, ...rejected];
                }
            }
        }
        return validationResults;
    }

    constructor(public readonly websocketURI: string, public readonly httpURI?: string, websocketOpts?: WSOpts) {
        super(websocketURI, websocketOpts);
    }
}
