import { expect } from '@0x/contracts-test-utils';
import * as HttpStatus from 'http-status-codes';
import 'mocha';

import * as config from '../src/config';
import { DEFAULT_PAGE, DEFAULT_PER_PAGE, SRA_PATH } from '../src/constants';
import { getDBConnectionAsync } from '../src/db_connection';
import { SignedOrderEntity } from '../src/entities';

import * as orderFixture from './fixtures/order.json';
import { setupApiAsync, teardownApiAsync } from './utils/deployment';
import { httpGetAsync } from './utils/http_utils';

const SUITE_NAME = 'sra tests';

describe(SUITE_NAME, () => {
    before(async () => {
        await setupApiAsync(SUITE_NAME);
    });
    after(async () => {
        await teardownApiAsync(SUITE_NAME);
    });

    describe('/orders tests', () => {
        it('should respond to GET /sra/orders', async () => {
            const response = await httpGetAsync({ route: `${SRA_PATH}/orders` });
            expect(response.status).to.be.eq(HttpStatus.OK);
            expect(response.type).to.be.eq('application/json');
            expect(response.body).to.be.deep.eq({
                perPage: DEFAULT_PER_PAGE,
                page: DEFAULT_PAGE,
                total: 0,
                records: [],
            });
        });
        it('should normalize addresses to lowercase', async () => {
            const metaData = {
                hash: '123',
                remainingFillableTakerAssetAmount: '1',
            };
            const expirationTimeSeconds = (new Date().getTime() / 1000 + 600).toString(); // tslint:disable-line:custom-no-magic-numbers
            const orderModel = new SignedOrderEntity({
                ...metaData,
                ...orderFixture,
                expirationTimeSeconds,
            });

            const apiOrderResponse = { chainId: config.CHAIN_ID, ...orderFixture, expirationTimeSeconds };
            const dbConnection = await getDBConnectionAsync();
            await dbConnection.manager.save(orderModel);

            const response = await httpGetAsync({
                route: `${SRA_PATH}/orders?makerAddress=${orderFixture.makerAddress.toUpperCase()}`,
            });
            expect(response.status).to.be.eq(HttpStatus.OK);
            expect(response.type).to.be.eq('application/json');
            expect(response.body).to.be.deep.eq({
                perPage: DEFAULT_PER_PAGE,
                page: DEFAULT_PAGE,
                total: 1,
                records: [
                    {
                        metaData: {
                            orderHash: '123',
                            remainingFillableTakerAssetAmount: '1',
                        },
                        order: apiOrderResponse,
                    },
                ],
            });
        });
    });
});
