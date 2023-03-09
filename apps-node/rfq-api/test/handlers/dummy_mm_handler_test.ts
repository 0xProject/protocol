import { OtcOrder } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';
import * as express from 'express';
import * as asyncHandler from 'express-async-handler';
import * as HttpStatus from 'http-status-codes';
import * as supertest from 'supertest';

import { DummyMMHandlers } from '../../src/handlers/dummy_mm_handler';
import { getSignerFromHash } from '../../src/utils/signature_utils';

const POLYGON_CHAIN_ID = 137;
const USDC_POLYGON = '0x2791bca1f2de4661ed88a30c99a7a9449aa84174';
const USDT_POLYGON = '0xc2132d05d31c914a87c6611c10748aeb04b58e8f';
const MM_ADDRESS = '0x06754422cf9f54ae0e67d42fd788b33d8eb4c5d5';
const INTEGRATOR_ID = '74188355-c85b-4f18-9de4-6dec3ec61b8d';
const dummyMMHandler = new DummyMMHandlers();
const emptyOtcOrder = new OtcOrder();
const emptyOtcOrderParam = {
    maker: emptyOtcOrder.maker,
    taker: emptyOtcOrder.taker,
    makerAmount: emptyOtcOrder.makerAmount.toString(),
    takerAmount: emptyOtcOrder.takerAmount.toString(),
    makerToken: emptyOtcOrder.makerToken,
    takerToken: emptyOtcOrder.takerToken,
    txOrigin: emptyOtcOrder.txOrigin,
    expiryAndNonce: emptyOtcOrder.expiryAndNonce.toString(),
    chainId: emptyOtcOrder.chainId.toString(),
    verifyingContract: emptyOtcOrder.verifyingContract,
};
const acceptedOtcOrder = new OtcOrder({
    makerToken: USDC_POLYGON,
    takerToken: USDT_POLYGON,
    takerAmount: new BigNumber('200'),
    chainId: POLYGON_CHAIN_ID,
});
const acceptedOtcOrderParam = {
    maker: acceptedOtcOrder.maker,
    taker: acceptedOtcOrder.taker,
    makerAmount: acceptedOtcOrder.makerAmount.toString(),
    takerAmount: acceptedOtcOrder.takerAmount.toString(),
    makerToken: acceptedOtcOrder.makerToken,
    takerToken: acceptedOtcOrder.takerToken,
    txOrigin: acceptedOtcOrder.txOrigin,
    expiryAndNonce: acceptedOtcOrder.expiryAndNonce.toString(),
    chainId: acceptedOtcOrder.chainId.toString(),
    verifyingContract: acceptedOtcOrder.verifyingContract,
};
const refusedOtcOrder = new OtcOrder({
    makerToken: USDC_POLYGON,
    takerToken: USDT_POLYGON,
    takerAmount: new BigNumber('1000000'),
    chainId: POLYGON_CHAIN_ID,
});
const refusedOtcOrderParam = {
    maker: refusedOtcOrder.maker,
    taker: refusedOtcOrder.taker,
    makerAmount: refusedOtcOrder.makerAmount.toString(),
    takerAmount: refusedOtcOrder.takerAmount.toString(),
    makerToken: refusedOtcOrder.makerToken,
    takerToken: refusedOtcOrder.takerToken,
    txOrigin: refusedOtcOrder.txOrigin,
    expiryAndNonce: refusedOtcOrder.expiryAndNonce.toString(),
    chainId: refusedOtcOrder.chainId.toString(),
    verifyingContract: refusedOtcOrder.verifyingContract,
};

