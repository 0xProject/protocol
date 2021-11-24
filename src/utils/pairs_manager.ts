import { RfqMakerAssetOfferings } from '@0x/asset-swapper';

import { ConfigManager } from './config_manager';

/**
 * Generate a lookup key from two tokens
 */
const toKey = (tokenA: string, tokenB: string): string => {
    return [tokenA, tokenB]
        .map((str) => str.toLowerCase())
        .sort()
        .join('-');
};

/**
 * Transform RfqMakerAssetOfferings into an object of the form:
 *
 * {
 *   "0xtokenA-0xtokenB": ["https://maker1.asdf", "https://maker2.asdf"],
 *   "0xtokenC-0xtokenD": ["https://maker1.asdf", "https://maker2.asdf"]
 * }
 */
const generatePairToMakerUriMap = (offerings: RfqMakerAssetOfferings): PairsToUris => {
    if (!offerings) {
        return {};
    }

    const makerUris = Object.keys(offerings);
    const res: PairsToUris = {};
    makerUris.forEach((makerUri) => {
        const pairs = offerings[makerUri];
        pairs.forEach((pair) => {
            const key = toKey(...pair);
            if (res[key] !== undefined) {
                res[key].push(makerUri);
            } else {
                res[key] = [makerUri];
            }
        });
    });

    return res;
};

type PairsToUris = Record<string, string[]>;

/**
 * PairsManager abstracts away all operations for handling maker pairs
 */
export class PairsManager {
    private readonly _rfqmOfferings: RfqMakerAssetOfferings;
    private readonly _rfqmPairToMakerUris: PairsToUris;
    private readonly _rfqtPairToMakerUris: PairsToUris;

    constructor(private readonly _configManager: ConfigManager) {
        this._rfqmOfferings = _configManager.getRfqmAssetOfferings();
        const rfqtOfferings = _configManager.getRfqtAssetOfferings();

        this._rfqmPairToMakerUris = generatePairToMakerUriMap(this._rfqmOfferings);
        this._rfqtPairToMakerUris = generatePairToMakerUriMap(rfqtOfferings);
    }

    /**
     * Get a list of RFQt Maker Uris that support this pair
     */
    public getRfqtMakerUrisForPair(makerToken: string, takerToken: string): string[] {
        return this._rfqtPairToMakerUris[toKey(makerToken, takerToken)] || [];
    }

    /**
     * Get a list of RFQm Maker Uris that support this pair
     */
    public getRfqmMakerUrisForPair(makerToken: string, takerToken: string): string[] {
        return this._rfqmPairToMakerUris[toKey(makerToken, takerToken)] || [];
    }

    /**
     * Get a list of RFQm Maker Uris that support this pair on OtcOrder
     */
    public getRfqmMakerUrisForPairOnOtcOrder(makerToken: string, takerToken: string): string[] {
        const otcMakerSet = this._configManager.getRfqmMakerSetForOtcOrder();
        const makerUris = this.getRfqmMakerUrisForPair(makerToken, takerToken);

        return makerUris.filter((makerUri) => otcMakerSet.has(makerUri));
    }

    /**
     * Get the RfqMakerAssetOfferings for RfqOrder
     */
    public getRfqmMakerOfferingsForRfqOrder(): RfqMakerAssetOfferings {
        const rfqMakerSet = this._configManager.getRfqmMakerSetForRfqOrder();
        const rfqMakerOfferings = { ...this._rfqmOfferings };
        for (const makerUri in rfqMakerOfferings) {
            if (!rfqMakerSet.has(makerUri)) {
                delete rfqMakerOfferings[makerUri];
            }
        }

        return rfqMakerOfferings;
    }
}
