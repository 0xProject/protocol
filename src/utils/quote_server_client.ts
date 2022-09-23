import { MarketOperation } from '@0x/asset-swapper/lib/src/types';
import { SchemaValidator } from '@0x/json-schemas';
import { Signature } from '@0x/protocol-utils';
import { schemas as quoteServerSchemas } from '@0x/quote-server';
import { Fee, SignRequest } from '@0x/quote-server/lib/src/types';
import { BigNumber } from '@0x/utils';
import { AxiosInstance } from 'axios';
import { OK } from 'http-status-codes';
import * as _ from 'lodash';
import { Summary } from 'prom-client';
import * as uuid from 'uuid';

import { Integrator, RFQ_PRICE_ENDPOINT_TIMEOUT_MS, RFQ_SIGN_ENDPOINT_TIMEOUT_MS } from '../config';
import { logger } from '../logger';
import { schemas } from '../schemas';
import { IndicativeQuote, QuoteServerPriceParams } from '../types';

const MARKET_MAKER_SIGN_LATENCY = new Summary({
    name: 'market_maker_sign_latency',
    help: 'Latency for sign request to Market Makers',
    labelNames: ['makerUri', 'statusCode'],
});

const RFQ_MARKET_MAKER_PRICE_REQUEST_DURATION_SECONDS = new Summary({
    name: 'rfq_market_maker_price_request_duration_seconds',
    help: 'Provides stats around market maker network interactions',
    percentiles: [0.5, 0.9, 0.95, 0.99, 0.999], // tslint:disable-line: custom-no-magic-numbers
    labelNames: ['type', 'integratorLabel', 'makerUri', 'chainId', 'statusCode', 'market'],
    maxAgeSeconds: 60,
    ageBuckets: 5,
});

const KNOWN_TOKENS: { [key: string]: string } = {
    // Mainnet
    '0x6b175474e89094c44da98b954eedeac495271d0f': 'DAI',
    '0xdac17f958d2ee523a2206206994597c13d831ec7': 'USDT',
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'USDC',
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'WETH',
    // Polygon
    '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063': 'DAI',
    '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': 'USDT',
    '0x2791bca1f2de4661ed88a30c99a7a9449aa84174': 'USDC',
    '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619': 'WETH',
    '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270': 'WMATIC',
};

/**
 * [Read this in Daniel's voice] Returns a human-readable label for Prometheus counters.
 * Only popular most relevant pairs should be displayed in Prometheus (since it overload the service)
 * and any other market that does not contain popular pairs will simply return "Other".
 *
 * @param tokenSold the token being sold
 * @param tokenPurchased the token being purchased
 * @returns a market like "WETH-DAI", or "Other" is a pair is unknown
 */
function getMarketLabel(tokenSold: string, tokenPurchased: string): string {
    const items = [tokenSold.toLowerCase(), tokenPurchased.toLowerCase()];
    items.sort();

    const tokenA: string | undefined = KNOWN_TOKENS[items[0]];
    const tokenB: string | undefined = KNOWN_TOKENS[items[1]];
    if (!tokenA || !tokenB) {
        return 'Other';
    }
    return `${tokenA}-${tokenB}`;
}

const schemaValidator = new SchemaValidator();
schemaValidator.addSchema(quoteServerSchemas.feeSchema);
schemaValidator.addSchema(quoteServerSchemas.submitRequestSchema);
schemaValidator.addSchema(quoteServerSchemas.submitReceiptSchema);
schemaValidator.addSchema(quoteServerSchemas.otcQuoteResponseSchema);

