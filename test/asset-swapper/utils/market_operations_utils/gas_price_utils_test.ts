import * as chai from 'chai';
import 'mocha';
import * as TypeMoq from 'typemoq';

import { GasPriceUtils } from '../../../../src/asset-swapper';

import { chaiSetup } from '../chai_setup';
chaiSetup.configure();
const expect = chai.expect;

const mockResponse = new Response(
    JSON.stringify({
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

const fetchMock = TypeMoq.GlobalMock.ofInstance(fetch, 'fetch', global);
fetchMock
    .setup((x) => x(TypeMoq.It.isValue('https://mock-0x-gas-api.org/median')))
    .returns(() => Promise.resolve(mockResponse));

describe('GasPriceUtils', () => {
    describe('getGasPriceEstimationOrThrowAsync', () => {
        it('parses fast gas price response correctly', async () => {
            TypeMoq.GlobalScope.using(fetchMock).with(async () => {
                const utils = GasPriceUtils.getInstance(420000, 'https://mock-0x-gas-api.org/median');
                const gasPrice = await utils.getGasPriceEstimationOrThrowAsync();
                expect(gasPrice.fast).to.eq(18848500000);
            });
        });
    });
});
