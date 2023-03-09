// tslint:disable:max-file-line-count
import { MarketOperation } from '@0x/types';
import { BigNumber } from '@0x/utils';
import * as express from 'express';
import * as HttpStatus from 'http-status-codes';
import { Counter } from 'prom-client';

import { Integrator } from '../config';
import { logger } from '../logger';
import { V4RFQIndicativeQuoteMM } from '../quoteRequestor/QuoteRequestor';
import { RfqtService } from '../services/RfqtService';
import { FirmQuoteContext, IndicativeQuoteContext, QuoteContext } from '../services/types';
import type { RfqtV2Price, RfqtV2Quote, RfqtV2Request, SignedNativeOrder } from '../core/types';
import { ConfigManager } from '../utils/config_manager';
import { RfqtServices } from '../utils/rfqtServiceBuilder';
import type { AltRfqMakerAssetOfferings } from '../quoteRequestor/altMmTypes';

const RFQT_V1_PRICE_REQUEST_SUCCEEDED = new Counter({
    name: 'rfqt_v1_price_request_succeeded_total',
    help: 'Request made to fetch rfqt v1 price succeeded',
});

const RFQT_V1_PRICE_REQUEST_FAILED = new Counter({
    name: 'rfqt_v1_price_request_failed_total',
    help: 'Request made to fetch rfqt v1 price failed',
});

const RFQT_V1_QUOTE_REQUEST_SUCCEEDED = new Counter({
    name: 'rfqt_v1_quote_request_succeeded_total',
    help: 'Request to fetch rfqt v1 quote succeeded',
});

const RFQT_V1_QUOTE_REQUEST_FAILED = new Counter({
    name: 'rfqt_v1_quote_request_failed_total',
    help: 'Request to fetch rfqt v1 quote failed',
});

const RFQT_V2_PRICE_REQUEST_SUCCEEDED = new Counter({
    name: 'rfqt_v2_price_request_succeeded_total',
    help: 'Request made to fetch rfqt v2 price succeeded',
});

const RFQT_V2_PRICE_REQUEST_FAILED = new Counter({
    name: 'rfqt_v2_price_request_failed_total',
    help: 'Request made to fetch rfqt v2 price failed',
});

const RFQT_V2_QUOTE_REQUEST_SUCCEEDED = new Counter({
    name: 'rfqt_v2_quote_request_succeeded_total',
    help: 'Request to fetch rfqt v2 quote succeeded',
});

const RFQT_V2_QUOTE_REQUEST_FAILED = new Counter({
    name: 'rfqt_v2_quote_request_failed_total',
    help: 'Request to fetch rfqt v2 quote failed',
});

/**
 * Typed parameters for both the V1 prices endpoint
 * and the V1 quotes endpoint
 */
interface V1RequestParameters {
    altRfqAssetOfferings: AltRfqMakerAssetOfferings;
    assetFillAmount: BigNumber;
    chainId: number;
    comparisonPrice: BigNumber | undefined;
    makerToken: string;
    marketOperation: MarketOperation;
    takerAddress: string; // expect this to be NULL_ADDRESS
    takerToken: string;
    txOrigin?: string; // expect this to be the taker address, can be missing for /price but not /quote
    intentOnFilling: boolean;
    integratorId: string;
}

interface TypedRequest<TBody> extends express.Request {
    body: TBody;
}

/**
 * Handles parsing the request from RFQt routes, meters calls with prometheus counters,
 * calls the appropriate service method and returns the result.
 *
 * Error boundary for http calls; all errors should be caught and returned to the
 * caller as part of the response.
 */
export class RfqtHandlers {
    constructor(private readonly _rfqtServices: RfqtServices, private readonly _configManager: ConfigManager) {}

