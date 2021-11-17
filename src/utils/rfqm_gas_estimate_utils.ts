import { RFQM_TX_GAS_ESTIMATE, RFQM_TX_OTC_ORDER_GAS_ESTIMATE } from '../constants';

// ERC-20 tokens implement their own `transfer` and `transferFrom` functions, resulting in
// different gas amounts used. These premia allow us to better estimate the gas each token uses
const TOKEN_GAS_PREMIUM: Record<string, number> = {
    '0x111111111117dc0aa78b770fa6a738034120c302': 6e3, // 1INCH
    '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9': 160e3, // AAVE
    '0x514910771af9ca656af840dff83e8264ecf986ca': 15e3, // LINK
    '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': 10e3, // UNI
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 25e3, // USDC
    '0xdac17f958d2ee523a2206206994597c13d831ec7': 20e3, // USDT
    '0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e': 10e3, // YFI
};

/**
 * Prepares the gas estimate for an RFQM trade
 */
export function calculateGasEstimate(makerToken: string, takerToken: string, orderType: 'rfq' | 'otc'): number {
    const makerTokenPremium: number = TOKEN_GAS_PREMIUM[makerToken.toLowerCase()] || 0;
    const takerTokenPremium: number = TOKEN_GAS_PREMIUM[takerToken.toLowerCase()] || 0;
    const baseGas = orderType === 'otc' ? RFQM_TX_OTC_ORDER_GAS_ESTIMATE : RFQM_TX_GAS_ESTIMATE;

    return baseGas + makerTokenPremium + takerTokenPremium;
}
