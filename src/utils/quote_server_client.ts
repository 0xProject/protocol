import { MarketOperation, V4RFQIndicativeQuote } from '@0x/asset-swapper';
import { SchemaValidator } from '@0x/json-schemas';
import { OtcOrder, Signature } from '@0x/protocol-utils';
import {
    schemas as quoteServerSchemas,
    SignRequest,
    SignResponse,
    SubmitRequest,
    TakerRequestQueryParamsUnnested,
} from '@0x/quote-server';
import { Fee } from '@0x/quote-server/lib/src/types';
import { BigNumber } from '@0x/utils';
import { AxiosInstance } from 'axios';
import { ethers } from 'ethers';
import * as _ from 'lodash';
import { Summary } from 'prom-client';

import { Integrator, RFQT_REQUEST_MAX_RESPONSE_MS } from '../config';
import { ONE_SECOND_MS } from '../constants';
import { logger } from '../logger';
import { schemas } from '../schemas';
import { FirmOtcQuote } from '../types';

import { METRICS_PROXY } from './metrics_service';

const MARKET_MAKER_LAST_LOOK_LATENCY = new Summary({
    name: 'market_maker_last_look_latency',
    help: 'Latency for Last Look request to Market Makers',
    labelNames: ['makerUri'],
});

const MARKET_MAKER_SIGN_LATENCY = new Summary({
    name: 'market_maker_sign_latency',
    help: 'Latency for sign request to Market Makers',
    labelNames: ['makerUri'],
});

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
        txOrigin: string;
        takerAddress: string;
        marketOperation: MarketOperation;
        buyTokenAddress: string; // maker token
        sellTokenAddress: string; // taker token
        assetFillAmount: BigNumber;
        comparisonPrice?: BigNumber;
        isLastLook?: boolean | undefined;
        fee?: Fee | undefined;
        nonce?: number;
        nonceBucket?: number;
    }): TakerRequestQueryParamsUnnested {
        const {
            txOrigin,
            takerAddress,
            marketOperation,
            buyTokenAddress,
            sellTokenAddress,
            assetFillAmount,
            comparisonPrice,
            isLastLook,
            fee,
            nonce,
            nonceBucket,
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
            TakerRequestQueryParamsUnnested,
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
            | 'nonce'
            | 'nonceBucket'
        > = {
            txOrigin,
            takerAddress,
            buyTokenAddress,
            sellTokenAddress,
            comparisonPrice: comparisonPrice === undefined ? undefined : comparisonPrice.toString(),
            protocolVersion: '4',
        };
        if (isLastLook) {
            if (fee === undefined) {
                throw new Error(`isLastLook cannot be passed without a fee parameter`);
            }
            requestParamsWithBigNumbers.isLastLook = isLastLook.toString();
            requestParamsWithBigNumbers.feeAmount = fee.amount.toString();
            requestParamsWithBigNumbers.feeToken = fee.token;
            requestParamsWithBigNumbers.feeType = fee.type;
        }

        if (nonce && nonceBucket) {
            requestParamsWithBigNumbers.nonce = nonce.toString();
            requestParamsWithBigNumbers.nonceBucket = nonceBucket.toString();
        } else {
            const isNoncePresent = nonce !== undefined;
            const isNonceBucketPresent = nonceBucket !== undefined;
            if (isNoncePresent !== isNonceBucketPresent) {
                throw new Error('nonce and nonceBucket must be both present or both absent');
            }
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
     * @returns - a Promise containing the indicative quote if available, else undefined
     * @throws - Will throw an error if a 4xx or 5xx is returned
     */
    public async getPriceV2Async(
        makerUri: string,
        integrator: Integrator,
        parameters: TakerRequestQueryParamsUnnested,
    ): Promise<V4RFQIndicativeQuote | undefined> {
        const startTime = Date.now();
        const response = await this._axiosInstance.get(`${makerUri}/rfqm/v2/price`, {
            timeout: RFQT_REQUEST_MAX_RESPONSE_MS,
            headers: {
                '0x-integrator-id': integrator.integratorId,
                '0x-api-key': integrator.integratorId,
            },
            params: parameters,
        });
        const latencyMs = Date.now() - startTime;
        METRICS_PROXY.logRfqMakerNetworkInteraction({
            isLastLook: parameters.isLastLook === 'true',
            integrator,
            url: makerUri,
            quoteType: 'indicative',
            statusCode: response.status,
            latencyMs,
            included: true,
            sellTokenAddress: parameters.sellTokenAddress,
            buyTokenAddress: parameters.buyTokenAddress,
        });

        const validationResult = schemaValidator.validate(response.data, schemas.indicativeQuoteResponseSchema);
        if (validationResult.errors && validationResult.errors.length > 0) {
            const errorsMsg = validationResult.errors.map((err) => err.toString()).join(',');
            throw new Error(`Error from validator: ${errorsMsg}`);
        }

        return {
            makerAmount: new BigNumber(response.data.makerAmount),
            takerAmount: new BigNumber(response.data.takerAmount),
            makerToken: response.data.makerToken,
            takerToken: response.data.takerToken,
            expiry: new BigNumber(response.data.expiry),
        };
    }

    /**
     * Fetch a batch of prices. Ignores all quotes that return errors
     *
     * @param makerUris - a list of maker URIs
     * @param integrator - the integrator
     * @param parameters - the query parameters (created via {@link QuoteServerClient.makeQueryParameters} )
     * @returns - a Promise containing a list of indicative quotes
     */
    public async batchGetPriceV2Async(
        makerUris: string[],
        integrator: Integrator,
        parameters: TakerRequestQueryParamsUnnested,
    ): Promise<V4RFQIndicativeQuote[]> {
        return Promise.all(
            makerUris.map(async (uri) => {
                return this.getPriceV2Async(uri, integrator, parameters).catch((err) => {
                    logger.error(
                        {
                            errorMessage: err?.message,
                            makerUri: uri,
                            status: err?.isAxiosError ? err.response.status : undefined,
                        },
                        'Encountered an error requesting an indicative quote',
                    );
                    return undefined;
                });
            }),
        ).then((arr) => arr.filter((result): result is V4RFQIndicativeQuote => result !== undefined));
    }

    /**
     * Fetch a quote (firm quote)
     *
     * @param makerUri - the maker URI
     * @param integrator - the integrator
     * @param parameters - the query parameters (created via {@link QuoteServerClient.makeQueryParameters} )
     * @returns - a Promise containing the firm quote if available, else undefined
     * @throws - Will throw an error if a 4xx or 5xx is returned
     */
    public async getQuoteV2Async(
        makerUri: string,
        integrator: Integrator,
        parameters: TakerRequestQueryParamsUnnested,
    ): Promise<FirmOtcQuote | undefined> {
        const startTime = Date.now();
        const response = await this._axiosInstance.get(`${makerUri}/rfqm/v2/quote`, {
            timeout: RFQT_REQUEST_MAX_RESPONSE_MS,
            headers: {
                '0x-integrator-id': integrator.integratorId,
                '0x-api-key': integrator.integratorId,
            },
            params: parameters,
        });
        const latencyMs = Date.now() - startTime;
        METRICS_PROXY.logRfqMakerNetworkInteraction({
            isLastLook: parameters.isLastLook === 'true',
            integrator,
            url: makerUri,
            quoteType: 'firm',
            statusCode: response.status,
            latencyMs,
            included: true,
            sellTokenAddress: parameters.sellTokenAddress,
            buyTokenAddress: parameters.buyTokenAddress,
        });

        const validationResult = schemaValidator.validate(response.data, quoteServerSchemas.otcQuoteResponseSchema);
        if (validationResult.errors && validationResult.errors.length > 0) {
            const errorsMsg = validationResult.errors.map((err) => JSON.stringify(err)).join(',');
            throw new Error(`Error from validator: ${errorsMsg}`);
        }

        const order = response.data.order;
        return {
            order: new OtcOrder({
                ...order,
                expiryAndNonce: new BigNumber(order.expiryAndNonce),
                makerAmount: new BigNumber(order.makerAmount),
                takerAmount: new BigNumber(order.takerAmount),
                chainId: parseInt(order.chainId, 10),
            }),
            kind: 'otc',
            makerSignature: response.data.signature ? response.data.signature : undefined,
            makerUri,
        };
    }

    /**
     * Fetch a batch of quotes. Ignores all quotes that return errors
     *
     * @param makerUris - a list of maker URIs
     * @param integrator - the integrator
     * @param parameters - the query parameters (created via {@link QuoteServerClient.makeQueryParameters} )
     * @returns - a Promise containing a list of firm quotes
     */
    public async batchGetQuoteV2Async(
        makerUris: string[],
        integrator: Integrator,
        parameters: TakerRequestQueryParamsUnnested,
    ): Promise<FirmOtcQuote[]> {
        return Promise.all(
            makerUris.map(async (uri) => {
                return this.getQuoteV2Async(uri, integrator, parameters).catch((err) => {
                    logger.error(
                        {
                            errorMessage: err?.message,
                            makerUri: uri,
                            status: err?.isAxiosError ? err.response.status : undefined,
                        },
                        'Encountered an error requesting a firm quote',
                    );
                    return undefined;
                });
            }),
        ).then((arr) => arr.filter((result): result is FirmOtcQuote => result !== undefined));
    }

    /**
     * Request a signature from a MM for a given OtcOrder
     *
     * @param makerUri - the MM's uri
     * @param payload - the payload of the request
     * @returns - The signature if successful, undefined otherwise
     * @throws - Will throw an error if a 4xx or 5xx is returned
     */
    public async signV2Async(makerUri: string, payload: SignRequest): Promise<Signature | undefined> {
        const timerStopFn = MARKET_MAKER_SIGN_LATENCY.labels(makerUri).startTimer();
        const rawResponse = await this._axiosInstance.post(`${makerUri}/rfqm/v2/sign`, payload, {
            timeout: ONE_SECOND_MS * 2,
            headers: { 'Content-Type': 'application/json' },
        });
        const validationResult = schemaValidator.validate(rawResponse.data, quoteServerSchemas.signResponseSchema);
        if (validationResult.errors && validationResult.errors.length > 0) {
            const errorsMsg = validationResult.errors.map((err) => JSON.stringify(err)).join(',');
            throw new Error(`Error from validator: ${errorsMsg}`);
        }

        const response: SignResponse = {
            proceedWithFill: rawResponse.data?.proceedWithFill,
            makerSignature: rawResponse.data?.makerSignature,
            fee: {
                amount: new BigNumber(rawResponse.data?.fee?.amount),
                token: rawResponse.data?.fee?.token,
                type: rawResponse.data?.fee?.type,
            },
        };

        if (!response.proceedWithFill) {
            logger.info({ makerUri }, 'Sign request rejected');
            return undefined;
        }

        if (!_.isEqual(response.fee, payload.fee)) {
            logger.warn(
                { requestFee: payload.fee, responseFee: response.fee, makerUri },
                'Invalid fee acknowledgement',
            );
            return undefined;
        }

        if (response.makerSignature === undefined) {
            logger.warn({ makerUri }, 'Signature is missing');
            return undefined;
        }

        // Verify the signer was the maker
        const signerAddress = ethers.utils.verifyMessage(payload.orderHash, response.makerSignature).toLowerCase();
        const makerAddress = payload.order.maker.toLowerCase();
        if (signerAddress !== makerAddress) {
            logger.warn({ signerAddress, makerAddress, makerUri }, 'Signature is invalid');
            return undefined;
        }

        timerStopFn();
        return response.makerSignature;
    }

    /**
     * Confirm the Last Look for an RfqOrder
     */
    public async confirmLastLookAsync(makerUri: string, payload: SubmitRequest): Promise<boolean> {
        const timerStopFn = MARKET_MAKER_LAST_LOOK_LATENCY.labels(makerUri).startTimer();
        try {
            const response = await this._axiosInstance.post(`${makerUri}/submit`, payload, {
                timeout: ONE_SECOND_MS * 2,
                headers: { 'Content-Type': 'application/json' },
            });
            const validationResult = schemaValidator.validate(response.data, quoteServerSchemas.submitReceiptSchema);
            if (validationResult.errors && validationResult.errors.length > 0) {
                const errorsMsg = validationResult.errors.map((err) => JSON.stringify(err)).join(',');
                throw new Error(`Error from validator: ${errorsMsg}`);
            }
            const responseFee: Fee = {
                amount: new BigNumber(response.data.fee.amount),
                token: response.data.fee.token,
                type: response.data.fee.type,
            };

            if (!_.isEqual(responseFee, payload.fee)) {
                throw new Error('Fee in response is not equal to fee in request');
            }

            if (response.data.signedOrderHash !== payload.orderHash) {
                throw new Error(
                    `Requested trade for order hash ${payload.orderHash} - received response for order hash ${response.data.signedOrderHash}`,
                );
            }

            if (response.data.takerTokenFillAmount !== payload.takerTokenFillAmount.toString()) {
                throw new Error(
                    'takerTokenFillableAmount in response is not equal to takerTokenFillableAmount in request',
                );
            }

            return response.data.proceedWithFill === true;
        } catch (error) {
            logger.error(
                { errorMessage: error.message, makerUri },
                'Encountered an error when confirming last look with market maker',
            );
            return false;
        } finally {
            timerStopFn();
        }
    }
}
