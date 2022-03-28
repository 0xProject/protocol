// tslint:disable:max-file-line-count
// tslint:disable: prefer-function-over-method
import { ethSignHashWithKey, OtcOrder, RfqOrder, Signature } from '@0x/protocol-utils';
import { SubmitRequest } from '@0x/quote-server';
import { Fee } from '@0x/quote-server/lib/src/types';
import { BigNumber } from '@0x/utils';
import * as express from 'express';
import * as HttpStatus from 'http-status-codes';

import { ONE_MINUTE_MS, ONE_SECOND_MS } from '../constants';
import { QuoteServerPriceParams } from '../types';
import { stringsToOtcOrderFields, stringsToSignature } from '../utils/rfqm_request_utils';

const WETH_ROPSTEN = '0xc778417e063141139fce010982780140aa0cd5ab';
const TTA_ROPSTEN = '0x374a16f5e686c09b0cc9e8bc3466b3b645c74aa7';
const TTB_ROPSTEN = '0xF84830B73b2ED3C7267E7638f500110eA47FDf30';

const WMATIC_POLYGON = '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270';
const DAI_POLYGON = '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063';

const MM_PRIVATE_KEY = '0xf0d8f376ca991256ddb256fb7cd28d68d971b07f5c0cf62cf0294c1ff8078a90';
const MM_ADDRESS = '0x06754422cf9f54ae0e67D42FD788B33D8eb4c5D5';

const ROPSTEN_CHAIN_ID = 3;
const POLYGON_CHAIN_ID = 137;

const ONE_TOKEN = 1e18;

/**
 * This class implements handlers that are used to satisfy the MM Quote Server spec
 */
export class DummyMMHandlers {
    private readonly _tokenSetByChainId: Map<number | undefined, Set<string>>;

    private static _parseQuoteRequest(req: express.Request): QuoteServerPriceParams {
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
            chainId,
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
            chainId: chainId as string,
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
            chainId: rawOrder.chainId,
        });

        return {
            order: rfqOrder,
            orderHash,
            fee: fee as unknown as Fee,
            takerTokenFillAmount: new BigNumber(takerTokenFillAmount),
        };
    }

    private static _parseSignRequest(req: express.Request): {
        feeAmount: string;
        feeToken: string;
        order: OtcOrder;
        orderHash: string;
        expiry: BigNumber;
        takerSignature: Signature;
    } {
        const {
            order: orderRaw,
            orderHash,
            feeAmount: feeAmountRaw,
            feeToken: feeTokenRaw,
            expiry: expiryRaw,
            takerSignature: takerSignatureRaw,
        } = req.body;

        const order = new OtcOrder(stringsToOtcOrderFields(orderRaw as any));
        const takerSignature = stringsToSignature(takerSignatureRaw as any);
        const expiry = new BigNumber(expiryRaw as string);

        return {
            order,
            orderHash: orderHash as string,
            feeAmount: feeAmountRaw as string,
            feeToken: feeTokenRaw as string,
            takerSignature,
            expiry,
        };
    }

    constructor() {
        this._tokenSetByChainId = new Map<number | undefined, Set<string>>();
        this._tokenSetByChainId.set(
            ROPSTEN_CHAIN_ID,
            new Set([WETH_ROPSTEN.toLocaleLowerCase(), TTA_ROPSTEN.toLowerCase(), TTB_ROPSTEN.toLowerCase()]),
        );
        this._tokenSetByChainId.set(
            POLYGON_CHAIN_ID,
            new Set([WMATIC_POLYGON.toLocaleLowerCase(), DAI_POLYGON.toLocaleLowerCase()]),
        );
    }

    /**
     * Simple pricing that always returns 1:1 v1 prices
     */
    public async getPriceV1Async(req: express.Request, res: express.Response): Promise<void> {
        const params = DummyMMHandlers._parseQuoteRequest(req);
        const tokenSet = this._tokenSetByChainId.get(Number(params.chainId));
        const { sellTokenAddress, buyTokenAddress, sellAmountBaseUnits, buyAmountBaseUnits } = params;

        // Check tokens
        if (
            !tokenSet ||
            !tokenSet.has(sellTokenAddress.toLowerCase()) ||
            !tokenSet.has(buyTokenAddress.toLowerCase())
        ) {
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
        const params = DummyMMHandlers._parseQuoteRequest(req);
        const tokenSet = this._tokenSetByChainId.get(Number(params.chainId));
        const { sellTokenAddress, buyTokenAddress, sellAmountBaseUnits, buyAmountBaseUnits } = params;

        // Check tokens
        if (
            !tokenSet ||
            !tokenSet.has(sellTokenAddress.toLowerCase()) ||
            !tokenSet.has(buyTokenAddress.toLowerCase())
        ) {
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
        const params = DummyMMHandlers._parseQuoteRequest(req);
        const tokenSet = this._tokenSetByChainId.get(Number(params.chainId));
        const { sellTokenAddress, buyTokenAddress, sellAmountBaseUnits, buyAmountBaseUnits, txOrigin, takerAddress } =
            params;

        // Check tokens
        if (
            !tokenSet ||
            !tokenSet.has(sellTokenAddress.toLowerCase()) ||
            !tokenSet.has(buyTokenAddress.toLowerCase())
        ) {
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
            taker: takerAddress,
            maker: MM_ADDRESS,
            takerToken,
            makerToken,
            makerAmount: new BigNumber(amount.toString()),
            takerAmount: new BigNumber(amount.toString()),
            expiry: fiveMinLater,
            chainId: Number(params.chainId),
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
        const { order, feeAmount, orderHash } = requestParams;

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
        const response = {
            feeAmount,
            proceedWithFill: isEven,
            makerSignature: signature,
        };

        res.status(HttpStatus.OK).send(response);
    }
}
