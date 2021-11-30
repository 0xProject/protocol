// tslint:disable:max-file-line-count
// tslint:disable: prefer-function-over-method
import { ethSignHashWithKey, OtcOrder, RfqOrder } from '@0x/protocol-utils';
import { SignRequest, SignResponse, SubmitRequest, TakerRequestQueryParamsUnnested } from '@0x/quote-server';
import { Fee } from '@0x/quote-server/lib/src/types';
import { BigNumber, NULL_ADDRESS } from '@0x/utils';
import * as express from 'express';
import * as HttpStatus from 'http-status-codes';

import { ONE_MINUTE_MS, ONE_SECOND_MS } from '../constants';
import { stringsToOtcOrderFields, stringsToSignature } from '../utils/rfqm_request_utils';

const TOKEN_A = '0x374a16f5e686c09b0cc9e8bc3466b3b645c74aa7';
const TOKEN_B = '0xF84830B73b2ED3C7267E7638f500110eA47FDf30';
const MM_PRIVATE_KEY = '0xf0d8f376ca991256ddb256fb7cd28d68d971b07f5c0cf62cf0294c1ff8078a90';
const MM_ADDRESS = '0x06754422cf9f54ae0e67D42FD788B33D8eb4c5D5';
const ROPSTEN_CHAIN_ID = 3;
const ONE_TOKEN = 1e18;
const TOKEN_SET = new Set([TOKEN_A.toLowerCase(), TOKEN_B.toLowerCase()]);

/**
 * This class implements handlers that are used to satisfy the MM Quote Server spec
 */
export class DummyMMHandlers {
    private static _parseQuoteRequest(req: express.Request): TakerRequestQueryParamsUnnested {
        const {
            sellTokenAddress,
            buyTokenAddress,
            takerAddress,
            sellAmountBaseUnits,
            buyAmountBaseUnits,
            txOrigin,
            isLastLook,
            feeToken,
            feeAmount,
            feeType,
        } = req.query;

        const isSelling = sellAmountBaseUnits !== undefined;

        const BASE_REQUEST = {
            sellTokenAddress: sellTokenAddress as string,
            buyTokenAddress: buyTokenAddress as string,
            takerAddress: takerAddress as string,
            txOrigin: txOrigin as string,
            isLastLook: isLastLook as string,
            feeToken: feeToken as string,
            feeAmount: feeAmount as string,
            feeType: feeType as string,
        };

        if (isSelling) {
            return {
                ...BASE_REQUEST,
                sellAmountBaseUnits: sellAmountBaseUnits as string,
            };
        } else {
            return {
                ...BASE_REQUEST,
                buyAmountBaseUnits: buyAmountBaseUnits as string,
            };
        }
    }

    private static _parseSubmitRequest(
        req: express.Request<{}, {}, Record<keyof SubmitRequest, string>>,
    ): SubmitRequest {
        const { order, orderHash, fee, takerTokenFillAmount } = req.body;

        const rawOrder = order as any;
        const rfqOrder = new RfqOrder({
            txOrigin: rawOrder.txOrigin,
            expiry: new BigNumber(rawOrder.expiry),
            pool: rawOrder.pool,
            salt: new BigNumber(rawOrder.salt),
            makerToken: rawOrder.makerToken,
            takerToken: rawOrder.takerToken,
            makerAmount: new BigNumber(rawOrder.makerAmount),
            takerAmount: new BigNumber(rawOrder.takerAmount),
            maker: rawOrder.maker,
            taker: rawOrder.taker,
        });

        return {
            order: rfqOrder,
            orderHash,
            fee: fee as unknown as Fee,
            takerTokenFillAmount: new BigNumber(takerTokenFillAmount),
        };
    }

    private static _parseSignRequest(req: express.Request): SignRequest {
        const {
            order: orderRaw,
            orderHash,
            fee: feeRaw,
            expiry: expiryRaw,
            takerSignature: takerSignatureRaw,
        } = req.body;

        const order = new OtcOrder(stringsToOtcOrderFields(orderRaw as any));
        const takerSignature = stringsToSignature(takerSignatureRaw as any);
        const expiry = new BigNumber(expiryRaw as string);

        return {
            order,
            orderHash: orderHash as string,
            fee: feeRaw as unknown as Fee,
            takerSignature,
            expiry,
        };
    }

    /**
     * Simple pricing that always returns 1:1 v1 prices
     */
    public async getPriceV1Async(req: express.Request, res: express.Response): Promise<void> {
        const requestParams = DummyMMHandlers._parseQuoteRequest(req);
        const { sellTokenAddress, buyTokenAddress, sellAmountBaseUnits, buyAmountBaseUnits } = requestParams;

        // Check tokens
        if (!TOKEN_SET.has(sellTokenAddress.toLowerCase()) || !TOKEN_SET.has(buyTokenAddress.toLowerCase())) {
            res.status(HttpStatus.NO_CONTENT).send({});
            return;
        }

        // Get amount (direction doesn't matter because price is always 1:1)
        const isSelling = sellAmountBaseUnits !== undefined;
        const rawAmount = (isSelling ? sellAmountBaseUnits : buyAmountBaseUnits) as string;
        const amount = new BigNumber(rawAmount);

        // Tokens
        const takerToken = sellTokenAddress as string;
        const makerToken = buyTokenAddress as string;

        // Expiry
        const now = new BigNumber(Date.now());
        const fiveMinLater = now.plus(new BigNumber(5).times(ONE_MINUTE_MS)).div(ONE_SECOND_MS).integerValue();

        const indicativeQuote = {
            expiry: fiveMinLater.toString(),
            makerToken,
            takerToken,
            makerAmount: amount.toString(),
            takerAmount: amount.toString(),
        };
        res.status(HttpStatus.OK).send(indicativeQuote);
        return;
    }

