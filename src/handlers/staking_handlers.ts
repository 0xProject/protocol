import * as express from 'express';
import * as HttpStatus from 'http-status-codes';

export const stakingHandlers = {
    getStakingPoolsAsync: async (_req: express.Request, res: express.Response): Promise<void> => {
        res.status(HttpStatus.OK).send('OK');
    },
};
