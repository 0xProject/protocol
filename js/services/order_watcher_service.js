'use strict';
var __awaiter =
    (this && this.__awaiter) ||
    function(thisArg, _arguments, P, generator) {
        return new (P || (P = Promise))(function(resolve, reject) {
            function fulfilled(value) {
                try {
                    step(generator.next(value));
                } catch (e) {
                    reject(e);
                }
            }
            function rejected(value) {
                try {
                    step(generator['throw'](value));
                } catch (e) {
                    reject(e);
                }
            }
            function step(result) {
                result.done
                    ? resolve(result.value)
                    : new P(function(resolve) {
                          resolve(result.value);
                      }).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
var __generator =
    (this && this.__generator) ||
    function(thisArg, body) {
        var _ = {
                label: 0,
                sent: function() {
                    if (t[0] & 1) throw t[1];
                    return t[1];
                },
                trys: [],
                ops: [],
            },
            f,
            y,
            t,
            g;
        return (
            (g = { next: verb(0), throw: verb(1), return: verb(2) }),
            typeof Symbol === 'function' &&
                (g[Symbol.iterator] = function() {
                    return this;
                }),
            g
        );
        function verb(n) {
            return function(v) {
                return step([n, v]);
            };
        }
        function step(op) {
            if (f) throw new TypeError('Generator is already executing.');
            while (_)
                try {
                    if (
                        ((f = 1),
                        y &&
                            (t =
                                op[0] & 2
                                    ? y['return']
                                    : op[0]
                                    ? y['throw'] || ((t = y['return']) && t.call(y), 0)
                                    : y.next) &&
                            !(t = t.call(y, op[1])).done)
                    )
                        return t;
                    if (((y = 0), t)) op = [op[0] & 2, t.value];
                    switch (op[0]) {
                        case 0:
                        case 1:
                            t = op;
                            break;
                        case 4:
                            _.label++;
                            return { value: op[1], done: false };
                        case 5:
                            _.label++;
                            y = op[1];
                            op = [0];
                            continue;
                        case 7:
                            op = _.ops.pop();
                            _.trys.pop();
                            continue;
                        default:
                            if (
                                !((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
                                (op[0] === 6 || op[0] === 2)
                            ) {
                                _ = 0;
                                continue;
                            }
                            if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                                _.label = op[1];
                                break;
                            }
                            if (op[0] === 6 && _.label < t[1]) {
                                _.label = t[1];
                                t = op;
                                break;
                            }
                            if (t && _.label < t[2]) {
                                _.label = t[2];
                                _.ops.push(op);
                                break;
                            }
                            if (t[2]) _.ops.pop();
                            _.trys.pop();
                            continue;
                    }
                    op = body.call(thisArg, _);
                } catch (e) {
                    op = [6, e];
                    y = 0;
                } finally {
                    f = t = 0;
                }
            if (op[0] & 5) throw op[1];
            return { value: op[0] ? op[1] : void 0, done: true };
        }
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
Object.defineProperty(exports, '__esModule', { value: true });
var _ = require('lodash');
var db_connection_1 = require('../db_connection');
var mesh_utils_1 = require('../mesh_utils');
var SignedOrderModel_1 = require('../models/SignedOrderModel');
var types_1 = require('../types');
var orderbook_utils_1 = require('./orderbook_utils');
// tslint:disable-next-line:no-var-requires
var d = require('debug')('orderbook');
var OrderWatcherService = /** @class */ (function() {
    function OrderWatcherService(meshClient) {
        var _this = this;
        this._meshClient = meshClient;
        void this._meshClient.subscribeToOrdersAsync(function(orders) {
            return __awaiter(_this, void 0, void 0, function() {
                var _a, added, removed, updated;
                return __generator(this, function(_b) {
                    switch (_b.label) {
                        case 0:
                            (_a = mesh_utils_1.MeshUtils.calculateAddedRemovedUpdated(orders)),
                                (added = _a.added),
                                (removed = _a.removed),
                                (updated = _a.updated);
                            return [
                                4 /*yield*/,
                                OrderWatcherService._onOrderLifeCycleEventAsync(
                                    types_1.OrderWatcherLifeCycleEvents.Removed,
                                    removed,
                                ),
                            ];
                        case 1:
                            _b.sent();
                            return [
                                4 /*yield*/,
                                OrderWatcherService._onOrderLifeCycleEventAsync(
                                    types_1.OrderWatcherLifeCycleEvents.Updated,
                                    updated,
                                ),
                            ];
                        case 2:
                            _b.sent();
                            return [
                                4 /*yield*/,
                                OrderWatcherService._onOrderLifeCycleEventAsync(
                                    types_1.OrderWatcherLifeCycleEvents.Added,
                                    added,
                                ),
                            ];
                        case 3:
                            _b.sent();
                            return [2 /*return*/];
                    }
                });
            });
        });
        this._meshClient.onReconnected(function() {
            return __awaiter(_this, void 0, void 0, function() {
                return __generator(this, function(_a) {
                    switch (_a.label) {
                        case 0:
                            d('Reconnecting to Mesh');
                            return [4 /*yield*/, this.syncOrderbookAsync()];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        });
    }
    OrderWatcherService._onOrderLifeCycleEventAsync = function(lifecycleEvent, orders) {
        return __awaiter(this, void 0, void 0, function() {
            var e_1, _a, connection, _b, signedOrdersModel, orderHashes, chunks, chunks_1, chunks_1_1, chunk, e_1_1;
            return __generator(this, function(_c) {
                switch (_c.label) {
                    case 0:
                        if (orders.length <= 0) {
                            return [2 /*return*/];
                        }
                        connection = db_connection_1.getDBConnection();
                        _b = lifecycleEvent;
                        switch (_b) {
                            case types_1.OrderWatcherLifeCycleEvents.Updated:
                                return [3 /*break*/, 1];
                            case types_1.OrderWatcherLifeCycleEvents.Added:
                                return [3 /*break*/, 1];
                            case types_1.OrderWatcherLifeCycleEvents.Removed:
                                return [3 /*break*/, 3];
                        }
                        return [3 /*break*/, 12];
                    case 1:
                        signedOrdersModel = orders.map(function(o) {
                            return orderbook_utils_1.serializeOrder(o);
                        });
                        // MAX SQL variable size is 999. This limit is imposed via Sqlite.
                        // The SELECT query is not entirely effecient and pulls in all attributes
                        // so we need to leave space for the attributes on the model represented
                        // as SQL variables in the "AS" syntax. We leave 99 free for the
                        // signedOrders model
                        return [4 /*yield*/, connection.manager.save(signedOrdersModel, { chunk: 900 })];
                    case 2:
                        // MAX SQL variable size is 999. This limit is imposed via Sqlite.
                        // The SELECT query is not entirely effecient and pulls in all attributes
                        // so we need to leave space for the attributes on the model represented
                        // as SQL variables in the "AS" syntax. We leave 99 free for the
                        // signedOrders model
                        _c.sent();
                        return [3 /*break*/, 12];
                    case 3:
                        orderHashes = orders.map(function(o) {
                            return o.metaData.orderHash;
                        });
                        chunks = _.chunk(orderHashes, 999);
                        _c.label = 4;
                    case 4:
                        _c.trys.push([4, 9, 10, 11]);
                        (chunks_1 = __values(chunks)), (chunks_1_1 = chunks_1.next());
                        _c.label = 5;
                    case 5:
                        if (!!chunks_1_1.done) return [3 /*break*/, 8];
                        chunk = chunks_1_1.value;
                        return [4 /*yield*/, connection.manager.delete(SignedOrderModel_1.SignedOrderModel, chunk)];
                    case 6:
                        _c.sent();
                        _c.label = 7;
                    case 7:
                        chunks_1_1 = chunks_1.next();
                        return [3 /*break*/, 5];
                    case 8:
                        return [3 /*break*/, 11];
                    case 9:
                        e_1_1 = _c.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 11];
                    case 10:
                        try {
                            if (chunks_1_1 && !chunks_1_1.done && (_a = chunks_1.return)) _a.call(chunks_1);
                        } finally {
                            if (e_1) throw e_1.error;
                        }
                        return [7 /*endfinally*/];
                    case 11:
                        return [3 /*break*/, 12];
                    case 12:
                        return [2 /*return*/];
                }
            });
        });
    };
    OrderWatcherService.prototype.syncOrderbookAsync = function() {
        return __awaiter(this, void 0, void 0, function() {
            var connection, signedOrderModels, signedOrders, orders, _a, accepted, rejected;
            return __generator(this, function(_b) {
                switch (_b.label) {
                    case 0:
                        d('SYNC orderbook with Mesh');
                        connection = db_connection_1.getDBConnection();
                        return [4 /*yield*/, connection.manager.find(SignedOrderModel_1.SignedOrderModel)];
                    case 1:
                        signedOrderModels = _b.sent();
                        signedOrders = signedOrderModels.map(orderbook_utils_1.deserializeOrder);
                        return [4 /*yield*/, this._meshClient.getOrdersAsync()];
                    case 2:
                        orders = _b.sent();
                        return [
                            4 /*yield*/,
                            mesh_utils_1.MeshUtils.addOrdersToMeshAsync(this._meshClient, signedOrders),
                        ];
                    case 3:
                        (_a = _b.sent()), (accepted = _a.accepted), (rejected = _a.rejected);
                        d(
                            'SYNC ' +
                                rejected.length +
                                ' rejected ' +
                                accepted.length +
                                ' accepted ' +
                                signedOrders.length +
                                ' sent',
                        );
                        if (!(rejected.length > 0)) return [3 /*break*/, 5];
                        return [
                            4 /*yield*/,
                            OrderWatcherService._onOrderLifeCycleEventAsync(
                                types_1.OrderWatcherLifeCycleEvents.Removed,
                                mesh_utils_1.MeshUtils.orderInfosToApiOrders(rejected),
                            ),
                        ];
                    case 4:
                        _b.sent();
                        _b.label = 5;
                    case 5:
                        if (!(orders.length > 0)) return [3 /*break*/, 7];
                        return [
                            4 /*yield*/,
                            OrderWatcherService._onOrderLifeCycleEventAsync(
                                types_1.OrderWatcherLifeCycleEvents.Added,
                                mesh_utils_1.MeshUtils.orderInfosToApiOrders(orders),
                            ),
                        ];
                    case 6:
                        _b.sent();
                        _b.label = 7;
                    case 7:
                        d('SYNC complete');
                        return [2 /*return*/];
                }
            });
        });
    };
    return OrderWatcherService;
})();
exports.OrderWatcherService = OrderWatcherService;
