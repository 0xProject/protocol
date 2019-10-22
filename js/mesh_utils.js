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
var mesh_rpc_client_1 = require('@0x/mesh-rpc-client');
var _ = require('lodash');
var constants_1 = require('./constants');
var errors_1 = require('./errors');
// tslint:disable-next-line:no-var-requires
var d = require('debug')('MESH');
// tslint:disable-next-line:no-unnecessary-class
var MeshUtils = /** @class */ (function() {
    function MeshUtils() {}
    MeshUtils.addOrdersToMeshAsync = function(meshClient, orders, batchSize) {
        if (batchSize === void 0) {
            batchSize = 100;
        }
        return __awaiter(this, void 0, void 0, function() {
            var e_1, _a, validationResults, chunks, chunks_1, chunks_1_1, chunk, results, e_1_1;
            return __generator(this, function(_b) {
                switch (_b.label) {
                    case 0:
                        validationResults = { accepted: [], rejected: [] };
                        chunks = _.chunk(orders, batchSize);
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 6, 7, 8]);
                        (chunks_1 = __values(chunks)), (chunks_1_1 = chunks_1.next());
                        _b.label = 2;
                    case 2:
                        if (!!chunks_1_1.done) return [3 /*break*/, 5];
                        chunk = chunks_1_1.value;
                        return [4 /*yield*/, meshClient.addOrdersAsync(chunk)];
                    case 3:
                        results = _b.sent();
                        validationResults.accepted = __spread(validationResults.accepted, results.accepted);
                        validationResults.rejected = __spread(validationResults.rejected, results.rejected);
                        _b.label = 4;
                    case 4:
                        chunks_1_1 = chunks_1.next();
                        return [3 /*break*/, 2];
                    case 5:
                        return [3 /*break*/, 8];
                    case 6:
                        e_1_1 = _b.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 8];
                    case 7:
                        try {
                            if (chunks_1_1 && !chunks_1_1.done && (_a = chunks_1.return)) _a.call(chunks_1);
                        } finally {
                            if (e_1) throw e_1.error;
                        }
                        return [7 /*endfinally*/];
                    case 8:
                        return [2 /*return*/, validationResults];
                }
            });
        });
    };
    MeshUtils.orderInfosToApiOrders = function(orderEvent) {
        return orderEvent.map(function(e) {
            return MeshUtils.orderInfoToAPIOrder(e);
        });
    };
    MeshUtils.orderInfoToAPIOrder = function(orderEvent) {
        var remainingFillableTakerAssetAmount = orderEvent.fillableTakerAssetAmount
            ? orderEvent.fillableTakerAssetAmount
            : constants_1.ZERO;
        return {
            order: orderEvent.signedOrder,
            metaData: {
                orderHash: orderEvent.orderHash,
                remainingFillableTakerAssetAmount: remainingFillableTakerAssetAmount,
            },
        };
    };
    MeshUtils.rejectedCodeToSRACode = function(code) {
        switch (code) {
            case mesh_rpc_client_1.RejectedCode.OrderCancelled:
            case mesh_rpc_client_1.RejectedCode.OrderExpired:
            case mesh_rpc_client_1.RejectedCode.OrderUnfunded:
            case mesh_rpc_client_1.RejectedCode.OrderHasInvalidMakerAssetAmount:
            case mesh_rpc_client_1.RejectedCode.OrderHasInvalidMakerAssetData:
            case mesh_rpc_client_1.RejectedCode.OrderHasInvalidTakerAssetAmount:
            case mesh_rpc_client_1.RejectedCode.OrderHasInvalidTakerAssetData:
            case mesh_rpc_client_1.RejectedCode.OrderFullyFilled: {
                return errors_1.ValidationErrorCodes.InvalidOrder;
            }
            case mesh_rpc_client_1.RejectedCode.OrderHasInvalidSignature: {
                return errors_1.ValidationErrorCodes.InvalidSignatureOrHash;
            }
            case mesh_rpc_client_1.RejectedCode.OrderForIncorrectNetwork: {
                return errors_1.ValidationErrorCodes.InvalidAddress;
            }
            default:
                return errors_1.ValidationErrorCodes.InternalError;
        }
    };
    MeshUtils.calculateAddedRemovedUpdated = function(orderEvents) {
        var e_2, _a;
        var added = [];
        var removed = [];
        var updated = [];
        try {
            for (
                var orderEvents_1 = __values(orderEvents), orderEvents_1_1 = orderEvents_1.next();
                !orderEvents_1_1.done;
                orderEvents_1_1 = orderEvents_1.next()
            ) {
                var event_1 = orderEvents_1_1.value;
                var apiOrder = MeshUtils.orderInfoToAPIOrder(event_1);
                switch (event_1.endState) {
                    case mesh_rpc_client_1.OrderEventEndState.Added: {
                        added.push(apiOrder);
                        break;
                    }
                    case mesh_rpc_client_1.OrderEventEndState.Cancelled:
                    case mesh_rpc_client_1.OrderEventEndState.Expired:
                    case mesh_rpc_client_1.OrderEventEndState.FullyFilled:
                    case mesh_rpc_client_1.OrderEventEndState.Unfunded: {
                        removed.push(apiOrder);
                        break;
                    }
                    case mesh_rpc_client_1.OrderEventEndState.FillabilityIncreased:
                    case mesh_rpc_client_1.OrderEventEndState.Filled: {
                        updated.push(apiOrder);
                        break;
                    }
                    default:
                        d('Unknown Event', event_1.endState, event_1);
                        break;
                }
            }
        } catch (e_2_1) {
            e_2 = { error: e_2_1 };
        } finally {
            try {
                if (orderEvents_1_1 && !orderEvents_1_1.done && (_a = orderEvents_1.return)) _a.call(orderEvents_1);
            } finally {
                if (e_2) throw e_2.error;
            }
        }
        return { added: added, removed: removed, updated: updated };
    };
    return MeshUtils;
})();
exports.MeshUtils = MeshUtils;
