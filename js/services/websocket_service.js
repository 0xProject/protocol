'use strict';
var __assign =
    (this && this.__assign) ||
    function() {
        __assign =
            Object.assign ||
            function(t) {
                for (var s, i = 1, n = arguments.length; i < n; i++) {
                    s = arguments[i];
                    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
                }
                return t;
            };
        return __assign.apply(this, arguments);
    };
var __values =
    (this && this.__values) ||
    function(o) {
        var m = typeof Symbol === 'function' && o[Symbol.iterator],
            i = 0;
        if (m) return m.call(o);
        return {
            next: function() {
                if (o && i >= o.length) o = void 0;
                return { value: o && o[i++], done: !o };
            },
        };
    };
var __read =
    (this && this.__read) ||
    function(o, n) {
        var m = typeof Symbol === 'function' && o[Symbol.iterator];
        if (!m) return o;
        var i = m.call(o),
            r,
            ar = [],
            e;
        try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
        } catch (error) {
            e = { error: error };
        } finally {
            try {
                if (r && !r.done && (m = i['return'])) m.call(i);
            } finally {
                if (e) throw e.error;
            }
        }
        return ar;
    };
var __spread =
    (this && this.__spread) ||
    function() {
        for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
        return ar;
    };
Object.defineProperty(exports, '__esModule', { value: true });
var json_schemas_1 = require('@0x/json-schemas');
var order_utils_1 = require('@0x/order-utils');
var types_1 = require('@0x/types');
var WebSocket = require('ws');
var errors_1 = require('../errors');
var mesh_utils_1 = require('../mesh_utils');
var error_handling_1 = require('../middleware/error_handling');
var types_2 = require('../types');
var utils_1 = require('../utils');
var DEFAULT_OPTS = {
    pongInterval: 5000,
};
var WebsocketService = /** @class */ (function() {
    function WebsocketService(server, meshClient, opts) {
        var _this = this;
        this._requestIdToSocket = new Map(); // requestId to WebSocket mapping
        this._requestIdToSubscriptionOpts = new Map(); // requestId -> { base, quote }
        var wsOpts = __assign({}, DEFAULT_OPTS, opts);
        this._server = new WebSocket.Server({ server: server });
        this._server.on('connection', this._processConnection.bind(this));
        this._pongIntervalId = setInterval(this._cleanupConnections.bind(this), wsOpts.pongInterval);
        this._meshClient = meshClient;
        this._meshClient
            .subscribeToOrdersAsync(function(e) {
                return _this.orderUpdate(mesh_utils_1.MeshUtils.orderInfosToApiOrders(e));
            })
            .then(function(subscriptionId) {
                return (_this._meshSubscriptionId = subscriptionId);
            });
    }
    WebsocketService._decodedContractAndAssetData = function(assetData) {
        var e_1, _a;
        var data = [assetData];
        var decodedAssetData = order_utils_1.assetDataUtils.decodeAssetDataOrThrow(assetData);
        if (order_utils_1.assetDataUtils.isMultiAssetData(decodedAssetData)) {
            try {
                for (var _b = __values(decodedAssetData.nestedAssetData), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var nested = _c.value;
                    data = __spread(data, WebsocketService._decodedContractAndAssetData(nested).data);
                }
            } catch (e_1_1) {
                e_1 = { error: e_1_1 };
            } finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                } finally {
                    if (e_1) throw e_1.error;
                }
            }
        } else if (order_utils_1.assetDataUtils.isStaticCallAssetData(decodedAssetData)) {
            // do nothing
        } else {
            data = __spread(data, [decodedAssetData.tokenAddress]);
        }
        return { data: data, assetProxyId: decodedAssetData.assetProxyId };
    };
    WebsocketService._matchesOrdersChannelSubscription = function(order, opts) {
        if (opts === 'ALL_SUBSCRIPTION_OPTS') {
            return true;
        }
        var makerAssetData = order.makerAssetData,
            takerAssetData = order.takerAssetData;
        var makerAssetDataTakerAssetData = [makerAssetData, takerAssetData];
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
        var makerContractAndAssetData = WebsocketService._decodedContractAndAssetData(makerAssetData);
        var takerContractAndAssetData = WebsocketService._decodedContractAndAssetData(takerAssetData);
        if (
            opts.makerAssetAddress &&
            opts.takerAssetAddress &&
            makerContractAndAssetData.assetProxyId !== types_1.AssetProxyId.MultiAsset &&
            makerContractAndAssetData.assetProxyId !== types_1.AssetProxyId.StaticCall &&
            takerContractAndAssetData.assetProxyId !== types_1.AssetProxyId.MultiAsset &&
            takerContractAndAssetData.assetProxyId !== types_1.AssetProxyId.StaticCall &&
            makerContractAndAssetData.data.includes(opts.makerAssetAddress) &&
            takerContractAndAssetData.data.includes(opts.takerAssetAddress)
        ) {
            return true;
        }
        // TODO (dekz)handle MAP
        // makerAssetProxyId?: string;
        // takerAssetProxyId?: string;
        return false;
    };
    WebsocketService.prototype.destroy = function() {
        var e_2, _a;
        clearInterval(this._pongIntervalId);
        try {
            for (var _b = __values(this._server.clients), _c = _b.next(); !_c.done; _c = _b.next()) {
                var ws = _c.value;
                ws.terminate();
            }
        } catch (e_2_1) {
            e_2 = { error: e_2_1 };
        } finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            } finally {
                if (e_2) throw e_2.error;
            }
        }
        this._requestIdToSocket.clear();
        this._requestIdToSubscriptionOpts.clear();
        this._server.close();
        if (this._meshSubscriptionId) {
            void this._meshClient.unsubscribeAsync(this._meshSubscriptionId);
        }
    };
    WebsocketService.prototype.orderUpdate = function(apiOrders) {
        var e_3, _a, e_4, _b, e_5, _c;
        if (this._server.clients.size === 0) {
            return;
        }
        var response = {
            type: types_1.OrdersChannelMessageTypes.Update,
            channel: types_2.MessageChannels.Orders,
            payload: apiOrders,
        };
        try {
            for (
                var apiOrders_1 = __values(apiOrders), apiOrders_1_1 = apiOrders_1.next();
                !apiOrders_1_1.done;
                apiOrders_1_1 = apiOrders_1.next()
            ) {
                var order = apiOrders_1_1.value;
                // Future optimisation is to invert this structure so the order isn't duplicated over many request ids
                // order->requestIds it is less likely to get multiple order updates and more likely
                // to have many subscribers and a single order
                var requestIdToOrders = {};
                try {
                    for (
                        var _d = __values(this._requestIdToSubscriptionOpts), _e = _d.next();
                        !_e.done;
                        _e = _d.next()
                    ) {
                        var _f = __read(_e.value, 2),
                            requestId = _f[0],
                            subscriptionOpts = _f[1];
                        if (WebsocketService._matchesOrdersChannelSubscription(order.order, subscriptionOpts)) {
                            if (requestIdToOrders[requestId]) {
                                var orderSet = requestIdToOrders[requestId];
                                orderSet.add(order);
                            } else {
                                var orderSet = new Set();
                                orderSet.add(order);
                                requestIdToOrders[requestId] = orderSet;
                            }
                        }
                    }
                } catch (e_4_1) {
                    e_4 = { error: e_4_1 };
                } finally {
                    try {
                        if (_e && !_e.done && (_b = _d.return)) _b.call(_d);
                    } finally {
                        if (e_4) throw e_4.error;
                    }
                }
                try {
                    for (
                        var _g = __values(Object.entries(requestIdToOrders)), _h = _g.next();
                        !_h.done;
                        _h = _g.next()
                    ) {
                        var _j = __read(_h.value, 2),
                            requestId = _j[0],
                            orders = _j[1];
                        var ws = this._requestIdToSocket.get(requestId);
                        if (ws) {
                            ws.send(
                                JSON.stringify(
                                    __assign({}, response, { payload: Array.from(orders), requestId: requestId }),
                                ),
                            );
                        }
                    }
                } catch (e_5_1) {
                    e_5 = { error: e_5_1 };
                } finally {
                    try {
                        if (_h && !_h.done && (_c = _g.return)) _c.call(_g);
                    } finally {
                        if (e_5) throw e_5.error;
                    }
                }
            }
        } catch (e_3_1) {
            e_3 = { error: e_3_1 };
        } finally {
            try {
                if (apiOrders_1_1 && !apiOrders_1_1.done && (_a = apiOrders_1.return)) _a.call(apiOrders_1);
            } finally {
                if (e_3) throw e_3.error;
            }
        }
    };
    WebsocketService.prototype._processConnection = function(ws, _req) {
        ws.on('pong', this._pongHandler(ws).bind(this));
        ws.on(types_1.WebsocketConnectionEventType.Message, this._messageHandler(ws).bind(this));
        ws.on(types_1.WebsocketConnectionEventType.Close, this._closeHandler(ws).bind(this));
        ws.isAlive = true;
        ws.requestIds = new Set();
    };
    WebsocketService.prototype._processMessage = function(ws, data) {
        var message;
        try {
            message = JSON.parse(data.toString());
        } catch (e) {
            throw new errors_1.MalformedJSONError();
        }
        utils_1.utils.validateSchema(message, json_schemas_1.schemas.relayerApiOrdersChannelSubscribeSchema);
        var requestId = message.requestId,
            payload = message.payload,
            type = message.type;
        switch (type) {
            case types_2.MessageTypes.Subscribe:
                ws.requestIds.add(requestId);
                var subscriptionOpts = payload || 'ALL_SUBSCRIPTION_OPTS';
                this._requestIdToSubscriptionOpts.set(requestId, subscriptionOpts);
                this._requestIdToSocket.set(requestId, ws);
                break;
            default:
                throw new errors_1.NotImplementedError(message.type);
        }
    };
    WebsocketService.prototype._cleanupConnections = function() {
        var e_6, _a;
        try {
            // Ping every connection and if it is unresponsive
            // terminate it during the next check
            for (var _b = __values(this._server.clients), _c = _b.next(); !_c.done; _c = _b.next()) {
                var ws = _c.value;
                if (!ws.isAlive) {
                    ws.terminate();
                } else {
                    ws.isAlive = false;
                    ws.ping();
                }
            }
        } catch (e_6_1) {
            e_6 = { error: e_6_1 };
        } finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            } finally {
                if (e_6) throw e_6.error;
            }
        }
    };
    WebsocketService.prototype._messageHandler = function(ws) {
        var _this = this;
        return function(data) {
            try {
                _this._processMessage(ws, data);
            } catch (err) {
                _this._processError(ws, err);
            }
        };
    };
    // tslint:disable-next-line:prefer-function-over-method
    WebsocketService.prototype._processError = function(ws, err) {
        var errorBody = error_handling_1.generateError(err).errorBody;
        ws.send(JSON.stringify(errorBody));
        ws.terminate();
    };
    // tslint:disable-next-line:prefer-function-over-method
    WebsocketService.prototype._pongHandler = function(ws) {
        return function() {
            ws.isAlive = true;
        };
    };
    WebsocketService.prototype._closeHandler = function(ws) {
        var _this = this;
        return function() {
            var e_7, _a;
            try {
                for (var _b = __values(ws.requestIds), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var requestId = _c.value;
                    _this._requestIdToSocket.delete(requestId);
                    _this._requestIdToSubscriptionOpts.delete(requestId);
                }
            } catch (e_7_1) {
                e_7 = { error: e_7_1 };
            } finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                } finally {
                    if (e_7) throw e_7.error;
                }
            }
        };
    };
    return WebsocketService;
})();
exports.WebsocketService = WebsocketService;
