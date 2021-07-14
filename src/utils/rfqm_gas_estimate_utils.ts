import { RFQM_TX_GAS_ESTIMATE } from '../constants';

const TOKEN_GAS_PREMIUM: Record<string, number> = {
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 20e3, // USDC
    '0xdac17f958d2ee523a2206206994597c13d831ec7': 20e3, // USDT
};

/**
 * Prepares the gas estimate for an RFQM trade
 */
export function calculateGasEstimate(makerToken: string, takerToken: string): number {
    const makerTokenPremium: number = TOKEN_GAS_PREMIUM[makerToken.toLowerCase()] || 0;
    const takerTokenPremium: number = TOKEN_GAS_PREMIUM[takerToken.toLowerCase()] || 0;

    return RFQM_TX_GAS_ESTIMATE + makerTokenPremium + takerTokenPremium;
}
