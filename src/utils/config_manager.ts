// tslint:disable: prefer-function-over-method
import { ChainId } from '@0x/contract-addresses';
import { createHash } from 'crypto';

import {
    CHAIN_ID,
    getIntegratorByIdOrThrow,
    getIntegratorIdForApiKey,
    Integrator,
    MakerIdSet,
    RFQM_API_KEY_WHITELIST,
    RFQM_MAKER_ID_SET,
    RFQM_MAKER_ID_SET_FOR_OTC_ORDER,
    RFQM_MAKER_ID_SET_FOR_RFQ_ORDER,
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
     * Get a set of makers that support RFQm workflow with either rfq or otc order types
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

    public getChainId(): ChainId {
        return CHAIN_ID;
    }
}
