import { schemas } from '@0x/json-schemas';
import { assetDataUtils, SignedOrder } from '@0x/order-utils';
import { BigNumber } from '@0x/utils';
import * as express from 'express';
import * as HttpStatus from 'http-status-codes';

import { FEE_RECIPIENT_ADDRESS, WHITELISTED_TOKENS } from '../config';
import { SRA_DOCS_URL } from '../constants';
import { NotFoundError, ValidationError, ValidationErrorCodes } from '../errors';
import { schemas as apiSchemas } from '../schemas/schemas';
import { OrderBookService } from '../services/orderbook_service';
import { orderUtils } from '../utils/order_utils';
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
        schemaUtils.validateSchema(req.body, schemas.orderConfigRequestSchema);
        const orderConfigResponse = orderUtils.getOrderConfig(req.body);
        res.status(HttpStatus.OK).send(orderConfigResponse);
    }
    constructor(orderBook: OrderBookService) {
        this._orderBook = orderBook;
    }
    public async assetPairsAsync(req: express.Request, res: express.Response): Promise<void> {
        schemaUtils.validateSchema(req.query, schemas.assetPairsRequestOptsSchema);
        const { page, perPage } = paginationUtils.parsePaginationConfig(req);
        const assetDataA = req.query.assetDataA as string;
        const assetDataB = req.query.assetDataB as string;
        const assetPairs = await this._orderBook.getAssetPairsAsync(
            page,
            perPage,
            assetDataA && assetDataA.toLowerCase(),
            assetDataB && assetDataB.toLowerCase(),
        );
        res.status(HttpStatus.OK).send(assetPairs);
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
        schemaUtils.validateSchema(req.query, schemas.ordersRequestOptsSchema);
        const { page, perPage } = paginationUtils.parsePaginationConfig(req);
        const paginatedOrders = await this._orderBook.getOrdersAsync(page, perPage, req.query);
        res.status(HttpStatus.OK).send(paginatedOrders);
    }
    public async orderbookAsync(req: express.Request, res: express.Response): Promise<void> {
        schemaUtils.validateSchema(req.query, schemas.orderBookRequestSchema);
        const { page, perPage } = paginationUtils.parsePaginationConfig(req);
        const baseAssetData = (req.query.baseAssetData as string).toLowerCase();
        const quoteAssetData = (req.query.quoteAssetData as string).toLowerCase();
        const orderbookResponse = await this._orderBook.getOrderBookAsync(page, perPage, baseAssetData, quoteAssetData);
        res.status(HttpStatus.OK).send(orderbookResponse);
    }
    public async postOrderAsync(req: express.Request, res: express.Response): Promise<void> {
        schemaUtils.validateSchema(req.body, apiSchemas.sraPostOrderRequestSchema);
        const signedOrder = unmarshallOrder(req.body);
        if (WHITELISTED_TOKENS !== '*') {
            const allowedTokens: string[] = WHITELISTED_TOKENS;
            validateAssetDataIsWhitelistedOrThrow(allowedTokens, signedOrder.makerAssetData, 'makerAssetData');
            validateAssetDataIsWhitelistedOrThrow(allowedTokens, signedOrder.takerAssetData, 'takerAssetData');
        }
        const pinResult = await this._orderBook.splitOrdersByPinningAsync([signedOrder]);
        const isPinned = pinResult.pin.length === 1;
        await this._orderBook.addOrderAsync(signedOrder, isPinned);
        res.status(HttpStatus.OK).send();
    }
    public async postOrdersAsync(req: express.Request, res: express.Response): Promise<void> {
        schemaUtils.validateSchema(req.body, schemas.signedOrdersSchema);
        const signedOrders = unmarshallOrders(req.body);
        if (WHITELISTED_TOKENS !== '*') {
            const allowedTokens: string[] = WHITELISTED_TOKENS;
            for (const signedOrder of signedOrders) {
                validateAssetDataIsWhitelistedOrThrow(allowedTokens, signedOrder.makerAssetData, 'makerAssetData');
                validateAssetDataIsWhitelistedOrThrow(allowedTokens, signedOrder.takerAssetData, 'takerAssetData');
            }
        }
        const pinResult = await this._orderBook.splitOrdersByPinningAsync(signedOrders);
        await Promise.all([
            this._orderBook.addOrdersAsync(pinResult.pin, true),
            this._orderBook.addOrdersAsync(pinResult.doNotPin, false),
        ]);
        res.status(HttpStatus.OK).send();
    }
}

function validateAssetDataIsWhitelistedOrThrow(allowedTokens: string[], assetData: string, field: string): void {
    const decodedAssetData = assetDataUtils.decodeAssetDataOrThrow(assetData);
    if (orderUtils.isMultiAssetData(decodedAssetData)) {
        for (const [, nestedAssetDataElement] of decodedAssetData.nestedAssetData.entries()) {
            validateAssetDataIsWhitelistedOrThrow(allowedTokens, nestedAssetDataElement, field);
        }
    } else if (orderUtils.isTokenAssetData(decodedAssetData)) {
        if (!allowedTokens.includes(decodedAssetData.tokenAddress)) {
            throw new ValidationError([
                {
                    field,
                    code: ValidationErrorCodes.ValueOutOfRange,
                    reason: `${decodedAssetData.tokenAddress} not supported`,
                },
            ]);
        }
    }
}

// As the order come in as JSON they need to be turned into the correct types such as BigNumber
function unmarshallOrder(signedOrderRaw: any): SignedOrder {
    const signedOrder = {
        ...signedOrderRaw,
        salt: new BigNumber(signedOrderRaw.salt),
        makerAssetAmount: new BigNumber(signedOrderRaw.makerAssetAmount),
        takerAssetAmount: new BigNumber(signedOrderRaw.takerAssetAmount),
        makerFee: new BigNumber(signedOrderRaw.makerFee),
        takerFee: new BigNumber(signedOrderRaw.takerFee),
        expirationTimeSeconds: new BigNumber(signedOrderRaw.expirationTimeSeconds),
    };
    return signedOrder;
}

// As the orders come in as JSON they need to be turned into the correct types such as BigNumber
function unmarshallOrders(signedOrdersRaw: any[]): SignedOrder[] {
    return signedOrdersRaw.map(signedOrderRaw => {
        return unmarshallOrder(signedOrderRaw);
    });
}
