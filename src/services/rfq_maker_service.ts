import { ChainId } from '@0x/contract-addresses';
import { addressUtils } from '@0x/utils';
import { isArray } from 'lodash';

import { RfqMakerPairs } from '../entities';
import { ConfigManager } from '../utils/config_manager';
import { RfqMakerDbUtils } from '../utils/rfq_maker_db_utils';

/**
 * RfqMakerService is the coordination layer for HTTP maker services.
 */
export class RfqMakerService {
    /**
     * Validates that the chainId specified by client is a valid (and known) chain ID.
     */
    public static isValidChainId(chainId: any): chainId is ChainId {
        return Object.values(ChainId).includes(Number(chainId));
    }

    /**
     * Validates that a payload of market maker pairs is well-formed
     * and contains valid contract addresses.
     *
     * @throws if the payload is invalid
     */
    public static validatePairsPayloadOrThrow(pairs: [string, string][]): void {
        if (!isArray(pairs)) {
            throw new Error('pairs is not an array.');
        }

        pairs.forEach((pair, i) => {
            if (!isArray(pair)) {
                throw new Error(`pair ${i} is not an array.`);
            }
            if (pair.length !== 2) {
                throw new Error(`pair ${i} array does not consist of exactly two elements.`);
            }
            if (!addressUtils.isAddress(pair[0])) {
                throw new Error(`address of first token for pair ${i} is invalid.`);
            }
            if (!addressUtils.isAddress(pair[1])) {
                throw new Error(`address of second token for pair ${i} is invalid.`);
            }
            if (pair[0] === pair[1]) {
                throw new Error(`pair array ${i} has identical assets.`);
            }
        });
    }

    constructor(private readonly _dbUtils: RfqMakerDbUtils, private readonly _configManager: ConfigManager) {}

    /**
     * Get the pairs a maker supports on a given blockchain from DB.
     * Return a `RfqMakerPairs` entity which specifies makerId, chainId, update time and the pairs array.
     * If not found in DB, return the default entity for the makerId and chainId with empty pairs array.
     */
    public async getPairsAsync(makerId: string, chainId: number): Promise<RfqMakerPairs> {
        const result = await this._dbUtils.getPairsAsync(makerId, chainId);
        return result ?? new RfqMakerPairs({ makerId, chainId, updatedAt: null, pairs: [] });
    }

    /**
     * Create or update a record in the `rfq_maker_pairs` DB table for the maker on a given blockchain.
     * Return the `RfqMakerPairs` entity which represents the new record.
     */
    public async createOrUpdatePairsAsync(
        makerId: string,
        chainId: number,
        pairs: [string, string][],
    ): Promise<RfqMakerPairs> {
        return this._dbUtils.createOrUpdatePairsAsync(makerId, chainId, pairs);
    }

    /**
     * Maps the given maker API key to makerId.
     * Returns null is the input key is `undefined` or unknown.
     */
    public mapMakerApiKeyToId(apiKey: string | undefined): string | null {
        if (apiKey === undefined) {
            return null;
        }

        return this._configManager.getRfqMakerIdForApiKey(apiKey) || null;
    }
}
