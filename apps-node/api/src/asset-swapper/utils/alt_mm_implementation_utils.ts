import { AltOffering } from '../types';

/**
 * Returns the AltOffering if it exists for a given pair
 */
export function getAltMarketInfo(
    offerings: AltOffering[],
    buyTokenAddress: string,
    sellTokenAddress: string,
): AltOffering | undefined {
    for (const offering of offerings) {
        if (
            (buyTokenAddress.toLowerCase() === offering.baseAsset.toLowerCase() &&
                sellTokenAddress.toLowerCase() === offering.quoteAsset.toLowerCase()) ||
            (sellTokenAddress.toLowerCase() === offering.baseAsset.toLowerCase() &&
                buyTokenAddress.toLowerCase() === offering.quoteAsset.toLowerCase())
        ) {
            return offering;
        }
    }
    return undefined;
}
