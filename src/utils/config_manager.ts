// tslint:disable: prefer-function-over-method
import { RFQM_API_KEY_WHITELIST } from '../config';

/**
 * ConfigManager is a simple wrapper around configs.
 *
 * It exists to provide a layer around our configs, which can then be mocked while writing tests
 */
export class ConfigManager {
    public getRfqmApiKeyWhitelist(): Set<string> {
        return RFQM_API_KEY_WHITELIST;
    }
}
