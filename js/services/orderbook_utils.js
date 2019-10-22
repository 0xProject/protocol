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
Object.defineProperty(exports, '__esModule', { value: true });
var _0x_js_1 = require('0x.js');
var types_1 = require('@0x/types');
var utils_1 = require('@0x/utils');
var config_1 = require('../config');
var constants_1 = require('../constants');
var SignedOrderModel_1 = require('../models/SignedOrderModel');
var DEFAULT_ERC721_ASSET = {
    minAmount: new _0x_js_1.BigNumber(0),
    maxAmount: new _0x_js_1.BigNumber(1),
    precision: 0,
};
var DEFAULT_ERC20_ASSET = {
    minAmount: new _0x_js_1.BigNumber(0),
    maxAmount: constants_1.MAX_TOKEN_SUPPLY_POSSIBLE,
    precision: config_1.DEFAULT_ERC20_TOKEN_PRECISION,
};
exports.compareAskOrder = function(orderA, orderB) {
    var orderAPrice = orderA.takerAssetAmount.div(orderA.makerAssetAmount);
    var orderBPrice = orderB.takerAssetAmount.div(orderB.makerAssetAmount);
    if (!orderAPrice.isEqualTo(orderBPrice)) {
        return orderAPrice.comparedTo(orderBPrice);
    }
    return exports.compareOrderByFeeRatio(orderA, orderB);
};
exports.compareBidOrder = function(orderA, orderB) {
    var orderAPrice = orderA.makerAssetAmount.div(orderA.takerAssetAmount);
    var orderBPrice = orderB.makerAssetAmount.div(orderB.takerAssetAmount);
    if (!orderAPrice.isEqualTo(orderBPrice)) {
        return orderBPrice.comparedTo(orderAPrice);
    }
    return exports.compareOrderByFeeRatio(orderA, orderB);
};
exports.compareOrderByFeeRatio = function(orderA, orderB) {
    var orderAFeePrice = orderA.takerFee.div(orderA.takerAssetAmount);
    var orderBFeePrice = orderB.takerFee.div(orderB.takerAssetAmount);
    if (!orderAFeePrice.isEqualTo(orderBFeePrice)) {
        return orderBFeePrice.comparedTo(orderAFeePrice);
    }
    return orderA.expirationTimeSeconds.comparedTo(orderB.expirationTimeSeconds);
};
exports.includesTokenAddress = function(assetData, tokenAddress) {
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
                if (exports.includesTokenAddress(nestedAssetDataElement, tokenAddress)) {
                    return true;
                }
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
        return false;
    } else if (!_0x_js_1.assetDataUtils.isStaticCallAssetData(decodedAssetData)) {
        return decodedAssetData.tokenAddress === tokenAddress;
    }
    return false;
};
exports.deserializeOrder = function(signedOrderModel) {
    var signedOrder = {
        signature: signedOrderModel.signature,
        senderAddress: signedOrderModel.senderAddress,
        makerAddress: signedOrderModel.makerAddress,
        takerAddress: signedOrderModel.takerAddress,
        makerFee: new _0x_js_1.BigNumber(signedOrderModel.makerFee),
        takerFee: new _0x_js_1.BigNumber(signedOrderModel.takerFee),
        makerAssetAmount: new _0x_js_1.BigNumber(signedOrderModel.makerAssetAmount),
        takerAssetAmount: new _0x_js_1.BigNumber(signedOrderModel.takerAssetAmount),
        makerAssetData: signedOrderModel.makerAssetData,
        takerAssetData: signedOrderModel.takerAssetData,
        salt: new _0x_js_1.BigNumber(signedOrderModel.salt),
        exchangeAddress: signedOrderModel.exchangeAddress,
        feeRecipientAddress: signedOrderModel.feeRecipientAddress,
        expirationTimeSeconds: new _0x_js_1.BigNumber(signedOrderModel.expirationTimeSeconds),
        makerFeeAssetData: signedOrderModel.makerFeeAssetData,
        takerFeeAssetData: signedOrderModel.takerFeeAssetData,
        chainId: config_1.NETWORK_ID,
    };
    return signedOrder;
};
exports.deserializeOrderToAPIOrder = function(signedOrderModel) {
    var order = exports.deserializeOrder(signedOrderModel);
    var apiOrder = {
        order: order,
        metaData: {
            orderHash: signedOrderModel.hash,
            remainingFillableTakerAssetAmount: signedOrderModel.remainingFillableTakerAssetAmount,
        },
    };
    return apiOrder;
};
exports.serializeOrder = function(apiOrder) {
    var signedOrder = apiOrder.order;
    var signedOrderModel = new SignedOrderModel_1.SignedOrderModel({
        signature: signedOrder.signature,
        senderAddress: signedOrder.senderAddress,
        makerAddress: signedOrder.makerAddress,
        takerAddress: signedOrder.takerAddress,
        makerAssetAmount: signedOrder.makerAssetAmount.toString(),
        takerAssetAmount: signedOrder.takerAssetAmount.toString(),
        makerAssetData: signedOrder.makerAssetData,
        takerAssetData: signedOrder.takerAssetData,
        makerFee: signedOrder.makerFee.toString(),
        takerFee: signedOrder.takerFee.toString(),
        makerFeeAssetData: signedOrder.makerFeeAssetData.toString(),
        takerFeeAssetData: signedOrder.takerFeeAssetData.toString(),
        salt: signedOrder.salt.toString(),
        exchangeAddress: signedOrder.exchangeAddress,
        feeRecipientAddress: signedOrder.feeRecipientAddress,
        expirationTimeSeconds: signedOrder.expirationTimeSeconds.toNumber(),
        hash: apiOrder.metaData.orderHash,
        remainingFillableTakerAssetAmount: apiOrder.metaData.remainingFillableTakerAssetAmount.toString(),
    });
    return signedOrderModel;
};
var erc721AssetDataToAsset = function(assetData) {
    return __assign({}, DEFAULT_ERC721_ASSET, { assetData: assetData });
};
var erc20AssetDataToAsset = function(assetData) {
    return __assign({}, DEFAULT_ERC20_ASSET, { assetData: assetData });
};
var assetDataToAsset = function(assetData) {
    var assetProxyId = _0x_js_1.assetDataUtils.decodeAssetProxyId(assetData);
    var asset;
    switch (assetProxyId) {
        case types_1.AssetProxyId.ERC20:
            asset = erc20AssetDataToAsset(assetData);
            break;
        case types_1.AssetProxyId.ERC721:
            asset = erc721AssetDataToAsset(assetData);
            break;
        default:
            throw utils_1.errorUtils.spawnSwitchErr('assetProxyId', assetProxyId);
    }
    return asset;
};
exports.signedOrderToAssetPair = function(signedOrder) {
    return {
        assetDataA: assetDataToAsset(signedOrder.makerAssetData),
        assetDataB: assetDataToAsset(signedOrder.takerAssetData),
    };
};
