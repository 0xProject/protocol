import { SignedOrder, ValidationResults, WSClient, WSOpts } from '@0x/mesh-rpc-client';
import Axios from 'axios';
import * as _ from 'lodash';

import { MESH_ORDERS_BATCH_SIZE } from '../constants';

import { utils } from './utils';

export class MeshClient extends WSClient {
    public async addOrdersAsync(orders: SignedOrder[], pinned: boolean = false): Promise<ValidationResults> {
        if (_.isEmpty(this.httpURI) || orders.length <= MESH_ORDERS_BATCH_SIZE) {
            // send via websocket
            // break into chunks because mesh websocket fails when the msg is too big
            const validationResults: ValidationResults = { accepted: [], rejected: [] };
            const chunks = _.chunk(orders, MESH_ORDERS_BATCH_SIZE);
            chunks.forEach(async chunk => {
                const results = await super.addOrdersAsync(chunk, pinned);
                validationResults.accepted = [...validationResults.accepted, ...results.accepted];
                validationResults.rejected = [...validationResults.rejected, ...results.rejected];
            });
            return validationResults;
        } else {
            // send via http
            // format JSON-RPC request payload
            const data = {
                jsonrpc: '2.0',
                id: +new Date(),
                method: 'mesh_addOrders',
                params: [orders, { pinned }],
            };

            // send the request
            const response = await Axios({
                method: 'post',
                url: this.httpURI,
                data,
            });

            // validate the response
            utils.isValidJsonRpcResponseOrThrow(response.data, data);
            return response.data.result;
        }
    }

    constructor(public readonly websocketURI: string, public readonly httpURI?: string, websocketOpts?: WSOpts) {
        super(websocketURI, websocketOpts);
    }
}
