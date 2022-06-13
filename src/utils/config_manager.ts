// tslint:disable: prefer-function-over-method
import { createHash } from 'crypto';

import {
    ADMIN_API_KEY,
    DEFAULT_FEE_MODEL_CONFIGURATION,
    FeeModelConfiguration,
    FEE_MODEL_CONFIGURATION_MAP,
    getIntegratorByIdOrThrow,
    getIntegratorIdForApiKey,
    Integrator,
    MakerIdSet,
    RFQM_API_KEY_WHITELIST,
    RFQM_MAKER_ID_SET,
    RFQM_MAKER_ID_SET_FOR_OTC_ORDER,
    RFQM_MAKER_ID_SET_FOR_RFQ_ORDER,
    RFQT_MAKER_ID_SET_FOR_RFQ_ORDER,
    RFQ_API_KEY_HASH_TO_MAKER_ID,
} from '../config';

import { pairUtils } from './pair_utils';

const getApiKeyHash = (apiKey: string): string => createHash('sha256').update(apiKey).digest('base64');

/**
 * ConfigManager is a simple wrapper around configs.
 *
 * It exists to provide a layer around our configs which can then be mocked while writing tests
 */
export class ConfigManager {
    public getAdminApiKey(): string | undefined {
        return ADMIN_API_KEY;
    }

    public getRfqmApiKeyWhitelist(): Set<string> {
        return RFQM_API_KEY_WHITELIST;
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
     * Get a set of makers that support RFQt workflow with rfq order type
     */
    public getRfqtMakerIdSetForRfqOrder(): MakerIdSet {
        return RFQT_MAKER_ID_SET_FOR_RFQ_ORDER;
    }

    /**
     * Get a set of makers that support RFQm workflow
     */
    public getRfqmMakerIdSet(): MakerIdSet {
        return RFQM_MAKER_ID_SET;
    }

    /**
     * Get a set of makers that support RFQm workflow with rfq order type
     */
    public getRfqmMakerIdSetForRfqOrder(): MakerIdSet {
        return RFQM_MAKER_ID_SET_FOR_RFQ_ORDER;
    }

    /**
     * Get a set of makers that support RFQm workflow with otc order type
     */
    public getRfqmMakerIdSetForOtcOrder(): MakerIdSet {
        return RFQM_MAKER_ID_SET_FOR_OTC_ORDER;
    }

    /**
     * Get fee model constant for given pair on a given chain.
     */
    public getFeeModelConfiguration(chainId: number, tokenA: string, tokenB: string): FeeModelConfiguration {
        if (FEE_MODEL_CONFIGURATION_MAP.has(chainId)) {
            const pairKey = pairUtils.toKey(tokenA, tokenB);
            const innerMap = FEE_MODEL_CONFIGURATION_MAP.get(chainId)!;
            if (innerMap.has(pairKey)) {
                return innerMap.get(pairKey)!;
            }
        }

        return DEFAULT_FEE_MODEL_CONFIGURATION;
    }
}
