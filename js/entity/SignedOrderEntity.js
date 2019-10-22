'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
var typeorm_1 = require('typeorm');
var SignedOrderModel_1 = require('../models/SignedOrderModel');
exports.signedOrderEntity = new typeorm_1.EntitySchema({
    name: 'SignedOrder',
    target: SignedOrderModel_1.SignedOrderModel,
    columns: {
        hash: {
            primary: true,
            type: 'varchar',
        },
        senderAddress: {
            type: 'varchar',
        },
        makerAddress: {
            type: 'varchar',
        },
        takerAddress: {
            type: 'varchar',
        },
        makerAssetData: {
            type: 'varchar',
        },
        takerAssetData: {
            type: 'varchar',
        },
        exchangeAddress: {
            type: 'varchar',
        },
        feeRecipientAddress: {
            type: 'varchar',
        },
        expirationTimeSeconds: {
            type: 'int',
        },
        makerFee: {
            type: 'varchar',
        },
        takerFee: {
            type: 'varchar',
        },
        makerFeeAssetData: {
            type: 'varchar',
        },
        takerFeeAssetData: {
            type: 'varchar',
        },
        makerAssetAmount: {
            type: 'varchar',
        },
        takerAssetAmount: {
            type: 'varchar',
        },
        salt: {
            type: 'varchar',
        },
        signature: {
            type: 'varchar',
        },
        remainingFillableTakerAssetAmount: {
            type: 'varchar',
        },
    },
});