export class QuoteServerClient {
    /**
     * Prepares the query parameters (copied from QuoteRequestor)
     */
    public static makeQueryParameters(input: {
        chainId?: number;
        txOrigin: string;
        takerAddress: string;
        marketOperation: MarketOperation;
        buyTokenAddress: string; // maker token
        sellTokenAddress: string; // taker token
        assetFillAmount: BigNumber;
        comparisonPrice?: BigNumber;
        isLastLook?: boolean | undefined;
        fee?: Fee | undefined;
    }): QuoteServerPriceParams {
        const {
            chainId,
            txOrigin,
            takerAddress,
            marketOperation,
            buyTokenAddress,
            sellTokenAddress,
            assetFillAmount,
            comparisonPrice,
            isLastLook,
            fee,
        } = input;
        const { buyAmountBaseUnits, sellAmountBaseUnits } =
            marketOperation === MarketOperation.Buy
                ? {
                      buyAmountBaseUnits: assetFillAmount,
                      sellAmountBaseUnits: undefined,
                  }
                : {
                      sellAmountBaseUnits: assetFillAmount,
                      buyAmountBaseUnits: undefined,
                  };

        const requestParamsWithBigNumbers: Pick<
            QuoteServerPriceParams,
            | 'chainId'
            | 'txOrigin'
            | 'takerAddress'
            | 'buyTokenAddress'
            | 'sellTokenAddress'
            | 'comparisonPrice'
            | 'isLastLook'
            | 'protocolVersion'
            | 'feeAmount'
            | 'feeToken'
            | 'feeType'
        > = {
            txOrigin,
            takerAddress,
            buyTokenAddress,
            sellTokenAddress,
            protocolVersion: '4',
        };

        if (comparisonPrice) {
            requestParamsWithBigNumbers.comparisonPrice = comparisonPrice.toString();
        }

        if (isLastLook) {
            if (fee === undefined) {
                throw new Error(`isLastLook cannot be passed without a fee parameter`);
            }
            requestParamsWithBigNumbers.isLastLook = isLastLook.toString();
        }

        if (fee) {
            requestParamsWithBigNumbers.feeAmount = fee.amount.toString();
            requestParamsWithBigNumbers.feeToken = fee.token;
            requestParamsWithBigNumbers.feeType = fee.type;
        }

        if (chainId) {
            requestParamsWithBigNumbers.chainId = String(chainId);
        }

        // convert BigNumbers to strings so they are digestible by axios
        if (sellAmountBaseUnits) {
            return {
                ...requestParamsWithBigNumbers,
                sellAmountBaseUnits: sellAmountBaseUnits.toString(),
            };
        } else if (buyAmountBaseUnits) {
            return {
                ...requestParamsWithBigNumbers,
                buyAmountBaseUnits: buyAmountBaseUnits.toString(),
            };
        } else {
            throw new Error('Neither "buyAmountBaseUnits" or "sellAmountBaseUnits" were defined');
        }
    }

    constructor(private readonly _axiosInstance: AxiosInstance) {}

    /**
     * Fetch a price (indicative quote)
     *
     * @param makerUri - the maker URI
     * @param integrator - the integrator
     * @param parameters - the query parameters (created via {@link QuoteServerClient.makeQueryParameters} )
     * @param makerUriToUrl - function to transform the maker URI into its `price` endpoint
     * @returns - a Promise containing the indicative quote if available, else undefined
     * @throws - Will throw an error if a 4xx or 5xx is returned
     */
    public async getPriceV2Async(
        makerUri: string,
        integrator: Integrator,
        parameters: QuoteServerPriceParams,
        makerUriToUrl: (u: string) => string,
    ): Promise<IndicativeQuote | undefined> {
        const timerStopFn = RFQ_MARKET_MAKER_PRICE_REQUEST_DURATION_SECONDS.startTimer();
        const response = await this._axiosInstance.get(makerUriToUrl(makerUri), {
            timeout: RFQ_PRICE_ENDPOINT_TIMEOUT_MS,
            validateStatus: () => true, // Don't throw errors on 4xx or 5xx
            headers: {
                '0x-request-uuid': uuid.v4(),
                '0x-integrator-id': integrator.integratorId,
                '0x-api-key': integrator.integratorId,
            },
            params: parameters,
        });

        timerStopFn({
            type: makerUriToUrl(''), // HACK - used to distinguish between RFQm and RFQt
            integratorLabel: integrator.label,
            makerUri,
            chainId: parameters.chainId,
            statusCode: response.status,
            market: getMarketLabel(parameters.sellTokenAddress, parameters.buyTokenAddress),
        });

        // Empty response from MM (not 200, no data, or empty object)
        if (response.status !== OK || !response.data || Object.keys(response.data).length === 0) {
            return;
        }

        const validationResult = schemaValidator.validate(response.data, schemas.indicativeOtcQuoteResponseSchema);
        if (validationResult.errors && validationResult.errors.length > 0) {
            const errorsMsg = validationResult.errors.map((err) => err.message).join(',');
            throw new Error(`Error from validator: ${errorsMsg}`);
        }

        return {
            expiry: new BigNumber(response.data.expiry),
            maker: response.data.maker,
            makerAmount: new BigNumber(response.data.makerAmount),
            makerToken: response.data.makerToken,
            makerUri,
            takerAmount: new BigNumber(response.data.takerAmount),
            takerToken: response.data.takerToken,
        };
    }

