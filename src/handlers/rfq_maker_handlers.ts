import * as express from 'express';
import * as HttpStatus from 'http-status-codes';
import { Counter } from 'prom-client';

import { RFQ_MAKER_API_KEY_HEADER } from '../core/constants';
import { RfqMaker } from '../entities';
import { logger } from '../logger';
import { RfqMakerService } from '../services/rfq_maker_service';

const RFQ_MAKER_INVALID_KEY = new Counter({
    name: 'rfq_maker_invalid_key',
    help: 'A request to maker endpoints failed because of invalid api key.',
});
const RFQ_MAKER_UPDATE_CLIENT_ERROR = new Counter({
    name: 'rfq_maker_update_client_error',
    help: 'A request to update maker configs failed because of client side error.',
    labelNames: ['makerId'],
});
const RFQ_MAKER_UPDATE_SEVER_ERROR = new Counter({
    name: 'rfq_maker_update_sever_error',
    help: 'A request to update maker configs failed because of sever side error.',
    labelNames: ['makerId'],
});
const RFQ_MAKER_UPDATE_SUCCEED = new Counter({
    name: 'rfq_maker_update_succeed',
    help: 'A request to update maker configs succeeded.',
    labelNames: ['makerId'],
});
const RFQ_MAKER_GET_CLIENT_ERROR = new Counter({
    name: 'rfq_maker_get_client_error',
    help: 'A request to GET maker failed because of client side error.',
    labelNames: ['makerId'],
});
const RFQ_MAKER_GET_SEVER_ERROR = new Counter({
    name: 'rfq_maker_get_sever_error',
    help: 'A request to GET maker endpoint failed because of sever side error.',
    labelNames: ['makerId'],
});
const RFQ_MAKER_GET_SUCCEED = new Counter({
    name: 'rfq_maker_get_succeed',
    help: 'A request to GET maker succeeded.',
    labelNames: ['makerId'],
});

const convertToLowerCase = (pairs: [string, string][]): [string, string][] => {
    return pairs.map((pair) => {
        return [pair[0].toLowerCase(), pair[1].toLowerCase()];
    });
};

/**
 * Validates the request body of a PUT request.
 */
const validatePutPayloadOrThrow = (body: { pairs: []; rfqtUri: string; rfqmUri: string }) => {
    RfqMakerService.validatePairsPayloadOrThrow(body.pairs);
    RfqMakerService.validateUriOrThrow('rfqtUri', body.rfqtUri);
    RfqMakerService.validateUriOrThrow('rfqmUri', body.rfqmUri);
};

/**
 * Validates the request body of a PATCH request.
 */
const validatePatchPayloadOrThrow = (body: { pairs?: []; rfqtUri?: string; rfqmUri?: string }) => {
    if (body.pairs !== undefined) {
        RfqMakerService.validatePairsPayloadOrThrow(body.pairs);
    }

    if (body.rfqtUri !== undefined) {
        RfqMakerService.validateUriOrThrow('rfqtUri', body.rfqtUri);
    }

    if (body.rfqmUri !== undefined) {
        RfqMakerService.validateUriOrThrow('rfqmUri', body.rfqmUri);
    }

    if (body.pairs === undefined && body.rfqtUri === undefined && body.rfqmUri === undefined) {
        throw new Error('No valid field is specified.');
    }
};

export class RfqMakerHandlers {
    constructor(private readonly _rfqMakerService: RfqMakerService) {}

