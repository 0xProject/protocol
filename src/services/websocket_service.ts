import { schemas } from '@0x/json-schemas';
import { assetDataUtils } from '@0x/order-utils';
import {
    APIOrder,
    AssetProxyId,
    MultiAssetDataWithRecursiveDecoding,
    OrdersChannelMessageTypes,
    OrdersChannelSubscriptionOpts,
    SignedOrder,
    WebsocketConnectionEventType,
} from '@0x/types';
import * as http from 'http';
import * as _ from 'lodash';
import * as WebSocket from 'ws';

import { MESH_IGNORED_ADDRESSES } from '../config';
import { MalformedJSONError, NotImplementedError, WebsocketServiceError } from '../errors';
import { logger } from '../logger';
import { generateError } from '../middleware/error_handling';
import {
    MessageChannels,
    MessageTypes,
    OrderChannelRequest,
    UpdateOrdersChannelMessageWithChannel,
    WebsocketSRAOpts,
} from '../types';
import { MeshClient } from '../utils/mesh_client';
import { meshUtils } from '../utils/mesh_utils';
import { orderUtils } from '../utils/order_utils';
import { schemaUtils } from '../utils/schema_utils';

interface WrappedWebSocket extends WebSocket {
    isAlive: boolean;
    requestIds: Set<string>;
}

const DEFAULT_OPTS: WebsocketSRAOpts = {
    pongInterval: 5000,
    path: '/',
};

type ALL_SUBSCRIPTION_OPTS = 'ALL_SUBSCRIPTION_OPTS';

/* A websocket server that sends order updates to subscribed
 * clients. The server listens on the supplied path for
 * subscription requests from relayers. It also subscribes to
 * Mesh using mesh-rpc-client. It filters Mesh updates and sends
 * relevant orders to the subscribed clients in real time.
 */