    /**
     * Gets prices ("indicative quotes") for the given asset pair from market makers
     * operating on the `RfqOrder` RFQt platform
     */
    public async getV1PricesAsync(
        req: TypedRequest<V1RequestParameters>,
        // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        res: express.Response<{ prices: V4RFQIndicativeQuoteMM[] } | { error: any }>,
    ): Promise<void> {
        let parsedParameters: Omit<V1RequestParameters, 'integratorId'> & { integrator: Integrator };
        let service: RfqtService;
        try {
            parsedParameters = this._parseV1RequestParameters(req);
            service = this._getServiceForChain(parsedParameters.chainId);
        } catch (error) {
            RFQT_V1_PRICE_REQUEST_FAILED.inc();
            logger.error({ error: error.message }, 'Rfqt V1 price request failed');
            res.status(HttpStatus.BAD_REQUEST).json({ error: error.message });
            return;
        }

        try {
            const prices = await service.getV1PricesAsync(parsedParameters);
            RFQT_V1_PRICE_REQUEST_SUCCEEDED.inc();
            logger.info('Rfqt V1 price request succeeded');
            res.status(HttpStatus.OK).json({
                prices,
            });
        } catch (error) {
            RFQT_V1_PRICE_REQUEST_FAILED.inc();
            logger.error({ error: error.message }, 'Rfqt V1 price request failed');
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
        }
    }

    /**
     * Gets prices ("firm quotes") for the given asset pair from market makers
     * operating on the `RfqOrder` RFQt platform
     */
    public async getV1QuotesAsync(
        req: TypedRequest<V1RequestParameters>,
        // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        res: express.Response<{ quotes: SignedNativeOrder[] } | { error: any }>,
    ): Promise<void> {
        let parsedParameters: Omit<V1RequestParameters, 'integratorId'> & { integrator: Integrator };
        let service: RfqtService;
        let txOrigin: string;
        try {
            parsedParameters = this._parseV1RequestParameters(req);
            if (parsedParameters.txOrigin === undefined) {
                throw new Error('Received request with missing parameter txOrigin');
            }
            txOrigin = parsedParameters.txOrigin;
            service = this._getServiceForChain(parsedParameters.chainId);
        } catch (error) {
            RFQT_V1_QUOTE_REQUEST_FAILED.inc();
            logger.error({ error }, 'Rfqt V1 quote request failed');
            res.status(HttpStatus.BAD_REQUEST).json({ error });
            return;
        }

        try {
            const quotes = await service.getV1QuotesAsync({
                ...parsedParameters,
                txOrigin,
            });
            RFQT_V1_QUOTE_REQUEST_SUCCEEDED.inc();
            logger.info('Rfqt V1 quote request succeeded');
            res.status(HttpStatus.OK).json({
                quotes,
            });
        } catch (error) {
            RFQT_V1_QUOTE_REQUEST_FAILED.inc();
            logger.error({ error }, 'Rfqt V1 quote request failed');
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
        }
    }

    /**
     * Gets prices ("indicative quotes") for the given asset pair from market makers
     * operating on the `OtcOrder` RFQt platform
     */
    public async getV2PricesAsync(
        req: TypedRequest<RfqtV2Request>,
        // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        res: express.Response<{ prices: RfqtV2Price[] } | { error: any }>,
    ): Promise<void> {
        let quoteContext: QuoteContext;
        let service: RfqtService;
        try {
            const chainId = this._extractChainId(req);
            service = this._getServiceForChain(chainId);
            quoteContext = await this._extractQuoteContextAsync(req, chainId, false, service);
        } catch (error) {
            RFQT_V2_PRICE_REQUEST_FAILED.inc();
            logger.error({ error: error.message }, 'Rfqt V2 price request failed');
            res.status(HttpStatus.BAD_REQUEST).json({ error: error.message });
            return;
        }

        try {
            const prices = await service.getV2PricesAsync(quoteContext);
            RFQT_V2_PRICE_REQUEST_SUCCEEDED.inc();
            logger.info('Rfqt V2 price request succeeded');
            res.status(HttpStatus.OK).json({
                prices,
            });
        } catch (error) {
            RFQT_V2_PRICE_REQUEST_FAILED.inc();
            logger.error({ error: error.message }, 'Rfqt V2 price request failed');
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
        }
    }

