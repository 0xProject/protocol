import { BigNumber } from '@0x/utils';
import * as express from 'express';
import * as HttpStatus from 'http-status-codes';
import * as _ from 'lodash';
import * as isValidUUID from 'uuid-validate';

import { GeneralErrorCodes, generalErrorCodeToReason, InternalServerError, RevertAPIError } from '../errors';
import { logger } from '../logger';
import { isAPIError, isRevertError } from '../middleware/error_handling';
import { schemas } from '../schemas/schemas';
import { SignerService } from '../services/signer_service';
import { ZeroExTransactionWithoutDomain } from '../types';
import { schemaUtils } from '../utils/schema_utils';

export class SignerHandlers {
    private readonly _signerService: SignerService;
    public static rootAsync(_req: express.Request, res: express.Response): void {
        const message = `This is the root of the Signer API.`;
        res.status(HttpStatus.OK).send({ message });
    }
    constructor(signerService: SignerService) {
        this._signerService = signerService;
    }
    public async submitZeroExTransactionIfWhitelistedAsync(req: express.Request, res: express.Response): Promise<void> {
        const apiKey = req.header('0x-api-key');
        if (apiKey !== undefined && !isValidUUID(apiKey)) {
            res.status(HttpStatus.BAD_REQUEST).send({
                code: GeneralErrorCodes.InvalidAPIKey,
                reason: generalErrorCodeToReason[GeneralErrorCodes.InvalidAPIKey],
            });
            return;
        }
        schemaUtils.validateSchema(req.body, schemas.metaTransactionFillRequestSchema);

        // parse the request body
        const { zeroExTransaction, signature } = parsePostTransactionRequestBody(req);
        try {
            const protocolFee = await this._signerService.validateZeroExTransactionFillAsync(
                zeroExTransaction,
                signature,
            );

            // If eligible for free txn relay, submit it, otherwise, return unsigned Ethereum txn
            if (apiKey !== undefined && SignerService.isEligibleForFreeMetaTxn(apiKey)) {
                const {
                    ethereumTransactionHash,
                    signedEthereumTransaction,
                } = await this._signerService.submitZeroExTransactionIfWhitelistedAsync(
                    zeroExTransaction,
                    signature,
                    protocolFee,
                );
                // return the transactionReceipt
                res.status(HttpStatus.OK).send({
                    ethereumTransactionHash,
                    signedEthereumTransaction,
                });
            } else {
                const ethereumTxn = await this._signerService.generateExecuteTransactionEthereumTransactionAsync(
                    zeroExTransaction,
                    signature,
                    protocolFee,
                );
                res.status(HttpStatus.FORBIDDEN).send({
                    code: GeneralErrorCodes.UnableToSubmitOnBehalfOfTaker,
                    reason: generalErrorCodeToReason[GeneralErrorCodes.UnableToSubmitOnBehalfOfTaker],
                    ethereumTransaction: {
                        data: ethereumTxn.data,
                        gasPrice: ethereumTxn.gasPrice,
                        gas: ethereumTxn.gas,
                        value: ethereumTxn.value,
                        to: ethereumTxn.to,
                    },
                });
            }
        } catch (e) {
            // If this is already a transformed error then just re-throw
            if (isAPIError(e)) {
                throw e;
            }
            // Wrap a Revert error as an API revert error
            if (isRevertError(e)) {
                throw new RevertAPIError(e);
            }
            logger.info('Uncaught error', e);
            throw new InternalServerError(e.message);
        }
    }
}

interface PostTransactionRequestBody {
    zeroExTransaction: ZeroExTransactionWithoutDomain;
    signature: string;
}

const parsePostTransactionRequestBody = (req: any): PostTransactionRequestBody => {
    const requestBody = req.body;
    const signature = requestBody.signature;
    const zeroExTransaction: ZeroExTransactionWithoutDomain = {
        salt: new BigNumber(requestBody.zeroExTransaction.salt),
        expirationTimeSeconds: new BigNumber(requestBody.zeroExTransaction.expirationTimeSeconds),
        gasPrice: new BigNumber(requestBody.zeroExTransaction.gasPrice),
        signerAddress: requestBody.zeroExTransaction.signerAddress,
        data: requestBody.zeroExTransaction.data,
    };
    return {
        zeroExTransaction,
        signature,
    };
};
