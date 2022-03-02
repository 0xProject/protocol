import { ChainId } from '@0x/contract-addresses';
import { addressUtils } from '@0x/utils';
import { isArray } from 'lodash';

import { RfqMaker } from '../entities';
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
     * Validates that the URIs (either rfqtUri or rfqmUri) specified by client is a valid URI or null.
     */
    public static validateUriOrThrow(fieldName: string, uri: string | null | undefined): void {
        if (uri === null) {
            return;
        }

        if (uri === undefined || !uri.startsWith('http')) {
            throw new Error(`Invalid value of ${fieldName}: ${uri}`);
        }
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
     * Get the config of a maker on a given blockchain from DB.
     * Return a `RfqMaker` which specifies makerId, chainId, update time, the pairs array, rfqtUri and rfqmUir.
     * If not found in DB, return the default entity for the makerId and chainId with empty pairs array, and `null` URIs.
     */
    public async getRfqMakerAsync(makerId: string, chainId: number): Promise<RfqMaker> {
        const result = await this._dbUtils.getRfqMakerAsync(makerId, chainId);
        return result ?? new RfqMaker({ makerId, chainId, updatedAt: null, pairs: [], rfqtUri: null, rfqmUri: null });
    }

    /**
     * Create or update a record in the `rfq_maker_pairs` DB table for the maker on a given blockchain.
     * Return the `RfqMaker` entity which represents the new record.
     */
    public async createOrUpdateRfqMakerAsync(
        makerId: string,
        chainId: number,
        pairs: [string, string][],
        rfqtUri: string | null,
        rfqmUri: string | null,
    ): Promise<RfqMaker> {
        return this._dbUtils.createOrUpdateRfqMakerAsync(makerId, chainId, pairs, rfqtUri, rfqmUri);
    }

    /**
     * Update one or more fields of a record in the `rfq_maker_pairs` DB table for the maker on a given blockchain.
     * Return the `RfqMaker` entity which represents the new record.
     */
    public async patchRfqMakerAsync(
        makerId: string,
        chainId: number,
        pairs: [string, string][] | undefined,
        rfqtUri: string | null | undefined,
        rfqmUri: string | null | undefined,
    ): Promise<RfqMaker> {
        const oldRfqMaker = await this.getRfqMakerAsync(makerId, chainId);

        return this.createOrUpdateRfqMakerAsync(
            makerId,
            chainId,
            pairs ?? oldRfqMaker.pairs,
            rfqtUri ?? oldRfqMaker.rfqtUri,
            rfqmUri ?? oldRfqMaker.rfqmUri,
        );
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
