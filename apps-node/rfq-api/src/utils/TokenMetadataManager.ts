import { getTokenMetadataIfExists } from '@0x/token-metadata';
import { logger } from '../logger';
import { RfqBlockchainUtils } from './rfq_blockchain_utils';

export class TokenMetadataManager {
    private readonly _tokenDecimalsCache: Map<string, number> = new Map();

    public constructor(private readonly _chainId: number, private readonly _blockchainUtils: RfqBlockchainUtils) {}

    /**
     * Utility function to get the decimals for an ERC20 token by its address.
     * First checks 0x/token-metadata for the information, and if not present,
     * queries the data from the blockchain.
     *
     * Uses an in-memory cache to store previously-fetched values.
     *
     * Throws if there is a problem fetching the data from on chain.
     */
    public async getTokenDecimalsAsync(tokenAddress: string): Promise<number> {
        const localMetadata = getTokenMetadataIfExists(tokenAddress, this._chainId);
        if (localMetadata) {
            return localMetadata.decimals;
        }
        const cachedDecimals = this._tokenDecimalsCache.get(tokenAddress);
        if (cachedDecimals) {
            return cachedDecimals;
        }
        const onchainDecimals = await this._blockchainUtils.getTokenDecimalsAsync(tokenAddress);
        logger.info(
            { tokenAddress, decimals: onchainDecimals, cacheSize: this._tokenDecimalsCache.size },
            'Token decimals fetched from blockchain',
        );
        this._tokenDecimalsCache.set(tokenAddress, onchainDecimals);
        return onchainDecimals;
    }
}
