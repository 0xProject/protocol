// tslint:disable: prefer-function-over-method
import { RfqMakerAssetOfferings } from '@0x/asset-swapper';
import { ChainId } from '@0x/contract-addresses';
import { createHash } from 'crypto';

import {
    CHAIN_ID,
    getIntegratorByIdOrThrow,
    getIntegratorIdForApiKey,
    Integrator,
    MakerIdsToConfigs,
    RFQM_API_KEY_WHITELIST,
    RFQM_MAKER_ASSET_OFFERINGS,
    RFQM_MAKER_CONFIG_MAP,
    RFQM_MAKER_CONFIG_MAP_FOR_OTC_ORDER,
    RFQM_MAKER_CONFIG_MAP_FOR_RFQ_ORDER,
    RFQM_MAKER_SET_FOR_OTC_ORDER,
    RFQM_MAKER_SET_FOR_RFQ_ORDER,
    RFQT_MAKER_ASSET_OFFERINGS,
    RFQ_API_KEY_HASH_TO_MAKER_ID,
} from '../config';

const getApiKeyHash = (apiKey: string): string => createHash('sha256').update(apiKey).digest('base64');

/**
 * ConfigManager is a simple wrapper around configs.
 *
 * It exists to provide a layer around our configs which can then be mocked while writing tests
 */
export class ConfigManager {
    public getRfqmApiKeyWhitelist(): Set<string> {
        return RFQM_API_KEY_WHITELIST;
    }

    public getRfqmAssetOfferings(): RfqMakerAssetOfferings {
        return RFQM_MAKER_ASSET_OFFERINGS;
    }

    public getRfqtAssetOfferings(): RfqMakerAssetOfferings {
        return RFQT_MAKER_ASSET_OFFERINGS;
    }

    public getRfqmMakerSetForOtcOrder(): Set<string> {
        return RFQM_MAKER_SET_FOR_OTC_ORDER;
    }

    public getRfqmMakerSetForRfqOrder(): Set<string> {
        return RFQM_MAKER_SET_FOR_RFQ_ORDER;
    }

    public getRfqMakerIdForApiKey(apiKey: string): string | undefined {
        return RFQ_API_KEY_HASH_TO_MAKER_ID.get(getApiKeyHash(apiKey));
    }

    public getIntegratorByIdOrThrow(integratorId: string): Integrator {
        return getIntegratorByIdOrThrow(integratorId);
    }

    public getIntegratorIdForApiKey(apiKey: string): string | undefined {
        return getIntegratorIdForApiKey(apiKey);
    }

    /**
     * Get a map of makers that support RFQm workflow with either rfq or otc order types
     * @returns a map from makerIds to makers' configuration object
     */
    public getRfqmMakerConfigMap(): MakerIdsToConfigs {
        return RFQM_MAKER_CONFIG_MAP;
    }

    /**
     * Get a map of makers that support RFQm workflow with rfq order type
     * @returns a map from makerIds to makers' configuration object
     */
    public getRfqmMakerConfigMapForRfqOrder(): MakerIdsToConfigs {
        return RFQM_MAKER_CONFIG_MAP_FOR_RFQ_ORDER;
    }

    /**
     * Get a map of makers that support RFQm workflow with otc order type
     * @returns a map from makerIds to makers' configuration object
     */
    public getRfqmMakerConfigMapForOtcOrder(): MakerIdsToConfigs {
        return RFQM_MAKER_CONFIG_MAP_FOR_OTC_ORDER;
    }

    public getChainId(): ChainId {
        return CHAIN_ID;
    }
}
