import { expect } from '@0x/contracts-test-utils';
import 'mocha';

import {
    getApiKeyWhitelistFromIntegratorsAcl,
    getIntegratorByIdOrThrow,
    getIntegratorIdForApiKey,
    RFQT_INTEGRATOR_IDS,
} from '../src/config';

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
            expect(whitelistIntegratorUrls!.length).to.eql(1);
            expect(whitelistIntegratorUrls![0]).to.eql('http://foo.bar');
        });

        it('returns `undefined` for non-existent api keys', () => {
            const id = getIntegratorIdForApiKey('test-api-key-does-not-exist');

            // tslint:disable-next-line: no-unused-expression
            expect(id).to.be.undefined;
        });
    });

    describe('getApiKeyWhitelistFromIntegratorsAcl', () => {
        it('gets keys for allowed liquidity sources', () => {
            const rfqtKeys = getApiKeyWhitelistFromIntegratorsAcl('rfqt');
            expect(rfqtKeys.length).to.eql(2);
            expect(rfqtKeys[0]).to.eql('test-api-key-1');
            expect(rfqtKeys[1]).to.eql('test-api-key-2');

            const rfqmKeys = getApiKeyWhitelistFromIntegratorsAcl('rfqm');
            expect(rfqmKeys.length).to.eql(3); // tslint:disable-line: custom-no-magic-numbers
            expect(rfqmKeys[0]).to.eql('test-api-key-1');
            expect(rfqmKeys[1]).to.eql('test-api-key-2');
            expect(rfqmKeys[2]).to.eql('test-api-key-3');
        });
        it("doesn't add disallowed liquidity sources to allowed API keys", () => {
            const plpKeys = getApiKeyWhitelistFromIntegratorsAcl('plp');
            expect(plpKeys.length).to.equal(0);
        });
        it('creates the RFQt Integrator ID list (used in swap/rfq/registry)', () => {
            expect(RFQT_INTEGRATOR_IDS.length).to.equal(1);
            expect(RFQT_INTEGRATOR_IDS[0]).to.equal('test-integrator-id-1');
        });
    });
});