    /**
     * Handler for PUT operation of the `/maker/v1/chain-id/:chainId` endpoint.
     */
    public async putRfqMakerAsync(req: express.Request, res: express.Response): Promise<void> {
        const requestId = req.id;
        const makerApiKey = req.headers[RFQ_MAKER_API_KEY_HEADER] as string;
        const makerId = this._rfqMakerService.mapMakerApiKeyToId(makerApiKey);

        if (makerId === null) {
            const message = `Invalid api key.`;
            logger.info({ requestId, apiKey: makerApiKey }, message);
            RFQ_MAKER_INVALID_KEY.inc();
            res.status(HttpStatus.UNAUTHORIZED).send({ error: message });
            return;
        }

        if (!RfqMakerService.isValidChainId(req.params.chainId)) {
            const message = `Invalid chainId.`;
            logger.info({ requestId, makerId, chainId: req.params.chainId }, message);
            RFQ_MAKER_UPDATE_CLIENT_ERROR.labels(makerId).inc();
            res.status(HttpStatus.BAD_REQUEST).send({ error: message });
            return;
        }

        const chainId = Number(req.params.chainId);
        try {
            validatePutPayloadOrThrow(req.body);
        } catch ({ message }) {
            logger.info({ requestId, makerId, chainId }, message);
            RFQ_MAKER_UPDATE_CLIENT_ERROR.labels(makerId).inc();
            res.status(HttpStatus.BAD_REQUEST).send({ error: message });
            return;
        }

        try {
            const pairs = req.body.pairs;
            const rfqtUri = req.body.rfqtUri;
            const rfqmUri = req.body.rfqmUri;
            const rfqMaker: RfqMaker = await this._rfqMakerService.createOrUpdateRfqMakerAsync(
                makerId,
                chainId,
                convertToLowerCase(pairs),
                rfqtUri,
                rfqmUri,
            );
            res.status(HttpStatus.CREATED).send(rfqMaker);
            const rfqmMakerUri = rfqMaker.rfqmUri;
            logger.info(
                { requestId, makerId, chainId, rfqmMakerUri },
                'Successfully created or updated RfqMaker entity.',
            );
            RFQ_MAKER_UPDATE_SUCCEED.labels(makerId).inc();
        } catch (error) {
            const message = `Failed to create or update RfqMaker entity.`;
            logger.error({ requestId, makerId, chainId, errorMessage: error.message }, message);
            RFQ_MAKER_UPDATE_SEVER_ERROR.labels(makerId).inc();
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ message });
        }
    }

    /**
     * Handler for PATCH operation of the `/maker/v1/chain-id/:chainId` endpoint.
     */
    public async patchRfqMakerAsync(req: express.Request, res: express.Response): Promise<void> {
        const requestId = req.id;
        const makerApiKey = req.headers[RFQ_MAKER_API_KEY_HEADER] as string;
        const makerId = this._rfqMakerService.mapMakerApiKeyToId(makerApiKey);

        if (makerId === null) {
            const message = `Invalid api key.`;
            logger.info({ requestId, apiKey: makerApiKey }, message);
            RFQ_MAKER_INVALID_KEY.inc();
            res.status(HttpStatus.UNAUTHORIZED).send({ error: message });
            return;
        }

        if (!RfqMakerService.isValidChainId(req.params.chainId)) {
            const message = `Invalid chainId.`;
            logger.info({ requestId, makerId, chainId: req.params.chainId }, message);
            RFQ_MAKER_UPDATE_CLIENT_ERROR.labels(makerId).inc();
            res.status(HttpStatus.BAD_REQUEST).send({ error: message });
            return;
        }

        const chainId = Number(req.params.chainId);
        try {
            validatePatchPayloadOrThrow(req.body);
        } catch ({ message }) {
            logger.info({ requestId, makerId, chainId }, message);
            RFQ_MAKER_UPDATE_CLIENT_ERROR.labels(makerId).inc();
            res.status(HttpStatus.BAD_REQUEST).send({ error: message });
            return;
        }

        try {
            const pairs = req.body.pairs;
            const rfqtUri = req.body.rfqtUri;
            const rfqmUri = req.body.rfqmUri;
            const rfqMaker: RfqMaker = await this._rfqMakerService.patchRfqMakerAsync(
                makerId,
                chainId,
                pairs !== undefined ? convertToLowerCase(pairs) : undefined,
                rfqtUri,
                rfqmUri,
            );
            res.status(HttpStatus.OK).send(rfqMaker);
            const rfqmMakerUri = rfqMaker.rfqmUri;
            logger.info({ requestId, makerId, chainId, rfqmMakerUri }, 'Successfully patched RfqMaker entity.');
            RFQ_MAKER_UPDATE_SUCCEED.labels(makerId).inc();
        } catch (error) {
            const message = `Failed to patch RfqMaker entity.`;
            logger.error({ requestId, makerId, chainId, errorMessage: error.message }, message);
            RFQ_MAKER_UPDATE_SEVER_ERROR.labels(makerId).inc();
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ message });
        }
    }

    /**
     * Handler for GET operation of the `/maker/v1/chain-id/:chainId` endpoint.
     */
    public async getRfqMakerAsync(req: express.Request, res: express.Response): Promise<void> {
        const requestId = req.id;
        const makerApiKey = req.headers[RFQ_MAKER_API_KEY_HEADER] as string;
        const makerId = this._rfqMakerService.mapMakerApiKeyToId(makerApiKey);

        if (makerId === null) {
            const message = `Invalid api key.`;
            logger.info({ requestId, apiKey: makerApiKey }, message);
            RFQ_MAKER_INVALID_KEY.inc();
            res.status(HttpStatus.UNAUTHORIZED).send({ error: message });
            return;
        }

        if (!RfqMakerService.isValidChainId(req.params.chainId)) {
            const message = `Invalid chainId.`;
            logger.info({ requestId, makerId, chainId: req.params.chainId }, message);
            RFQ_MAKER_GET_CLIENT_ERROR.labels(makerId).inc();
            res.status(HttpStatus.BAD_REQUEST).send({ error: message });
            return;
        }

        const chainId = Number(req.params.chainId);

        try {
            const rfqMaker: RfqMaker = await this._rfqMakerService.getRfqMakerAsync(makerId, chainId);
            res.status(HttpStatus.OK).send(rfqMaker);
            logger.info({ requestId, makerId, chainId }, 'Successfully got RfqMaker entity.');
            RFQ_MAKER_GET_SUCCEED.labels(makerId).inc();
        } catch (error) {
            const message = `Failed to get RfqMaker entity.`;
            logger.error({ requestId, makerId, chainId, errorMessage: error.message }, message);
            RFQ_MAKER_GET_SEVER_ERROR.labels(makerId).inc();
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ message });
        }
    }
}