    /**
     * Gets quotes ("firm quotes") for the given asset pair from market makers
     * operating on the `OtcOrder` RFQt platform
     */
    public async getV2QuotesAsync(
        req: TypedRequest<RfqtV2Request>,
        // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        res: express.Response<{ quotes: RfqtV2Quote[] } | { error: any }>,
    ): Promise<void> {
        let quoteContext: FirmQuoteContext;
        let service: RfqtService;
        try {
            const chainId = this._extractChainId(req);
            service = this._getServiceForChain(chainId);
            quoteContext = (await this._extractQuoteContextAsync(req, chainId, true, service)) as FirmQuoteContext;
        } catch (error) {
            RFQT_V2_QUOTE_REQUEST_FAILED.inc();
            logger.error({ error }, 'Rfqt V2 quote request failed');
            res.status(HttpStatus.BAD_REQUEST).json({ error });
            return;
        }

        try {
            const quotes = await service.getV2QuotesAsync(quoteContext);
            RFQT_V2_QUOTE_REQUEST_SUCCEEDED.inc();
            logger.info('Rfqt V2 quote request succeeded');
            res.status(HttpStatus.OK).json({
                quotes,
            });
        } catch (error) {
            RFQT_V2_QUOTE_REQUEST_FAILED.inc();
            logger.error({ error }, 'Rfqt V2 quote request failed');
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
        }
    }

    /**
     * Parses and runtime-checks request parameters. After running the method, the parameters
     * should match their TypeScript types.
     */
    private _parseV1RequestParameters<TRequest extends TypedRequest<V1RequestParameters>>(
        request: TRequest,
    ): V1RequestParameters & { integrator: Integrator } {
        const { body } = request;

        // Doing this before destructuring the body, otherwise the error
        // thrown will be something like:
        // 'Cannot destructure property 'altRfqAssetOfferings' of 'request.body' as it is undefined.'
        if (
            !body.altRfqAssetOfferings ||
            !body.assetFillAmount ||
            !body.makerToken ||
            !body.marketOperation ||
            !body.takerToken ||
            !body.takerAddress ||
            typeof body.intentOnFilling !== 'boolean' ||
            !body.integratorId
        ) {
            throw new Error('Received request with missing parameters');
        }

        const { assetFillAmount, comparisonPrice, marketOperation, integratorId } = request.body;

        const parsedChainId = this._extractChainId(request);
        if (Number.isNaN(parsedChainId)) {
            throw new Error('Chain ID is invalid');
        }

        if (
            (marketOperation as string) !== MarketOperation.Buy.toString() &&
            (marketOperation as string) !== MarketOperation.Sell.toString()
        ) {
            throw new Error('Received request with invalid market operation');
        }

        let integrator: Integrator;
        try {
            integrator = this._configManager.getIntegratorByIdOrThrow(integratorId);
        } catch (error) {
            throw new Error('No integrator found for integrator ID');
        }

        return {
            ...request.body,
            assetFillAmount: new BigNumber(assetFillAmount),
            chainId: parsedChainId,
            comparisonPrice: comparisonPrice ? new BigNumber(comparisonPrice) : undefined,
            integrator,
        };
    }

    /**
     * Extract chainId from request parameters.
     */
    private _extractChainId<TRequest extends TypedRequest<RfqtV2Request>>(request: TRequest): number {
        const chainIdFromHeader = request.header('0x-chain-id');
        if (chainIdFromHeader === undefined) {
            throw new Error('Chain ID is not provided');
        } else {
            const parsedChainId = parseInt(chainIdFromHeader, 10);
            if (Number.isNaN(parsedChainId)) {
                throw new Error('Chain ID is invalid');
            }
            return parsedChainId;
        }
    }