    /**
     * Simple pricing that always returns 1:1 v2 prices
     */
    public async getPriceV2Async(req: express.Request, res: express.Response): Promise<void> {
        const requestParams = DummyMMHandlers._parseQuoteRequest(req);
        const { sellTokenAddress, buyTokenAddress, sellAmountBaseUnits, buyAmountBaseUnits } = requestParams;

        // Check tokens
        if (!TOKEN_SET.has(sellTokenAddress.toLowerCase()) || !TOKEN_SET.has(buyTokenAddress.toLowerCase())) {
            res.status(HttpStatus.NO_CONTENT).send({});
            return;
        }

        // Get amount (direction doesn't matter because price is always 1:1)
        const isSelling = sellAmountBaseUnits !== undefined;
        const rawAmount = (isSelling ? sellAmountBaseUnits : buyAmountBaseUnits) as string;
        const amount = new BigNumber(rawAmount);

        // Tokens
        const takerToken = sellTokenAddress as string;
        const makerToken = buyTokenAddress as string;

        // Expiry
        const now = new BigNumber(Date.now());
        const fiveMinLater = now.plus(new BigNumber(5).times(ONE_MINUTE_MS)).div(ONE_SECOND_MS).integerValue();

        const indicativeQuote = {
            expiry: fiveMinLater.toString(),
            makerToken,
            takerToken,
            makerAmount: amount.toString(),
            takerAmount: amount.toString(),
            maker: MM_ADDRESS,
        };
        res.status(HttpStatus.OK).send(indicativeQuote);
        return;
    }

    /**
     * Simple quoting that always signs an order 1:1 for RFQM v1
     */
    public async getQuoteV1Async(req: express.Request, res: express.Response): Promise<void> {
        const requestParams = DummyMMHandlers._parseQuoteRequest(req);
        const { sellTokenAddress, buyTokenAddress, sellAmountBaseUnits, buyAmountBaseUnits, txOrigin } = requestParams;

        // Check tokens
        if (!TOKEN_SET.has(sellTokenAddress.toLowerCase()) || !TOKEN_SET.has(buyTokenAddress.toLowerCase())) {
            res.status(HttpStatus.NO_CONTENT).send({});
            return;
        }

        // Get amount (direction doesn't matter because price is always 1:1)
        const isSelling = sellAmountBaseUnits !== undefined;
        const rawAmount = (isSelling ? sellAmountBaseUnits : buyAmountBaseUnits) as string;
        const amount = new BigNumber(rawAmount);

        // Tokens
        const takerToken = sellTokenAddress as string;
        const makerToken = buyTokenAddress as string;

        // Expiry
        const now = new BigNumber(Date.now());
        const fiveMinLater = now.plus(new BigNumber(5).times(ONE_MINUTE_MS)).div(ONE_SECOND_MS).integerValue();

        const rfqOrder = new RfqOrder({
            txOrigin,
            taker: NULL_ADDRESS,
            maker: MM_ADDRESS,
            takerToken,
            makerToken,
            makerAmount: new BigNumber(amount.toString()),
            takerAmount: new BigNumber(amount.toString()),
            expiry: fiveMinLater,
            chainId: ROPSTEN_CHAIN_ID,
            salt: now,
        });

        const orderHash = rfqOrder.getHash();
        const signature = ethSignHashWithKey(orderHash, MM_PRIVATE_KEY);

        const firmQuote = {
            signedOrder: {
                ...rfqOrder,
                signature,
            },
        };
        res.status(HttpStatus.OK).send(firmQuote);
        return;
    }

    /**
     * Approves even amounts and rejects odd amounts, ignoring decimals
     *
     * Examples:
     * - 1.000_000_000_000_000_000 is considered odd!
     * - 2.000_000_000_000_000_001 is considered even!
     */
    public async submitAsync(req: express.Request, res: express.Response): Promise<void> {
        const requestParams = DummyMMHandlers._parseSubmitRequest(req);
        const { order, fee, orderHash, takerTokenFillAmount } = requestParams;

        const isEven = order.takerAmount.div(ONE_TOKEN).integerValue().mod(2).eq(0);
        const response = {
            fee,
            proceedWithFill: isEven,
            signedOrderHash: orderHash,
            takerTokenFillAmount: takerTokenFillAmount.toString(),
        };

        res.status(HttpStatus.OK).send(response);
    }

    /**
     * Approves even amounts and rejects odd amounts, ignoring decimals
     *
     * Examples:
     * - 1.000_000_000_000_000_000 is considered odd!
     * - 2.000_000_000_000_000_001 is considered even!
     */
    public async signAsync(req: express.Request, res: express.Response): Promise<void> {
        const requestParams = DummyMMHandlers._parseSignRequest(req);
        const { order, fee, orderHash } = requestParams;

        const isEven = order.takerAmount.div(ONE_TOKEN).integerValue().mod(2).eq(0);

        // Reject
        if (!isEven) {
            res.status(HttpStatus.OK).send({
                proceedWithFill: false,
            });
            return;
        }

        // Accept and sign
        const signature = ethSignHashWithKey(orderHash, MM_PRIVATE_KEY);
        const response: SignResponse = {
            fee,
            proceedWithFill: isEven,
            makerSignature: signature,
        };

        res.status(HttpStatus.OK).send(response);
    }
}
