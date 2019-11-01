import { assetDataUtils, BigNumber, SignedOrder } from '0x.js';
import { schemas } from '@0x/json-schemas';
import * as express from 'express';
import * as HttpStatus from 'http-status-codes';
import * as _ from 'lodash';

import { FEE_RECIPIENT_ADDRESS, WHITELISTED_TOKENS } from '../config';
import { NotFoundError, ValidationError, ValidationErrorCodes } from '../errors';
import { OrderBookService } from '../services/orderbook_service';
import { orderUtils } from '../utils/order_utils';
import { paginationUtils } from '../utils/pagination_utils';
import { utils } from '../utils/utils';

export class MeshGatewayHandlers {
    private readonly _orderBook: OrderBookService;
    public static feeRecipients(req: express.Request, res: express.Response): void {
        const { page, perPage } = paginationUtils.parsePaginationConfig(req);
        const normalizedFeeRecipient = FEE_RECIPIENT_ADDRESS.toLowerCase();
        const feeRecipients = [normalizedFeeRecipient];
        const paginatedFeeRecipients = paginationUtils.paginate(feeRecipients, page, perPage);
        res.status(HttpStatus.OK).send(paginatedFeeRecipients);
    }
    public static orderConfig(req: express.Request, res: express.Response): void {
        utils.validateSchema(req.body, schemas.orderConfigRequestSchema);
        const orderConfigResponse = orderUtils.getOrderConfig(req.body);
        res.status(HttpStatus.OK).send(orderConfigResponse);
    }
    public static async assetPairsAsync(req: express.Request, res: express.Response): Promise<void> {
        utils.validateSchema(req.query, schemas.assetPairsRequestOptsSchema);
        const { page, perPage } = paginationUtils.parsePaginationConfig(req);
        const assetPairs = await OrderBookService.getAssetPairsAsync(
            page,
            perPage,
            req.query.assetDataA,
            req.query.assetDataB,
        );
        res.status(HttpStatus.OK).send(assetPairs);
    }
    public static async getOrderByHashAsync(req: express.Request, res: express.Response): Promise<void> {
        const orderIfExists = await OrderBookService.getOrderByHashIfExistsAsync(req.params.orderHash);
        if (orderIfExists === undefined) {
            throw new NotFoundError();
        } else {
            res.status(HttpStatus.OK).send(orderIfExists);
        }
    }
    constructor(orderBook: OrderBookService) {
        this._orderBook = orderBook;
    }
    public async ordersAsync(req: express.Request, res: express.Response): Promise<void> {
        utils.validateSchema(req.query, schemas.ordersRequestOptsSchema);
        const { page, perPage } = paginationUtils.parsePaginationConfig(req);
        const paginatedOrders = await this._orderBook.getOrdersAsync(page, perPage, req.query);
        res.status(HttpStatus.OK).send(paginatedOrders);
    }
    public async orderbookAsync(req: express.Request, res: express.Response): Promise<void> {
        utils.validateSchema(req.query, schemas.orderBookRequestSchema);
        const { page, perPage } = paginationUtils.parsePaginationConfig(req);
        const baseAssetData = req.query.baseAssetData;
        const quoteAssetData = req.query.quoteAssetData;
        const orderbookResponse = await this._orderBook.getOrderBookAsync(page, perPage, baseAssetData, quoteAssetData);
        res.status(HttpStatus.OK).send(orderbookResponse);
    }
    public async postOrderAsync(req: express.Request, res: express.Response): Promise<void> {
        utils.validateSchema(req.body, schemas.signedOrderSchema);
        const signedOrder = unmarshallOrder(req.body);
        if (WHITELISTED_TOKENS !== '*') {
            const allowedTokens: string[] = WHITELISTED_TOKENS;
            validateAssetDataIsWhitelistedOrThrow(allowedTokens, signedOrder.makerAssetData, 'makerAssetData');
            validateAssetDataIsWhitelistedOrThrow(allowedTokens, signedOrder.takerAssetData, 'takerAssetData');
        }
        await this._orderBook.addOrderAsync(signedOrder);
        res.status(HttpStatus.OK).send();
    }
}

function validateAssetDataIsWhitelistedOrThrow(allowedTokens: string[], assetData: string, field: string): void {
    const decodedAssetData = assetDataUtils.decodeAssetDataOrThrow(assetData);
    if (assetDataUtils.isMultiAssetData(decodedAssetData)) {
        for (const [, nestedAssetDataElement] of decodedAssetData.nestedAssetData.entries()) {
            validateAssetDataIsWhitelistedOrThrow(allowedTokens, nestedAssetDataElement, field);
        }
    } else if (!assetDataUtils.isStaticCallAssetData(decodedAssetData)) {
        if (!_.includes(allowedTokens, decodedAssetData.tokenAddress)) {
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

// As the orders come in as JSON they need to be turned into the correct types such as BigNumber
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