    /**
     * Extract quote context from request parameters. After running the method, the parameters
     * should match their TypeScript types.
     */
    private async _extractQuoteContextAsync<TRequest extends TypedRequest<RfqtV2Request>>(
        request: TRequest,
        chainId: number,
        isFirm: boolean,
        service: RfqtService,
    ): Promise<QuoteContext> {
        const { body } = request;

        // Doing this before destructuring the body, otherwise the error
        // thrown will be something like:
        // 'Cannot destructure property 'assetFillAmount' of 'request.body' as it is undefined.'
        if (
            !body.assetFillAmount ||
            !body.makerToken ||
            !body.marketOperation ||
            !body.takerToken ||
            !body.takerAddress ||
            // TODO: add body.trader to these checks once we've rolled out completely
            typeof body.intentOnFilling !== 'boolean' ||
            !body.integratorId
        ) {
            throw new Error('Received request with missing parameters');
        }

        const {
            takerToken,
            makerToken,
            trader,
            gasless,
            takerAddress,
            txOrigin,
            assetFillAmount: assetFillAmountStr,
            marketOperation,
            integratorId,
            bucket,
        } = request.body;

        if (
            (marketOperation as string) !== MarketOperation.Buy.toString() &&
            (marketOperation as string) !== MarketOperation.Sell.toString()
        ) {
            throw new Error('Received request with invalid market operation');
        }

        let integrator: Integrator;
        try {
            integrator = this._configManager.getIntegratorByIdOrThrow(integratorId);
        } catch (error) {
            throw new Error('No integrator found for integrator ID');
        }

        if (isFirm && txOrigin === undefined) {
            throw new Error('Received request with missing parameter txOrigin');
        }

        const isSelling = (marketOperation as string) === MarketOperation.Sell.toString();
        const assetFillAmount = new BigNumber(assetFillAmountStr);
        let takerAmount, makerAmount;
        if (isSelling) {
            takerAmount = assetFillAmount;
        } else {
            makerAmount = assetFillAmount;
        }
        const takerTokenDecimals = await service.getTokenDecimalsAsync(takerToken);
        const makerTokenDecimals = await service.getTokenDecimalsAsync(makerToken);
        const volumeUSD = await service.getVolumeUSDAsync({
            tokenAddress: isSelling ? takerToken : makerToken,
            tokenDecimals: isSelling ? takerTokenDecimals : makerTokenDecimals,
            amount: assetFillAmount,
        });

        // Return the QuoteContext
        const quoteContextBase = {
            chainId,
            takerToken,
            makerToken,
            originalMakerToken: makerToken,
            trader: trader || takerAddress, // TODO: remove the takerAddress fallback once we've rolled out completely
            takerAddress,
            txOrigin,
            takerAmount,
            makerAmount,
            takerTokenDecimals,
            makerTokenDecimals,
            integrator,
            isUnwrap: false,
            isSelling,
            assetFillAmount,
            feeModelVersion: service.feeModelVersion,
            bucket,
            volumeUSD,
        };
        if (isFirm === true) {
            if (!txOrigin) {
                throw new Error('Received firm quote request with missing parameter txOrigin');
            }
            const firmResult: FirmQuoteContext = {
                ...quoteContextBase,
                isFirm: true,
                txOrigin,
                workflow: gasless ? 'gasless-rfqt' : 'rfqt',
            };
            return firmResult;
        } else {
            // isFirm === false (indicating indicative quote)
            const indicativeResult: IndicativeQuoteContext = {
                ...quoteContextBase,
                isFirm: false,
                workflow: gasless ? 'gasless-rfqt' : 'rfqt',
            };
            return indicativeResult;
        }
    }

    /**
     * Gets the appropriate `RfqtService` instance from the
     * Chain ID -> Rfqt Service Map. Throws if no service is found
     * for `chainId`.
     */
    private _getServiceForChain(chainId: number): RfqtService {
        const service = this._rfqtServices.get(chainId);

        if (!service) {
            throw new Error('No configuration exists for chain');
        }
        return service;
    }
}