export class WebsocketService {
    private readonly _server: WebSocket.Server;
    private readonly _meshClient: MeshClient;
    private readonly _pongIntervalId: NodeJS.Timeout;
    private readonly _requestIdToSocket: Map<string, WrappedWebSocket> = new Map(); // requestId to WebSocket mapping
    private readonly _requestIdToSubscriptionOpts: Map<
        string,
        OrdersChannelSubscriptionOpts | ALL_SUBSCRIPTION_OPTS
    > = new Map(); // requestId -> { base, quote }
    private _meshSubscriptionId?: string;
    private static _decodedContractAndAssetData(assetData: string): { assetProxyId: string; data: string[] } {
        let data: string[] = [assetData];
        const decodedAssetData = assetDataUtils.decodeAssetDataOrThrow(assetData);
        if (orderUtils.isMultiAssetData(decodedAssetData)) {
            for (const nested of decodedAssetData.nestedAssetData) {
                data = [...data, ...WebsocketService._decodedContractAndAssetData(nested).data];
            }
        } else if (orderUtils.isStaticCallAssetData(decodedAssetData)) {
            // do nothing
        } else {
            data = [
                ...data,
                // tslint:disable-next-line:no-unnecessary-type-assertion
                (decodedAssetData as Exclude<typeof decodedAssetData, MultiAssetDataWithRecursiveDecoding>)
                    .tokenAddress,
            ];
        }
        return { data, assetProxyId: decodedAssetData.assetProxyId };
    }
    private static _matchesOrdersChannelSubscription(
        order: SignedOrder,
        opts: OrdersChannelSubscriptionOpts | ALL_SUBSCRIPTION_OPTS,
    ): boolean {
        if (opts === 'ALL_SUBSCRIPTION_OPTS') {
            return true;
        }
        const { makerAssetData, takerAssetData } = order;
        const makerAssetDataTakerAssetData = [makerAssetData, takerAssetData];
        // Handle the specific, unambiguous asset datas
        // traderAssetData?: string;
        if (opts.traderAssetData && makerAssetDataTakerAssetData.includes(opts.traderAssetData)) {
            return true;
        }
        // makerAssetData?: string;
        // takerAssetData?: string;
        if (
            opts.makerAssetData &&
            opts.takerAssetData &&
            makerAssetDataTakerAssetData.includes(opts.makerAssetData) &&
            makerAssetDataTakerAssetData.includes(opts.takerAssetData)
        ) {
            return true;
        }
        // makerAssetAddress?: string;
        // takerAssetAddress?: string;
        const makerContractAndAssetData = WebsocketService._decodedContractAndAssetData(makerAssetData);
        const takerContractAndAssetData = WebsocketService._decodedContractAndAssetData(takerAssetData);
        if (
            opts.makerAssetAddress &&
            opts.takerAssetAddress &&
            makerContractAndAssetData.assetProxyId !== AssetProxyId.MultiAsset &&
            makerContractAndAssetData.assetProxyId !== AssetProxyId.StaticCall &&
            takerContractAndAssetData.assetProxyId !== AssetProxyId.MultiAsset &&
            takerContractAndAssetData.assetProxyId !== AssetProxyId.StaticCall &&
            makerContractAndAssetData.data.includes(opts.makerAssetAddress) &&
            takerContractAndAssetData.data.includes(opts.takerAssetAddress)
        ) {
            return true;
        }

        // TODO (dekz)handle MAP
        // makerAssetProxyId?: string;
        // takerAssetProxyId?: string;
        return false;
    }
    private static _handleError(_ws: WrappedWebSocket, err: Error): void {
        logger.error(new WebsocketServiceError(err));
    }
    constructor(server: http.Server, meshClient: MeshClient, opts?: Partial<WebsocketSRAOpts>) {
        const wsOpts: WebsocketSRAOpts = {
            ...DEFAULT_OPTS,
            ...opts,
        };
        this._server = new WebSocket.Server({ server, path: wsOpts.path });
        this._server.on('connection', this._processConnection.bind(this));
        this._server.on('error', WebsocketService._handleError.bind(this));
        this._pongIntervalId = setInterval(this._cleanupConnections.bind(this), wsOpts.pongInterval);
        this._meshClient = meshClient;
        // tslint:disable-next-line:no-floating-promises
        this._meshClient
            .subscribeToOrdersAsync(e => this.orderUpdate(meshUtils.orderInfosToApiOrders(e)))
            .then(subscriptionId => (this._meshSubscriptionId = subscriptionId));
    }
    public async destroyAsync(): Promise<void> {
        clearInterval(this._pongIntervalId);
        for (const ws of this._server.clients) {
            ws.terminate();
        }
        this._requestIdToSocket.clear();
        this._requestIdToSubscriptionOpts.clear();
        this._server.close();
        if (this._meshSubscriptionId) {
            try {
                await this._meshClient.unsubscribeAsync(this._meshSubscriptionId);
            } finally {
                delete this._meshSubscriptionId;
            }
        }
    }
    public orderUpdate(apiOrders: APIOrder[]): void {
        if (this._server.clients.size === 0) {
            return;
        }
        const response: Partial<UpdateOrdersChannelMessageWithChannel> = {
            type: OrdersChannelMessageTypes.Update,
            channel: MessageChannels.Orders,
            payload: apiOrders,
        };
        const allowedOrders = apiOrders.filter(
            apiOrder => !orderUtils.isIgnoredOrder(MESH_IGNORED_ADDRESSES, apiOrder),
        );
        for (const order of allowedOrders) {
            // Future optimisation is to invert this structure so the order isn't duplicated over many request ids
            // order->requestIds it is less likely to get multiple order updates and more likely
            // to have many subscribers and a single order
            const requestIdToOrders: { [requestId: string]: Set<APIOrder> } = {};
            for (const [requestId, subscriptionOpts] of this._requestIdToSubscriptionOpts) {
                if (WebsocketService._matchesOrdersChannelSubscription(order.order, subscriptionOpts)) {
                    if (requestIdToOrders[requestId]) {
                        const orderSet = requestIdToOrders[requestId];
                        orderSet.add(order);
                    } else {
                        const orderSet = new Set<APIOrder>();
                        orderSet.add(order);
                        requestIdToOrders[requestId] = orderSet;
                    }
                }
            }
            for (const [requestId, orders] of Object.entries(requestIdToOrders)) {
                const ws = this._requestIdToSocket.get(requestId);
                if (ws) {
                    ws.send(JSON.stringify({ ...response, payload: Array.from(orders), requestId }));
                }
            }
        }
    }
    private _processConnection(ws: WrappedWebSocket, _req: http.IncomingMessage): void {
        ws.on('pong', this._pongHandler(ws).bind(this));
        ws.on(WebsocketConnectionEventType.Message, this._messageHandler(ws).bind(this));
        ws.on(WebsocketConnectionEventType.Close, this._closeHandler(ws).bind(this));
        ws.isAlive = true;
        ws.requestIds = new Set<string>();
    }
    private _processMessage(ws: WrappedWebSocket, data: WebSocket.Data): void {
        let message: OrderChannelRequest;
        try {
            message = JSON.parse(data.toString());
        } catch (e) {
            throw new MalformedJSONError();
        }

        schemaUtils.validateSchema(message, schemas.relayerApiOrdersChannelSubscribeSchema);
        const { requestId, payload, type } = message;
        switch (type) {
            case MessageTypes.Subscribe:
                ws.requestIds.add(requestId);
                const subscriptionOpts =
                    payload === undefined || _.isEmpty(payload) ? 'ALL_SUBSCRIPTION_OPTS' : payload;
                this._requestIdToSubscriptionOpts.set(requestId, subscriptionOpts);
                this._requestIdToSocket.set(requestId, ws);
                break;
            default:
                throw new NotImplementedError(message.type);
        }
    }
    private _cleanupConnections(): void {
        // Ping every connection and if it is unresponsive
        // terminate it during the next check
        for (const ws of this._server.clients) {
            if (!(ws as WrappedWebSocket).isAlive) {
                ws.terminate();
            } else {
                (ws as WrappedWebSocket).isAlive = false;
                ws.ping();
            }
        }
    }
    private _messageHandler(ws: WrappedWebSocket): (data: WebSocket.Data) => void {
        return (data: WebSocket.Data) => {
            try {
                this._processMessage(ws, data);
            } catch (err) {
                this._processError(ws, err);
            }
        };
    }
    // tslint:disable-next-line:prefer-function-over-method
    private _processError(ws: WrappedWebSocket, err: Error): void {
        const { errorBody } = generateError(err);
        ws.send(JSON.stringify(errorBody));
        ws.terminate();
    }
    // tslint:disable-next-line:prefer-function-over-method
    private _pongHandler(ws: WrappedWebSocket): () => void {
        return () => {
            ws.isAlive = true;
        };
    }
    private _closeHandler(ws: WrappedWebSocket): () => void {
        return () => {
            for (const requestId of ws.requestIds) {
                this._requestIdToSocket.delete(requestId);
                this._requestIdToSubscriptionOpts.delete(requestId);
            }
        };
    }
}
