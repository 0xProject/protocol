import * as chai from 'chai';
import 'mocha';
import { rest } from 'msw';
import { setupServer } from 'msw/node';

import { ProtocolFeeUtils } from '../src';

import { chaiSetup } from './utils/chai_setup';
chaiSetup.configure();
const expect = chai.expect;

const server = setupServer(
    rest.get('https://mock-0x-gas-api.org/median', (_req, res, ctx) => {
        return res(
            ctx.json({
                result: {
                    source: 'MEDIAN',
                    timestamp: 1659386474,
                    instant: 22000000000,
                    fast: 18848500000,
                    standard: 14765010000,
                    low: 13265000000,
                },
            }),
        );
    }),
);

describe('ProtocolFeeUtils', () => {
    describe('getGasPriceEstimationOrThrowAsync', () => {
        beforeEach(() => {
            server.listen();
        });

        afterEach(() => {
            server.close();
        });

        it('parses fast gas price response correctly', async () => {
            const utils = ProtocolFeeUtils.getInstance(420000, 'https://mock-0x-gas-api.org/median');
            const gasPrice = await utils.getGasPriceEstimationOrThrowAsync();
            expect(gasPrice.toNumber()).to.eq(18848500000);
        });
    });
});
