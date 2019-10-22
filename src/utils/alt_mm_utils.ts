import { AltOffering, AltRfqMakerAssetOfferings } from '@0x/asset-swapper';

interface AltRfqAsset {
    address: string;
    decimals: number;
    type: string;
}

interface AltRfqMarket {
    id: string;
    base: AltRfqAsset;
    quote: AltRfqAsset;
    status: string;
}

interface AltRfqMarketsResponse {
    items: AltRfqMarket[];
}

/**
 * Parses an alt RFQ MM markets response into AltRfqtMakerAssetOfferings
 * @param altRfqMarketsResponse response from an alt RFQ MM markets request
 * @param altRfqUrl base URL
 */
export function altMarketResponseToAltOfferings(
    altRfqMarketsResponse: AltRfqMarketsResponse,
    altRfqUrl: string,
): AltRfqMakerAssetOfferings {
    const offerings: AltOffering[] = altRfqMarketsResponse.items.map((market) => {
        return {
            id: market.id,
            baseAsset: market.base.address.toLowerCase(),
            baseAssetDecimals: market.base.decimals,
            quoteAsset: market.quote.address.toLowerCase(),
            quoteAssetDecimals: market.quote.decimals,
        };
    });

    return { [altRfqUrl]: offerings };
}
