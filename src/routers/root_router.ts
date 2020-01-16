import * as express from 'express';

export const createRootRouter = (): express.Router => {
    const router = express.Router();
    router.get('/', (_req: express.Request, res: express.Response) => {
        res.send({
            message: 'This is the root of the 0x API. Visit https://0x.org/docs/api for documentation.',
        });
    });
    return router;
};
