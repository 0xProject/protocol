export interface FetchTokenPriceParams {
    chainId: number;
    tokenAddress: string;
}

export interface FetchTokenPriceResult {
    chainId: number;
    tokenAddress: string;
    priceInUsd: number | null;
}

export interface TokenPriceOracle {
    batchFetchTokenPriceAsync(params: FetchTokenPriceParams[]): Promise<FetchTokenPriceResult[]>;
}
