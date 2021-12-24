import * as express from 'express';
import * as HttpStatus from 'http-status-codes';
import { Counter } from 'prom-client';

import { RFQ_MAKER_API_KEY_HEADER } from '../constants';
import { RfqMakerPairs } from '../entities';
import { logger } from '../logger';
import { RfqMakerService } from '../services/rfq_maker_service';

const RFQ_MAKER_INVALID_KEY = new Counter({
    name: 'rfq_maker_invalid_key',
    help: 'A request to maker endpoints failed because of invalid api key.',
});
const RFQ_MAKER_PAIRS_PUT_CLIENT_ERROR = new Counter({
    name: 'rfq_maker_pairs_put_client_error',
    help: 'A request to maker pairs PUT endpoint failed because of client side error.',
    labelNames: ['makerId'],
});
const RFQ_MAKER_PAIRS_PUT_SEVER_ERROR = new Counter({
    name: 'rfq_maker_pairs_put_sever_error',
    help: 'A request to maker pairs PUT endpoint failed because of sever side error.',
    labelNames: ['makerId'],
});
const RFQ_MAKER_PAIRS_PUT_SUCCEED = new Counter({
    name: 'rfq_maker_pairs_put_succeed',
    help: 'A request to maker pairs PUT endpoint succeeded.',
    labelNames: ['makerId'],
});
const RFQ_MAKER_PAIRS_GET_CLIENT_ERROR = new Counter({
    name: 'rfq_maker_pairs_get_client_error',
    help: 'A request to maker pairs GET endpoint failed because of client side error.',
    labelNames: ['makerId'],
});
const RFQ_MAKER_PAIRS_GET_SEVER_ERROR = new Counter({
    name: 'rfq_maker_pairs_get_sever_error',
    help: 'A request to maker pairs GET endpoint failed because of sever side error.',
    labelNames: ['makerId'],
});
const RFQ_MAKER_PAIRS_GET_SUCCEED = new Counter({
    name: 'rfq_maker_pairs_get_succeed',
    help: 'A request to maker pairs GET endpoint succeeded.',
    labelNames: ['makerId'],
});

const convertToLowerCase = (pairs: [string, string][]): [string, string][] => {
    return pairs.map((pair) => {
        return [pair[0].toLowerCase(), pair[1].toLowerCase()];
    });
};

export class RfqMakerHandlers {
    constructor(private readonly _rfqMakerService: RfqMakerService) {}

    /**
     * Handler for PUT operation of the `/maker/v1/chain-id/:chainId` endpoint.
     */
    public async putPairsAsync(req: express.Request, res: express.Response): Promise<void> {
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
            RFQ_MAKER_PAIRS_PUT_CLIENT_ERROR.labels(makerId).inc();
            res.status(HttpStatus.BAD_REQUEST).send({ error: message });
            return;
        }

        const chainId = Number(req.params.chainId);
        const pairs = req.body.pairs;
        try {
            RfqMakerService.validatePairsPayloadOrThrow(pairs);
        } catch ({ message }) {
            logger.info({ requestId, makerId, chainId }, message);
            RFQ_MAKER_PAIRS_PUT_CLIENT_ERROR.labels(makerId).inc();
            res.status(HttpStatus.BAD_REQUEST).send({ error: message });
            return;
        }

        try {
            const pairsEntity: RfqMakerPairs = await this._rfqMakerService.createOrUpdatePairsAsync(
                makerId,
                chainId,
                convertToLowerCase(pairs),
            );
            res.status(HttpStatus.CREATED).send(pairsEntity);
            logger.info({ requestId, makerId, chainId }, 'Successfully created or updated pairs.');
            RFQ_MAKER_PAIRS_PUT_SUCCEED.labels(makerId).inc();
        } catch (error) {
            const message = `Failed to create or update pairs.`;
            logger.error({ requestId, makerId, chainId, errorMessage: error.message }, message);
            RFQ_MAKER_PAIRS_PUT_SEVER_ERROR.labels(makerId).inc();
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ message });
        }
    }

    /**
     * Handler for GET operation of the `/maker/v1/chain-id/:chainId` endpoint.
     */
    public async getPairsAsync(req: express.Request, res: express.Response): Promise<void> {
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
            RFQ_MAKER_PAIRS_GET_CLIENT_ERROR.labels(makerId).inc();
            res.status(HttpStatus.BAD_REQUEST).send({ error: message });
            return;
        }

        const chainId = Number(req.params.chainId);

        try {
            const pairsEntity: RfqMakerPairs = await this._rfqMakerService.getPairsAsync(makerId, chainId);
            res.status(HttpStatus.OK).send(pairsEntity);
            logger.info({ requestId, makerId, chainId }, 'Successfully get pairs.');
            RFQ_MAKER_PAIRS_GET_SUCCEED.labels(makerId).inc();
        } catch (error) {
            const message = `Failed to get pairs.`;
            logger.error({ requestId, makerId, chainId, errorMessage: error.message }, message);
            RFQ_MAKER_PAIRS_GET_SEVER_ERROR.labels(makerId).inc();
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ message });
        }
    }
}
