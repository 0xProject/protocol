'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
var config_1 = require('./config');
var constants_1 = require('./constants');
exports.fixedFeeStrategy = {
    getOrderConfig: function(_order) {
        var normalizedFeeRecipient = config_1.FEE_RECIPIENT.toLowerCase();
        var orderConfigResponse = {
            senderAddress: constants_1.NULL_ADDRESS,
            feeRecipientAddress: normalizedFeeRecipient,
            makerFee: config_1.MAKER_FEE_UNIT_AMOUNT,
            takerFee: config_1.TAKER_FEE_UNIT_AMOUNT,
            makerFeeAssetData: config_1.MAKER_FEE_ASSET_DATA,
            takerFeeAssetData: config_1.TAKER_FEE_ASSET_DATA,
        };
        return orderConfigResponse;
    },
};
