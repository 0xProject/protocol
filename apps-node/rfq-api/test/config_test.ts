// tslint:disable custom-no-magic-numbers
import {
    getApiKeyWhitelistFromIntegratorsAcl,
    getIntegratorByIdOrThrow,
    getIntegratorIdForApiKey,
    ZERO_EX_FEE_CONFIGURATION_MAP,
} from '../src/config';
import { ZERO_EX_FEE_CONFIGURATIONS } from './constants';

/**
 * Configuration tests which run against the config in `test_env` file.
 */
describe('Config', () => {
    describe('getIntegratorIdForApiKey', () => {
        it('gets the integrator ID for an api key', () => {
            const id = getIntegratorIdForApiKey('test-api-key-1');

            expect(id).toEqual('test-integrator-id-1');
        });

        it('correctly parses whitelist', () => {
            expect(() => getIntegratorByIdOrThrow('test-integrator-id-3')).toThrow('test-integrator-id-3');
        });

        it('allows us to fetch Integrator by Integrator key', () => {
            const { whitelistIntegratorUrls } = getIntegratorByIdOrThrow('test-integrator-id-1');
            // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect(whitelistIntegratorUrls!.length).toEqual(1);
            // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect(whitelistIntegratorUrls![0]).toEqual('http://foo.bar');
        });

        it('returns `undefined` for non-existent api keys', () => {
            const id = getIntegratorIdForApiKey('test-api-key-does-not-exist');
            expect(id).toEqual(undefined);
        });
    });

    describe('getApiKeyWhitelistFromIntegratorsAcl', () => {
        it('gets keys for allowed liquidity sources', () => {
            const rfqtKeys = getApiKeyWhitelistFromIntegratorsAcl('rfqt');
            expect(rfqtKeys.length).toEqual(2);
            expect(rfqtKeys[0]).toEqual('test-api-key-1');
            expect(rfqtKeys[1]).toEqual('test-api-key-2');

            const rfqmKeys = getApiKeyWhitelistFromIntegratorsAcl('rfqm');
            expect(rfqmKeys.length).toEqual(3); // tslint:disable-line: custom-no-magic-numbers
            expect(rfqmKeys[0]).toEqual('test-api-key-1');
            expect(rfqmKeys[1]).toEqual('test-api-key-2');
            expect(rfqmKeys[2]).toEqual('test-api-key-3');
        });
        it("doesn't add disallowed liquidity sources to allowed API keys", () => {
            const plpKeys = getApiKeyWhitelistFromIntegratorsAcl('plp');
            expect(plpKeys.length).toEqual(0);
        });
    });

    describe('ZERO_EX_FEE_CONFIGURATION_MAP', () => {
        it('correctly processes raw 0x fee config', () => {
            expect(ZERO_EX_FEE_CONFIGURATION_MAP).toEqual(ZERO_EX_FEE_CONFIGURATIONS);
        });
    });
});
