import { BigNumber } from '@0x/utils';
import * as express from 'express';
import { StatusCodes } from 'http-status-codes';
import * as isValidUUID from 'uuid-validate';

import { CHAIN_ID, FEE_RECIPIENT_ADDRESS, TAKER_FEE_UNIT_AMOUNT, WHITELISTED_TOKENS } from '../config';
import { NULL_ADDRESS, SRA_DOCS_URL, ZERO } from '../constants';
import { SignedOrderV4Entity } from '../entities';
import { InvalidAPIKeyError, NotFoundError, ValidationError, ValidationErrorCodes } from '../errors';
import { schemas } from '../schemas';
import { OrderConfigResponse, SignedLimitOrder, IOrderBookService } from '../types';
import { paginationUtils } from '../utils/pagination_utils';
import { schemaUtils } from '../utils/schema_utils';

import { Counter } from 'prom-client';

const ORDERS_POST_REQUESTS = new Counter({
    name: 'orders_post_requests_total',
    help: 'Total number of /orders post requests',
    labelNames: ['type', 'chain_id'],
});

const ORDERS_GET_REQUESTS = new Counter({
    name: 'orders_get_requests_total',
    help: 'Total number of /orders get requests',
    labelNames: ['endpoint', 'chain_id'],
});

export class SRAHandlers {
    private readonly _orderBook: IOrderBookService;
    public static rootAsync(_req: express.Request, res: express.Response): void {
        const message = `This is the root of the Standard Relayer API. Visit ${SRA_DOCS_URL} for details about this API.`;
        res.status(StatusCodes.OK).send({ message });
    }
    public static feeRecipients(req: express.Request, res: express.Response): void {
        const { page, perPage } = paginationUtils.parsePaginationConfig(req);
        const normalizedFeeRecipient = FEE_RECIPIENT_ADDRESS.toLowerCase();
        const feeRecipients = [normalizedFeeRecipient];
        const paginatedFeeRecipients = paginationUtils.paginate(feeRecipients, page, perPage);
        res.status(StatusCodes.OK).send(paginatedFeeRecipients);
    }
    public static orderConfig(req: express.Request, res: express.Response): void {
        schemaUtils.validateSchema(req.body, schemas.sraOrderConfigPayloadSchema);
        const orderConfigResponse: OrderConfigResponse = {
            sender: NULL_ADDRESS,
            feeRecipient: FEE_RECIPIENT_ADDRESS.toLowerCase(),
            takerTokenFeeAmount: TAKER_FEE_UNIT_AMOUNT,
        };
        res.status(StatusCodes.OK).send(orderConfigResponse);
    }
    constructor(orderBook: IOrderBookService) {
        this._orderBook = orderBook;
    }
    public async getOrderByHashAsync(req: express.Request, res: express.Response): Promise<void> {
        const orderIfExists = await this._orderBook.getOrderByHashIfExistsAsync(req.params.orderHash);
        if (orderIfExists === undefined) {
            throw new NotFoundError();
        } else {
            res.status(StatusCodes.OK).send(orderIfExists);
        }
    }
    public async ordersAsync(req: express.Request, res: express.Response): Promise<void> {
        schemaUtils.validateSchema(req.query, schemas.sraOrdersQuerySchema);
        const orderFieldFilters = new SignedOrderV4Entity(req.query);
        const additionalFilters = {
            trader: req.query.trader ? req.query.trader.toString() : undefined,
            isUnfillable: req.query.unfillable === 'true',
        };
        const { page, perPage } = paginationUtils.parsePaginationConfig(req);
        const paginatedOrders = await this._orderBook.getOrdersAsync(
            page,
            perPage,
            orderFieldFilters,
            additionalFilters,
        );
        ORDERS_GET_REQUESTS.labels('orders', CHAIN_ID.toString()).inc();
        res.status(StatusCodes.OK).send(paginatedOrders);
    }
    public async orderbookAsync(req: express.Request, res: express.Response): Promise<void> {
        schemaUtils.validateSchema(req.query, schemas.sraOrderbookQuerySchema);
        const { page, perPage } = paginationUtils.parsePaginationConfig(req);
        const baseToken = (req.query.baseToken as string).toLowerCase();
        const quoteToken = (req.query.quoteToken as string).toLowerCase();
        const orderbookResponse = await this._orderBook.getOrderBookAsync(page, perPage, baseToken, quoteToken);
        ORDERS_GET_REQUESTS.labels('book', CHAIN_ID.toString()).inc();
        res.status(StatusCodes.OK).send(orderbookResponse);
    }
    public async postOrderAsync(req: express.Request, res: express.Response): Promise<void> {
        const shouldSkipConfirmation = req.query.skipConfirmation === 'true';
        schemaUtils.validateSchema(req.body, schemas.sraPostOrderPayloadSchema);
        const signedOrder = unmarshallOrder(req.body);
        if (WHITELISTED_TOKENS !== '*') {
            const allowedTokens: string[] = WHITELISTED_TOKENS;
            validateAssetTokenOrThrow(allowedTokens, signedOrder.makerToken, 'makerToken');
            validateAssetTokenOrThrow(allowedTokens, signedOrder.takerToken, 'takerToken');
        }
        if (shouldSkipConfirmation) {
            res.status(StatusCodes.OK).send();
        }
        await this._orderBook.addOrderAsync(signedOrder);
        if (!shouldSkipConfirmation) {
            res.status(StatusCodes.OK).send();
        }
        ORDERS_POST_REQUESTS.labels('single', CHAIN_ID.toString()).inc();
    }
    public async postOrdersAsync(req: express.Request, res: express.Response): Promise<void> {
        const shouldSkipConfirmation = req.query.skipConfirmation === 'true';
        schemaUtils.validateSchema(req.body, schemas.sraPostOrdersPayloadSchema);
        const signedOrders = unmarshallOrders(req.body);
        if (WHITELISTED_TOKENS !== '*') {
            const allowedTokens: string[] = WHITELISTED_TOKENS;
            for (const signedOrder of signedOrders) {
                validateAssetTokenOrThrow(allowedTokens, signedOrder.makerToken, 'makerToken');
                validateAssetTokenOrThrow(allowedTokens, signedOrder.takerToken, 'takerToken');
            }
        }
        if (shouldSkipConfirmation) {
            res.status(StatusCodes.OK).send();
        }
        await this._orderBook.addOrdersAsync(signedOrders);
        if (!shouldSkipConfirmation) {
            res.status(StatusCodes.OK).send();
        }
        ORDERS_POST_REQUESTS.labels('multi', CHAIN_ID.toString()).inc();
    }

