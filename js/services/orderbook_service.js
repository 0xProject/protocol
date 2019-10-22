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
Object.defineProperty(exports, '__esModule', { value: true });
var _0x_js_1 = require('0x.js');
var _ = require('lodash');
var db_connection_1 = require('../db_connection');
var errors_1 = require('../errors');
var mesh_utils_1 = require('../mesh_utils');
var SignedOrderModel_1 = require('../models/SignedOrderModel');
var paginator_1 = require('../paginator');
var orderbook_utils_1 = require('./orderbook_utils');
var OrderBookService = /** @class */ (function() {
    function OrderBookService(meshClient) {
        this._meshClient = meshClient;
    }
    OrderBookService.getOrderByHashIfExistsAsync = function(orderHash) {
        return __awaiter(this, void 0, void 0, function() {
            var connection, signedOrderModelIfExists, deserializedOrder;
            return __generator(this, function(_a) {
                switch (_a.label) {
                    case 0:
                        connection = db_connection_1.getDBConnection();
                        return [
                            4 /*yield*/,
                            connection.manager.findOne(SignedOrderModel_1.SignedOrderModel, orderHash),
                        ];
                    case 1:
                        signedOrderModelIfExists = _a.sent();
                        if (signedOrderModelIfExists === undefined) {
                            return [2 /*return*/, undefined];
                        } else {
                            deserializedOrder = orderbook_utils_1.deserializeOrderToAPIOrder(signedOrderModelIfExists);
                            return [2 /*return*/, deserializedOrder];
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    OrderBookService.getAssetPairsAsync = function(page, perPage, assetDataA, assetDataB) {
        return __awaiter(this, void 0, void 0, function() {
            var connection,
                signedOrderModels,
                assetPairsItems,
                nonPaginatedFilteredAssetPairs,
                containsAssetDataAAndAssetDataB,
                assetData_1,
                containsAssetData,
                uniqueNonPaginatedFilteredAssetPairs,
                paginatedFilteredAssetPairs;
            return __generator(this, function(_a) {
                switch (_a.label) {
                    case 0:
                        connection = db_connection_1.getDBConnection();
                        return [4 /*yield*/, connection.manager.find(SignedOrderModel_1.SignedOrderModel)];
                    case 1:
                        signedOrderModels = _a.sent();
                        assetPairsItems = signedOrderModels
                            .map(orderbook_utils_1.deserializeOrder)
                            .map(orderbook_utils_1.signedOrderToAssetPair);
                        if (assetDataA === undefined && assetDataB === undefined) {
                            nonPaginatedFilteredAssetPairs = assetPairsItems;
                        } else if (assetDataA !== undefined && assetDataB !== undefined) {
                            containsAssetDataAAndAssetDataB = function(assetPair) {
                                return (
                                    (assetPair.assetDataA.assetData === assetDataA &&
                                        assetPair.assetDataB.assetData === assetDataB) ||
                                    (assetPair.assetDataA.assetData === assetDataB &&
                                        assetPair.assetDataB.assetData === assetDataA)
                                );
                            };
                            nonPaginatedFilteredAssetPairs = assetPairsItems.filter(containsAssetDataAAndAssetDataB);
                        } else {
                            assetData_1 = assetDataA || assetDataB;
                            containsAssetData = function(assetPair) {
                                return (
                                    assetPair.assetDataA.assetData === assetData_1 ||
                                    assetPair.assetDataB.assetData === assetData_1
                                );
                            };
                            nonPaginatedFilteredAssetPairs = assetPairsItems.filter(containsAssetData);
                        }
                        uniqueNonPaginatedFilteredAssetPairs = _.uniqWith(
                            nonPaginatedFilteredAssetPairs,
                            _.isEqual.bind(_),
                        );
                        paginatedFilteredAssetPairs = paginator_1.paginate(
                            uniqueNonPaginatedFilteredAssetPairs,
                            page,
                            perPage,
                        );
                        return [2 /*return*/, paginatedFilteredAssetPairs];
                }
            });
        });
    };
    // tslint:disable-next-line:prefer-function-over-method
    OrderBookService.prototype.getOrderBookAsync = function(page, perPage, baseAssetData, quoteAssetData) {
        return __awaiter(this, void 0, void 0, function() {
            var connection,
                bidSignedOrderModels,
                askSignedOrderModels,
                bidApiOrders,
                askApiOrders,
                paginatedBidApiOrders,
                paginatedAskApiOrders;
            return __generator(this, function(_a) {
                switch (_a.label) {
                    case 0:
                        connection = db_connection_1.getDBConnection();
                        return [
                            4 /*yield*/,
                            connection.manager.find(SignedOrderModel_1.SignedOrderModel, {
                                where: { takerAssetData: baseAssetData, makerAssetData: quoteAssetData },
                            }),
                        ];
                    case 1:
                        bidSignedOrderModels = _a.sent();
                        return [
                            4 /*yield*/,
                            connection.manager.find(SignedOrderModel_1.SignedOrderModel, {
                                where: { takerAssetData: quoteAssetData, makerAssetData: baseAssetData },
                            }),
                        ];
                    case 2:
                        askSignedOrderModels = _a.sent();
                        bidApiOrders = bidSignedOrderModels
                            .map(orderbook_utils_1.deserializeOrderToAPIOrder)
                            .sort(function(orderA, orderB) {
                                return orderbook_utils_1.compareBidOrder(orderA.order, orderB.order);
                            });
                        askApiOrders = askSignedOrderModels
                            .map(orderbook_utils_1.deserializeOrderToAPIOrder)
                            .sort(function(orderA, orderB) {
                                return orderbook_utils_1.compareAskOrder(orderA.order, orderB.order);
                            });
                        paginatedBidApiOrders = paginator_1.paginate(bidApiOrders, page, perPage);
                        paginatedAskApiOrders = paginator_1.paginate(askApiOrders, page, perPage);
                        return [
                            2 /*return*/,
                            {
                                bids: paginatedBidApiOrders,
                                asks: paginatedAskApiOrders,
                            },
                        ];
                }
            });
        });
    };
    // TODO:(leo) Do all filtering and pagination in a DB (requires stored procedures or redundant fields)
    // tslint:disable-next-line:prefer-function-over-method
    OrderBookService.prototype.getOrdersAsync = function(page, perPage, ordersFilterParams) {
        return __awaiter(this, void 0, void 0, function() {
            var connection,
                filterObjectWithValuesIfExist,
                filterObject,
                signedOrderModels,
                apiOrders,
                paginatedApiOrders;
            return __generator(this, function(_a) {
                switch (_a.label) {
                    case 0:
                        connection = db_connection_1.getDBConnection();
                        filterObjectWithValuesIfExist = {
                            exchangeAddress: ordersFilterParams.exchangeAddress,
                            senderAddress: ordersFilterParams.senderAddress,
                            makerAssetData: ordersFilterParams.makerAssetData,
                            takerAssetData: ordersFilterParams.takerAssetData,
                            makerAddress: ordersFilterParams.makerAddress,
                            takerAddress: ordersFilterParams.takerAddress,
                            feeRecipientAddress: ordersFilterParams.feeRecipientAddress,
                            makerFeeAssetData: ordersFilterParams.makerFeeAssetData,
                            takerFeeAssetData: ordersFilterParams.takerFeeAssetData,
                        };
                        filterObject = _.pickBy(filterObjectWithValuesIfExist, _.identity.bind(_));
                        return [
                            4 /*yield*/,
                            connection.manager.find(SignedOrderModel_1.SignedOrderModel, { where: filterObject }),
                        ];
                    case 1:
                        signedOrderModels = _a.sent();
                        apiOrders = _.map(signedOrderModels, orderbook_utils_1.deserializeOrderToAPIOrder);
                        // Post-filters
                        apiOrders = apiOrders
                            .filter(
                                // traderAddress
                                function(apiOrder) {
                                    return (
                                        ordersFilterParams.traderAddress === undefined ||
                                        apiOrder.order.makerAddress === ordersFilterParams.traderAddress ||
                                        apiOrder.order.takerAddress === ordersFilterParams.traderAddress
                                    );
                                },
                            )
                            .filter(
                                // makerAssetAddress
                                function(apiOrder) {
                                    return (
                                        ordersFilterParams.makerAssetAddress === undefined ||
                                        orderbook_utils_1.includesTokenAddress(
                                            apiOrder.order.makerAssetData,
                                            ordersFilterParams.makerAssetAddress,
                                        )
                                    );
                                },
                            )
                            .filter(
                                // takerAssetAddress
                                function(apiOrder) {
                                    return (
                                        ordersFilterParams.takerAssetAddress === undefined ||
                                        orderbook_utils_1.includesTokenAddress(
                                            apiOrder.order.takerAssetData,
                                            ordersFilterParams.takerAssetAddress,
                                        )
                                    );
                                },
                            )
                            .filter(
                                // makerAssetProxyId
                                function(apiOrder) {
                                    return (
                                        ordersFilterParams.makerAssetProxyId === undefined ||
                                        _0x_js_1.assetDataUtils.decodeAssetDataOrThrow(apiOrder.order.makerAssetData)
                                            .assetProxyId === ordersFilterParams.makerAssetProxyId
                                    );
                                },
                            )
                            .filter(
                                // takerAssetProxyId
                                function(apiOrder) {
                                    return (
                                        ordersFilterParams.takerAssetProxyId === undefined ||
                                        _0x_js_1.assetDataUtils.decodeAssetDataOrThrow(apiOrder.order.takerAssetData)
                                            .assetProxyId === ordersFilterParams.takerAssetProxyId
                                    );
                                },
                            );
                        paginatedApiOrders = paginator_1.paginate(apiOrders, page, perPage);
                        return [2 /*return*/, paginatedApiOrders];
                }
            });
        });
    };
    OrderBookService.prototype.addOrderAsync = function(signedOrder) {
        return __awaiter(this, void 0, void 0, function() {
            var rejected;
            return __generator(this, function(_a) {
                switch (_a.label) {
                    case 0:
                        return [4 /*yield*/, this._meshClient.addOrdersAsync([signedOrder])];
                    case 1:
                        rejected = _a.sent().rejected;
                        if (rejected.length !== 0) {
                            throw new errors_1.ValidationError([
                                {
                                    field: 'signedOrder',
                                    code: mesh_utils_1.MeshUtils.rejectedCodeToSRACode(rejected[0].status.code),
                                    reason: rejected[0].status.code + ': ' + rejected[0].status.message,
                                },
                            ]);
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    return OrderBookService;
})();
exports.OrderBookService = OrderBookService;
