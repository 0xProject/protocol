import { getIntegratorByIdOrThrow, getIntegratorIdForApiKey, ZERO_EX_FEE_CONFIGURATION_MAP } from '../src/config';
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

    describe('ZERO_EX_FEE_CONFIGURATION_MAP', () => {
        it('correctly processes raw 0x fee config', () => {
            expect(ZERO_EX_FEE_CONFIGURATION_MAP).toEqual(ZERO_EX_FEE_CONFIGURATIONS);
        });
    });
});