    public async postPersistentOrderAsync(req: express.Request, res: express.Response): Promise<void> {
        const shouldSkipConfirmation = req.query.skipConfirmation === 'true';
        const apiKey = req.header('0x-api-key');
        if (apiKey === undefined || !isValidUUID(apiKey) || !this._orderBook.isAllowedPersistentOrders(apiKey)) {
            throw new InvalidAPIKeyError();
        }
        schemaUtils.validateSchema(req.body, schemas.sraPostOrderPayloadSchema);
        const signedOrder = unmarshallOrder(req.body);
        if (WHITELISTED_TOKENS !== '*') {
            const allowedTokens: string[] = WHITELISTED_TOKENS;
            validateAssetTokenOrThrow(allowedTokens, signedOrder.makerToken, 'makerToken');
            validateAssetTokenOrThrow(allowedTokens, signedOrder.takerToken, 'takerToken');
        }
        if (shouldSkipConfirmation) {
            res.status(StatusCodes.OK).send();
        }
        await this._orderBook.addPersistentOrdersAsync([signedOrder]);
        if (!shouldSkipConfirmation) {
            res.status(StatusCodes.OK).send();
        }
    }
}

function validateAssetTokenOrThrow(allowedTokens: string[], tokenAddress: string, field: string): void {
    if (!allowedTokens.includes(tokenAddress)) {
        throw new ValidationError([
            {
                field,
                code: ValidationErrorCodes.ValueOutOfRange,
                reason: `${tokenAddress} not supported`,
            },
        ]);
    }
}

// As the order come in as JSON they need to be turned into the correct types such as BigNumber
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix me!
function unmarshallOrder(signedOrderRaw: any): SignedLimitOrder {
    const signedOrder: SignedLimitOrder = {
        // Defaults...
        taker: NULL_ADDRESS,
        feeRecipient: NULL_ADDRESS,
        pool: '0x0000000000000000000000000000000000000000000000000000000000000000',
        ...signedOrderRaw,
        sender: NULL_ADDRESS, // NOTE: the exchange proxy contract only supports orders with sender 0x000...
        takerTokenFeeAmount: signedOrderRaw.takerTokenFeeAmount
            ? new BigNumber(signedOrderRaw.takerTokenFeeAmount)
            : ZERO,
        makerAmount: new BigNumber(signedOrderRaw.makerAmount),
        takerAmount: new BigNumber(signedOrderRaw.takerAmount),
        expiry: new BigNumber(signedOrderRaw.expiry),
        salt: new BigNumber(signedOrderRaw.salt),
    };
    return signedOrder;
}

// As the orders come in as JSON they need to be turned into the correct types such as BigNumber
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix me!
function unmarshallOrders(signedOrdersRaw: any[]): SignedLimitOrder[] {
    return signedOrdersRaw.map((signedOrderRaw) => {
        return unmarshallOrder(signedOrderRaw);
    });
}
