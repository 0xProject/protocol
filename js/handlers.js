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
Object.defineProperty(exports, '__esModule', { value: true });
var _0x_js_1 = require('0x.js');
var json_schemas_1 = require('@0x/json-schemas');
var HttpStatus = require('http-status-codes');
var _ = require('lodash');
var config_1 = require('./config');
var constants_1 = require('./constants');
var errors_1 = require('./errors');
var fee_strategy_1 = require('./fee_strategy');
var paginator_1 = require('./paginator');
var orderbook_service_1 = require('./services/orderbook_service');
var utils_1 = require('./utils');
var parsePaginationConfig = function(req) {
    var page = req.query.page === undefined ? constants_1.DEFAULT_PAGE : Number(req.query.page);
    var perPage = req.query.perPage === undefined ? constants_1.DEFAULT_PER_PAGE : Number(req.query.perPage);
    if (perPage > config_1.MAX_PER_PAGE) {
        throw new errors_1.ValidationError([
            {
                field: 'perPage',
                code: errors_1.ValidationErrorCodes.ValueOutOfRange,
                reason: 'perPage should be less or equal to ' + config_1.MAX_PER_PAGE,
            },
        ]);
    }
    return { page: page, perPage: perPage };
};
var Handlers = /** @class */ (function() {
    function Handlers(orderBook) {
        this._orderBook = orderBook;
    }
    Handlers.feeRecipients = function(req, res) {
        var _a = parsePaginationConfig(req),
            page = _a.page,
            perPage = _a.perPage;
        var normalizedFeeRecipient = config_1.FEE_RECIPIENT.toLowerCase();
        var feeRecipients = [normalizedFeeRecipient];
        var paginatedFeeRecipients = paginator_1.paginate(feeRecipients, page, perPage);
        res.status(HttpStatus.OK).send(paginatedFeeRecipients);
    };
    Handlers.orderConfig = function(req, res) {
        utils_1.utils.validateSchema(req.body, json_schemas_1.schemas.orderConfigRequestSchema);
        var orderConfigResponse = fee_strategy_1.fixedFeeStrategy.getOrderConfig(req.body);
        res.status(HttpStatus.OK).send(orderConfigResponse);
    };
    Handlers.assetPairsAsync = function(req, res) {
        return __awaiter(this, void 0, void 0, function() {
            var _a, page, perPage, assetPairs;
            return __generator(this, function(_b) {
                switch (_b.label) {
                    case 0:
                        utils_1.utils.validateSchema(req.query, json_schemas_1.schemas.assetPairsRequestOptsSchema);
                        (_a = parsePaginationConfig(req)), (page = _a.page), (perPage = _a.perPage);
                        return [
                            4 /*yield*/,
                            orderbook_service_1.OrderBookService.getAssetPairsAsync(
                                page,
                                perPage,
                                req.query.assetDataA,
                                req.query.assetDataB,
                            ),
                        ];
                    case 1:
                        assetPairs = _b.sent();
                        res.status(HttpStatus.OK).send(assetPairs);
                        return [2 /*return*/];
                }
            });
        });
    };
    Handlers.getOrderByHashAsync = function(req, res) {
        return __awaiter(this, void 0, void 0, function() {
            var orderIfExists;
            return __generator(this, function(_a) {
                switch (_a.label) {
                    case 0:
                        return [
                            4 /*yield*/,
                            orderbook_service_1.OrderBookService.getOrderByHashIfExistsAsync(req.params.orderHash),
                        ];
                    case 1:
                        orderIfExists = _a.sent();
                        if (orderIfExists === undefined) {
                            throw new errors_1.NotFoundError();
                        } else {
                            res.status(HttpStatus.OK).send(orderIfExists);
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    Handlers.prototype.ordersAsync = function(req, res) {
        return __awaiter(this, void 0, void 0, function() {
            var _a, page, perPage, paginatedOrders;
            return __generator(this, function(_b) {
                switch (_b.label) {
                    case 0:
                        utils_1.utils.validateSchema(req.query, json_schemas_1.schemas.ordersRequestOptsSchema);
                        (_a = parsePaginationConfig(req)), (page = _a.page), (perPage = _a.perPage);
                        return [4 /*yield*/, this._orderBook.getOrdersAsync(page, perPage, req.query)];
                    case 1:
                        paginatedOrders = _b.sent();
                        res.status(HttpStatus.OK).send(paginatedOrders);
                        return [2 /*return*/];
                }
            });
        });
    };
    Handlers.prototype.orderbookAsync = function(req, res) {
        return __awaiter(this, void 0, void 0, function() {
            var _a, page, perPage, baseAssetData, quoteAssetData, orderbookResponse;
            return __generator(this, function(_b) {
                switch (_b.label) {
                    case 0:
                        utils_1.utils.validateSchema(req.query, json_schemas_1.schemas.orderBookRequestSchema);
                        (_a = parsePaginationConfig(req)), (page = _a.page), (perPage = _a.perPage);
                        baseAssetData = req.query.baseAssetData;
                        quoteAssetData = req.query.quoteAssetData;
                        return [
                            4 /*yield*/,
                            this._orderBook.getOrderBookAsync(page, perPage, baseAssetData, quoteAssetData),
                        ];
                    case 1:
                        orderbookResponse = _b.sent();
                        res.status(HttpStatus.OK).send(orderbookResponse);
                        return [2 /*return*/];
                }
            });
        });
    };
    Handlers.prototype.postOrderAsync = function(req, res) {
        return __awaiter(this, void 0, void 0, function() {
            var signedOrder, allowedTokens;
            return __generator(this, function(_a) {
                switch (_a.label) {
                    case 0:
                        utils_1.utils.validateSchema(req.body, json_schemas_1.schemas.signedOrderSchema);
                        signedOrder = unmarshallOrder(req.body);
                        if (config_1.WHITELISTED_TOKENS !== '*') {
                            allowedTokens = config_1.WHITELISTED_TOKENS;
                            validateAssetDataIsWhitelistedOrThrow(
                                allowedTokens,
                                signedOrder.makerAssetData,
                                'makerAssetData',
                            );
                            validateAssetDataIsWhitelistedOrThrow(
                                allowedTokens,
                                signedOrder.takerAssetData,
                                'takerAssetData',
                            );
                        }
                        return [4 /*yield*/, this._orderBook.addOrderAsync(signedOrder)];
                    case 1:
                        _a.sent();
                        res.status(HttpStatus.OK).send();
                        return [2 /*return*/];
                }
            });
        });
    };
    return Handlers;
})();
exports.Handlers = Handlers;
function validateAssetDataIsWhitelistedOrThrow(allowedTokens, assetData, field) {
    var e_1, _a;
    var decodedAssetData = _0x_js_1.assetDataUtils.decodeAssetDataOrThrow(assetData);
    if (_0x_js_1.assetDataUtils.isMultiAssetData(decodedAssetData)) {
        try {
            for (
                var _b = __values(decodedAssetData.nestedAssetData.entries()), _c = _b.next();
                !_c.done;
                _c = _b.next()
            ) {
                var _d = __read(_c.value, 2),
                    nestedAssetDataElement = _d[1];
                validateAssetDataIsWhitelistedOrThrow(allowedTokens, nestedAssetDataElement, field);
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
    } else if (!_0x_js_1.assetDataUtils.isStaticCallAssetData(decodedAssetData)) {
        if (!_.includes(allowedTokens, decodedAssetData.tokenAddress)) {
            throw new errors_1.ValidationError([
                {
                    field: field,
                    code: errors_1.ValidationErrorCodes.ValueOutOfRange,
                    reason: decodedAssetData.tokenAddress + ' not supported',
                },
            ]);
        }
    }
}
// As the orders come in as JSON they need to be turned into the correct types such as BigNumber
function unmarshallOrder(signedOrderRaw) {
    var signedOrder = __assign({}, signedOrderRaw, {
        salt: new _0x_js_1.BigNumber(signedOrderRaw.salt),
        makerAssetAmount: new _0x_js_1.BigNumber(signedOrderRaw.makerAssetAmount),
        takerAssetAmount: new _0x_js_1.BigNumber(signedOrderRaw.takerAssetAmount),
        makerFee: new _0x_js_1.BigNumber(signedOrderRaw.makerFee),
        takerFee: new _0x_js_1.BigNumber(signedOrderRaw.takerFee),
        expirationTimeSeconds: new _0x_js_1.BigNumber(signedOrderRaw.expirationTimeSeconds),
    });
    return signedOrder;
}
