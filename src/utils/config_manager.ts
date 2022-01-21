// tslint:disable: prefer-function-over-method
import { ChainId } from '@0x/contract-addresses';

import {
    CHAIN_ID,
    getIntegratorByIdOrThrow,
    getIntegratorIdForApiKey,
    Integrator,
    MakerIdsToConfigs,
    RFQM_API_KEY_WHITELIST,
    RFQT_MAKER_CONFIG_MAP_FOR_RFQ_ORDER,
} from '../config';

/**
 * ConfigManager is a simple wrapper around configs.
 *
 * It exists to provide a layer around our configs which can then be mocked while writing tests
 */
export class ConfigManager {
    public getRfqmApiKeyWhitelist(): Set<string> {
        return RFQM_API_KEY_WHITELIST;
    }

    public getIntegratorByIdOrThrow(integratorId: string): Integrator {
        return getIntegratorByIdOrThrow(integratorId);
    }

    public getIntegratorIdForApiKey(apiKey: string): string | undefined {
        return getIntegratorIdForApiKey(apiKey);
    }

    /**
     * Get a map of makers that support RFQt workflow with rfq order type
     * @returns a map from makerIds to makers' configuration object
     */
    public getRfqtMakerConfigMapForRfqOrder(): MakerIdsToConfigs {
        return RFQT_MAKER_CONFIG_MAP_FOR_RFQ_ORDER;
    }

    public getChainId(): ChainId {
        return CHAIN_ID;
    }
}
