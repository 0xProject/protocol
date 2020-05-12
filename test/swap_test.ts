import { expect } from '@0x/contracts-test-utils';
import * as HttpStatus from 'http-status-codes';
import 'mocha';

import { SWAP_PATH } from '../src/constants';

import { setupApiAsync, teardownApiAsync } from './utils/deployment';
import { httpGetAsync } from './utils/http_utils';

const SUITE_NAME = 'swap tests';

describe(SUITE_NAME, () => {
    before(async () => {
        await setupApiAsync(SUITE_NAME);
    });
    after(async () => {
        await teardownApiAsync(SUITE_NAME);
    });

    describe('should respond to GET /swap/quote', () => {
        it("with INSUFFICIENT_ASSET_LIQUIDITY when there's no liquidity (empty orderbook, sampling excluded, no RFQ)", async () => {
            const route = `${SWAP_PATH}/quote?buyToken=DAI&sellToken=WETH&buyAmount=100000000000000000&excludedSources=Uniswap,Eth2Dai,Kyber,LiquidityProvider`;
            const response = await httpGetAsync({ route });
            expect(response.status).to.be.eq(HttpStatus.BAD_REQUEST);
            expect(response.type).to.be.eq('application/json');
            expect(JSON.parse(response.text)).to.be.deep.eq({
                code: 100,
                reason: 'Validation Failed',
                validationErrors: [
                    {
                        code: 1004,
                        field: 'buyAmount',
                        reason: 'INSUFFICIENT_ASSET_LIQUIDITY',
                    },
                ],
            });
        });
    });
});
