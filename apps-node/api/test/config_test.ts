import { expect } from 'chai';
import 'mocha';

import { getIntegratorByIdOrThrow, getIntegratorIdForApiKey } from '../src/config';

/**
 * Configuration tests which run against the config in `test_env` file.
 */
describe('Config', () => {
    describe('getIntegratorIdForApiKey', () => {
        it('gets the integrator ID for an api key', () => {
            const id = getIntegratorIdForApiKey('test-api-key-1');

            expect(id).to.equal('test-integrator-id-1');
        });

        it('correctly parses whitelist', () => {
            try {
                getIntegratorByIdOrThrow('test-integrator-id-2');
                expect.fail(`"test-integrator-id-2" should not exist`);
            } catch (e) {
                expect(e.toString()).to.equal('AssertionError: "test-integrator-id-2" should not exist');
            }
        });

        it('allows us to fetch Integrator by Integrator key', () => {
            const { whitelistIntegratorUrls } = getIntegratorByIdOrThrow('test-integrator-id-1');
            expect(whitelistIntegratorUrls).to.deep.eq(['http://foo.bar']);
        });

        it('returns `undefined` for non-existent api keys', () => {
            const id = getIntegratorIdForApiKey('test-api-key-does-not-exist');

            expect(id).to.be.undefined;
        });
    });
});