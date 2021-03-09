import { BigNumber } from '@0x/utils';
import * as express from 'express';
import * as HttpStatus from 'http-status-codes';
import * as isValidUUID from 'uuid-validate';

import { FEE_RECIPIENT_ADDRESS, TAKER_FEE_UNIT_AMOUNT, WHITELISTED_TOKENS } from '../config';
import { NULL_ADDRESS, SRA_DOCS_URL, ZERO } from '../constants';
import { SignedOrderV4Entity } from '../entities';
import {
    GeneralErrorCodes,
    generalErrorCodeToReason,
    NotFoundError,
    ValidationError,
    ValidationErrorCodes,
} from '../errors';
import { schemas } from '../schemas';
import { OrderBookService } from '../services/orderbook_service';
import { OrderConfigResponse, SignedLimitOrder } from '../types';
import { paginationUtils } from '../utils/pagination_utils';
import { schemaUtils } from '../utils/schema_utils';

export class SRAHandlers {
    private readonly _orderBook: OrderBookService;
    public static rootAsync(_req: express.Request, res: express.Response): void {
        const message = `This is the root of the Standard Relayer API. Visit ${SRA_DOCS_URL} for details about this API.`;
        res.status(HttpStatus.OK).send({ message });
    }
    public static feeRecipients(req: express.Request, res: express.Response): void {
        const { page, perPage } = paginationUtils.parsePaginationConfig(req);
        const normalizedFeeRecipient = FEE_RECIPIENT_ADDRESS.toLowerCase();
        const feeRecipients = [normalizedFeeRecipient];
        const paginatedFeeRecipients = paginationUtils.paginate(feeRecipients, page, perPage);
        res.status(HttpStatus.OK).send(paginatedFeeRecipients);
    }
    public static orderConfig(req: express.Request, res: express.Response): void {
        schemaUtils.validateSchema(req.body, schemas.sraOrderConfigPayloadSchema);
        const orderConfigResponse: OrderConfigResponse = {
            sender: NULL_ADDRESS,
            feeRecipient: FEE_RECIPIENT_ADDRESS.toLowerCase(),
            takerTokenFeeAmount: TAKER_FEE_UNIT_AMOUNT,
        };
        res.status(HttpStatus.OK).send(orderConfigResponse);
    }
    constructor(orderBook: OrderBookService) {
        this._orderBook = orderBook;
    }
    public async getOrderByHashAsync(req: express.Request, res: express.Response): Promise<void> {
        const orderIfExists = await this._orderBook.getOrderByHashIfExistsAsync(req.params.orderHash);
        if (orderIfExists === undefined) {
            throw new NotFoundError();
        } else {
            res.status(HttpStatus.OK).send(orderIfExists);
        }
    }
    public async ordersAsync(req: express.Request, res: express.Response): Promise<void> {
        schemaUtils.validateSchema(req.query, schemas.sraOrdersQuerySchema);
        const orderFieldFilters = new SignedOrderV4Entity(req.query);
        const additionalFilters = {
            trader: req.query.trader ? req.query.trader.toString() : undefined,
            isUnfillable: req.query.unfillable ? req.query.unfillable === 'true' : false,
        };
        const { page, perPage } = paginationUtils.parsePaginationConfig(req);
        const paginatedOrders = await this._orderBook.getOrdersAsync(
            page,
            perPage,
            orderFieldFilters,
            additionalFilters,
        );
        res.status(HttpStatus.OK).send(paginatedOrders);
    }
    public async orderbookAsync(req: express.Request, res: express.Response): Promise<void> {
        schemaUtils.validateSchema(req.query, schemas.sraOrderbookQuerySchema);
        const { page, perPage } = paginationUtils.parsePaginationConfig(req);
        const baseToken = (req.query.baseToken as string).toLowerCase();
        const quoteToken = (req.query.quoteToken as string).toLowerCase();
        const orderbookResponse = await this._orderBook.getOrderBookAsync(page, perPage, baseToken, quoteToken);
        res.status(HttpStatus.OK).send(orderbookResponse);
    }
    public async postOrderAsync(req: express.Request, res: express.Response): Promise<void> {
        schemaUtils.validateSchema(req.body, schemas.sraPostOrderPayloadSchema);
        const signedOrder = unmarshallOrder(req.body);
        if (WHITELISTED_TOKENS !== '*') {
            const allowedTokens: string[] = WHITELISTED_TOKENS;
            validateAssetTokenOrThrow(allowedTokens, signedOrder.makerToken, 'makerToken');
            validateAssetTokenOrThrow(allowedTokens, signedOrder.takerToken, 'takerToken');
        }
        const pinResult = await this._orderBook.splitOrdersByPinningAsync([signedOrder]);
        const isPinned = pinResult.pin.length === 1;
        await this._orderBook.addOrderAsync(signedOrder, isPinned);
        res.status(HttpStatus.OK).send();
    }
    public async postOrdersAsync(req: express.Request, res: express.Response): Promise<void> {
        schemaUtils.validateSchema(req.body, schemas.sraPostOrdersPayloadSchema);
        const signedOrders = unmarshallOrders(req.body);
        if (WHITELISTED_TOKENS !== '*') {
            const allowedTokens: string[] = WHITELISTED_TOKENS;
            for (const signedOrder of signedOrders) {
                validateAssetTokenOrThrow(allowedTokens, signedOrder.makerToken, 'makerToken');
                validateAssetTokenOrThrow(allowedTokens, signedOrder.takerToken, 'takerToken');
            }
        }
        const pinResult = await this._orderBook.splitOrdersByPinningAsync(signedOrders);
        await Promise.all([
            this._orderBook.addOrdersAsync(pinResult.pin, true),
            this._orderBook.addOrdersAsync(pinResult.doNotPin, false),
        ]);
        res.status(HttpStatus.OK).send();
    }

    public async postPersistentOrderAsync(req: express.Request, res: express.Response): Promise<void> {
        const apiKey = req.header('0x-api-key');
        if (apiKey === undefined || !isValidUUID(apiKey) || !OrderBookService.isAllowedPersistentOrders(apiKey)) {
            res.status(HttpStatus.BAD_REQUEST).send({
                code: GeneralErrorCodes.InvalidAPIKey,
                reason: generalErrorCodeToReason[GeneralErrorCodes.InvalidAPIKey],
            });
            return;
        }
        schemaUtils.validateSchema(req.body, schemas.sraPostOrderPayloadSchema);
        const signedOrder = unmarshallOrder(req.body);
        if (WHITELISTED_TOKENS !== '*') {
            const allowedTokens: string[] = WHITELISTED_TOKENS;
            validateAssetTokenOrThrow(allowedTokens, signedOrder.makerToken, 'makerToken');
            validateAssetTokenOrThrow(allowedTokens, signedOrder.takerToken, 'takerToken');
        }
        await this._orderBook.addPersistentOrdersAsync([signedOrder], false);
        res.status(HttpStatus.OK).send();
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
function unmarshallOrder(signedOrderRaw: any): SignedLimitOrder {
    const signedOrder: SignedLimitOrder = {
        // Defaults...
        taker: NULL_ADDRESS,
        feeRecipient: NULL_ADDRESS,
        pool: '0x0000000000000000000000000000000000000000000000000000000000000000',
        ...signedOrderRaw,
        sender: NULL_ADDRESS, // NOTE: Mesh currently only supports orders with sender 0x000...
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
function unmarshallOrders(signedOrdersRaw: any[]): SignedLimitOrder[] {
    return signedOrdersRaw.map(signedOrderRaw => {
        return unmarshallOrder(signedOrderRaw);
    });
}
