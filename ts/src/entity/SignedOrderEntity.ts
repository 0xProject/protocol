import { EntitySchema } from 'typeorm';

import { SignedOrderModel } from '../models/SignedOrderModel';

export const signedOrderEntity = new EntitySchema<SignedOrderModel>({
    name: 'SignedOrder',
    target: SignedOrderModel,
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