    /**
     * Fetch a batch of prices. Ignores all quotes that return errors
     *
     * @param makerUris - a list of maker URIs
     * @param integrator - the integrator
     * @param parameters - the query parameters (created via {@link QuoteServerClient.makeQueryParameters} )
     * @param makerUriToUrl - function to transform the maker URI into its `price` endpoint
     * @returns - a Promise containing a list of indicative quotes
     */
    public async batchGetPriceV2Async(
        makerUris: string[],
        integrator: Integrator,
        parameters: QuoteServerPriceParams,
        makerUriToUrl: (u: string) => string = (u: string) => `${u}/rfqm/v2/price`,
    ): Promise<IndicativeQuote[]> {
        return Promise.all(
            makerUris.map(async (makerUri) => {
                return this.getPriceV2Async(makerUri, integrator, parameters, makerUriToUrl).catch((err) => {
                    logger.error(
                        {
                            errorMessage: err?.message,
                            makerUri,
                            status: err?.response?.status ?? 'unknown',
                        },
                        'Encountered an error requesting an indicative quote',
                    );
                    return undefined;
                });
            }),
        ).then((arr) => arr.filter((result): result is IndicativeQuote => result !== undefined));
    }

    /**
     * Request a signature from a MM for a given OtcOrder
     *
     * @param makerUri - the MM's uri
     * @param integratorId - the integrator id
     * @param payload - the payload of the request. RFQm transactions require
     *   `takerSignature` to be present, while `takerSignature` will not be
     *   present for RFQt transactions.
     * @param requireProceedWithFill - whether or not to require the response
     *  to include a `proceedWithFill` field. This field is specific to RFQm
     *  and isn't required for an RFQt sign request.
     * @param makerUriToUrl - function to transform the maker URI into its `sign` endpoint
     * @returns - The signature if successful, undefined otherwise
     * @throws - Will throw an error if a 4xx or 5xx is returned
     */
    public async signV2Async(
        makerUri: string,
        integratorId: string,
        payload: Omit<SignRequest, 'takerSignature'> & Pick<Partial<SignRequest>, 'takerSignature'>,
        makerUriToUrl: (u: string) => string = (u: string) => `${u}/rfqm/v2/sign`,
        requireProceedWithFill: boolean = true,
    ): Promise<Signature | undefined> {
        const timerStopFn = MARKET_MAKER_SIGN_LATENCY.startTimer();
        const requestUuid = uuid.v4();
        const rawResponse = await this._axiosInstance.post(
            makerUriToUrl(makerUri),
            {
                order: payload.order,
                orderHash: payload.orderHash,
                expiry: payload.expiry,
                takerSignature: payload.takerSignature,
                feeToken: payload.fee.token,
                feeAmount: payload.fee.amount,
            },
            {
                timeout: RFQ_SIGN_ENDPOINT_TIMEOUT_MS,
                headers: {
                    '0x-api-key': integratorId,
                    '0x-integrator-id': integratorId,
                    '0x-request-uuid': requestUuid,
                    'Content-Type': 'application/json',
                },
                validateStatus: () => true, // Don't throw errors on 4xx or 5xx
            },
        );
        logger.info(
            {
                makerUri,
                requestUuid,
                status: rawResponse.status,
            },
            'Sign response received from MM',
        );
        timerStopFn({
            makerUri,
            statusCode: rawResponse.status,
        });

        // TODO (rhinodavid): Filter out non-successful statuses from validation step

        const validationResult = schemaValidator.validate(rawResponse.data, schemas.signResponseSchema);
        if (validationResult.errors && validationResult.errors.length > 0) {
            const errorsMsg = validationResult.errors.map((err) => err.message).join(',');
            logger.error(
                { response: rawResponse.data, makerUri, status: rawResponse.status },
                'Malformed sign response',
            );
            throw new Error(`Error from validator: ${errorsMsg}`);
        }

        const proceedWithFill = rawResponse.data?.proceedWithFill as boolean | undefined;
        const makerSignature: Signature | undefined = rawResponse.data?.makerSignature;
        const feeAmount = new BigNumber(rawResponse.data?.feeAmount);

        if (!proceedWithFill && requireProceedWithFill) {
            logger.info({ makerUri }, 'Sign request rejected');
            return undefined;
        }

        if (!feeAmount.gte(payload.fee.amount)) {
            logger.warn(
                { requestFeeAmount: payload.fee.amount, responseFeeAmount: feeAmount, makerUri },
                'Invalid fee acknowledgement',
            );
            return undefined;
        }

        if (makerSignature === undefined) {
            logger.warn({ makerUri }, 'Signature is missing');
            return undefined;
        }

        return makerSignature;
    }
}