describe('DummyMMHandlers', () => {
    describe('signRfqtV2Async', () => {
        it('returns BAD_REQUEST when order hash does not match with order hash query param', async () => {
            const response = await supertest(
                express()
                    .use(express.json())
                    .post('/rfqt/v2/sign', asyncHandler(dummyMMHandler.signRfqtV2Async.bind(dummyMMHandler))),
            )
                .post('/rfqt/v2/sign')
                .set('Content-type', 'application/json')
                .send({
                    order: emptyOtcOrderParam,
                    orderHash: '0xrandom',
                    feeAmount: '10',
                    feeToken: '0xfee',
                    expiry: '20',
                });

            expect(response.statusCode).toEqual(HttpStatus.BAD_REQUEST);
        });

        it('returns NO_CONTENT when tokens in the order are not part of provided liquity', async () => {
            const response = await supertest(
                express()
                    .use(express.json())
                    .post('/rfqt/v2/sign', asyncHandler(dummyMMHandler.signRfqtV2Async.bind(dummyMMHandler))),
            )
                .post('/rfqt/v2/sign')
                .set('Content-type', 'application/json')
                .send({
                    order: emptyOtcOrderParam,
                    orderHash: emptyOtcOrder.getHash(),
                    feeAmount: '10',
                    feeToken: '0xfee',
                    expiry: '20',
                });

            expect(response.statusCode).toEqual(HttpStatus.NO_CONTENT);
        });

        it('returns NO_CONTENT when the market marker refuses to sign the order', async () => {
            const response = await supertest(
                express()
                    .use(express.json())
                    .post('/rfqt/v2/sign', asyncHandler(dummyMMHandler.signRfqtV2Async.bind(dummyMMHandler))),
            )
                .post('/rfqt/v2/sign')
                .set('Content-type', 'application/json')
                .send({
                    order: refusedOtcOrderParam,
                    orderHash: refusedOtcOrder.getHash(),
                    feeAmount: '10',
                    feeToken: '0xfee',
                    expiry: '20',
                });

            expect(response.statusCode).toEqual(HttpStatus.NO_CONTENT);
        });

        it('returns OK when the market marker signs', async () => {
            const response = await supertest(
                express()
                    .use(express.json())
                    .post('/rfqt/v2/sign', asyncHandler(dummyMMHandler.signRfqtV2Async.bind(dummyMMHandler))),
            )
                .post('/rfqt/v2/sign')
                .set('Content-type', 'application/json')
                .send({
                    order: acceptedOtcOrderParam,
                    orderHash: acceptedOtcOrder.getHash(),
                    feeAmount: '10',
                    feeToken: '0xfee',
                    expiry: '20',
                });

            expect(response.statusCode).toEqual(HttpStatus.OK);
            const signer = getSignerFromHash(acceptedOtcOrder.getHash(), response.body.makerSignature);
            expect(signer).toEqual(MM_ADDRESS);
        });
    });

    describe('getQuoteRfqtV2Async', () => {
        it('returns BAD_REQUEST when missing integrator id', async () => {
            const response = await supertest(
                express().get('/rfqt/v2/quote', asyncHandler(dummyMMHandler.getQuoteRfqtV2Async.bind(dummyMMHandler))),
            )
                .get('/rfqt/v2/quote')
                .query({
                    sellTokenAddress: USDC_POLYGON,
                    buyTokenAddress: USDT_POLYGON,
                    sellAmountBaseUnits: '200',
                    txOrigin: '0x123456789',
                    takerAddress: '0x123456789',
                    feeToken: USDC_POLYGON,
                    feeAmount: '10',
                    chainId: POLYGON_CHAIN_ID.toString(),
                });

            expect(response.statusCode).toEqual(HttpStatus.BAD_REQUEST);
        });

        it('returns BAD_REQUEST when integrator id is not whitelisted', async () => {
            const response = await supertest(
                express().get('/rfqt/v2/quote', asyncHandler(dummyMMHandler.getQuoteRfqtV2Async.bind(dummyMMHandler))),
            )
                .get('/rfqt/v2/quote')
                .set('0x-integrator-id', '0123')
                .query({
                    sellTokenAddress: USDC_POLYGON,
                    buyTokenAddress: USDT_POLYGON,
                    sellAmountBaseUnits: '200',
                    txOrigin: '0x123456789',
                    takerAddress: '0x123456789',
                    feeToken: USDC_POLYGON,
                    feeAmount: '10',
                    chainId: POLYGON_CHAIN_ID.toString(),
                    integratorId: '0123',
                });

            expect(response.statusCode).toEqual(HttpStatus.BAD_REQUEST);
        });

        it('returns NO_CONTENT when tokens in the order are not part of provided liquity', async () => {
            const response = await supertest(
                express().get('/rfqt/v2/quote', asyncHandler(dummyMMHandler.getQuoteRfqtV2Async.bind(dummyMMHandler))),
            )
                .get('/rfqt/v2/quote')
                .set('0x-integrator-id', INTEGRATOR_ID)
                .query({
                    sellTokenAddress: '0x1234',
                    buyTokenAddress: USDT_POLYGON,
                    sellAmountBaseUnits: '200',
                    txOrigin: '0x123456789',
                    takerAddress: '0x123456789',
                    feeToken: USDC_POLYGON,
                    feeAmount: '10',
                    chainId: POLYGON_CHAIN_ID.toString(),
                    integratorId: INTEGRATOR_ID,
                });

            expect(response.statusCode).toEqual(HttpStatus.NO_CONTENT);
        });

        it('returns NO_CONTENT when buy/sell amount > 2', async () => {
            const response = await supertest(
                express().get('/rfqt/v2/quote', asyncHandler(dummyMMHandler.getQuoteRfqtV2Async.bind(dummyMMHandler))),
            )
                .get('/rfqt/v2/quote')
                .set('0x-integrator-id', INTEGRATOR_ID)
                .query({
                    sellTokenAddress: USDC_POLYGON,
                    buyTokenAddress: USDT_POLYGON,
                    sellAmountBaseUnits: '20000000000',
                    txOrigin: '0x123456789',
                    takerAddress: '0x123456789',
                    feeToken: USDC_POLYGON,
                    feeAmount: '10',
                    chainId: POLYGON_CHAIN_ID.toString(),
                    integratorId: INTEGRATOR_ID,
                });

            expect(response.statusCode).toEqual(HttpStatus.NO_CONTENT);
        });

        it('returns NO_CONTENT when trading amount is considered odd', async () => {
            const response = await supertest(
                express().get('/rfqt/v2/quote', asyncHandler(dummyMMHandler.getQuoteRfqtV2Async.bind(dummyMMHandler))),
            )
                .get('/rfqt/v2/quote')
                .set('0x-integrator-id', INTEGRATOR_ID)
                .query({
                    sellTokenAddress: USDC_POLYGON,
                    buyTokenAddress: USDT_POLYGON,
                    sellAmountBaseUnits: '1000000',
                    txOrigin: '0x123456789',
                    takerAddress: '0x123456789',
                    feeToken: USDC_POLYGON,
                    feeAmount: '10',
                    chainId: POLYGON_CHAIN_ID.toString(),
                    integratorId: INTEGRATOR_ID,
                });

            expect(response.statusCode).toEqual(HttpStatus.NO_CONTENT);
        });

        it('returns OK the market maker signs the order', async () => {
            const response = await supertest(
                express().get('/rfqt/v2/quote', asyncHandler(dummyMMHandler.getQuoteRfqtV2Async.bind(dummyMMHandler))),
            )
                .get('/rfqt/v2/quote')
                .set('0x-integrator-id', INTEGRATOR_ID)
                .query({
                    sellTokenAddress: USDC_POLYGON,
                    buyTokenAddress: USDT_POLYGON,
                    sellAmountBaseUnits: '200',
                    txOrigin: '0x123456789',
                    takerAddress: '0x123456789',
                    feeToken: USDC_POLYGON,
                    feeAmount: '10',
                    chainId: POLYGON_CHAIN_ID.toString(),
                    integratorId: INTEGRATOR_ID,
                });

            expect(response.statusCode).toEqual(HttpStatus.OK);
        });
    });
});
