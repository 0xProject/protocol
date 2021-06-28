import { SchemaValidator } from '@0x/json-schemas';
import { schemas, SubmitRequest } from '@0x/quote-server';
import { Fee } from '@0x/quote-server/lib/src/types';
import { BigNumber } from '@0x/utils';
import { AxiosInstance } from 'axios';
import * as _ from 'lodash';
import { Summary } from 'prom-client';

import { ONE_SECOND_MS } from '../constants';
import { logger } from '../logger';

const MARKET_MAKER_LAST_LOOK_LATENCY = new Summary({
    name: 'market_maker_last_look_latency',
    help: 'Latency for Last Look request to Market Makers',
    labelNames: ['makerUri'],
});

const schemaValidator = new SchemaValidator();
schemaValidator.addSchema(schemas.feeSchema);
schemaValidator.addSchema(schemas.submitRequestSchema);
schemaValidator.addSchema(schemas.submitReceiptSchema);
export class QuoteServerClient {
    constructor(private readonly _axiosInstance: AxiosInstance) {}

    public async confirmLastLookAsync(makerUri: string, payload: SubmitRequest): Promise<boolean> {
        const timerStopFn = MARKET_MAKER_LAST_LOOK_LATENCY.labels(makerUri).startTimer();
        try {
            const response = await this._axiosInstance.post(`${makerUri}/submit`, payload, {
                timeout: ONE_SECOND_MS * 2,
                headers: { 'Content-Type': 'application/json' },
            });
            const validator = schemaValidator.validate(response.data, schemas.submitReceiptSchema);
            if (validator.errors && validator.errors.length > 0) {
                const errorsMsg = validator.errors.map((err) => err.toString()).join(',');
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
            logger.warn({ error, makerUri }, 'Encountered an error when confirming last look with market maker');
            return false;
        } finally {
            timerStopFn();
        }
    }
}
