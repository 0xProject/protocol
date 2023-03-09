import { RFQM_TX_GAS_ESTIMATE, RFQM_TX_OTC_ORDER_GAS_ESTIMATE } from '../core/constants';

// ERC-20 tokens implement their own `transfer` and `transferFrom` functions, resulting in
// different gas amounts used. These premia allow us to better estimate the gas each token uses
// NOTE: Addresses must be in lower case
const TOKEN_GAS_PREMIUM: Record<string, number> = {
    // Mainnet
    /* 1INCH  */ '0x111111111117dc0aa78b770fa6a738034120c302': 6e3,
    /* AAVE   */ '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9': 160e3,
    /* BADGER */ '0x3472a5a71965499acd81997a54bba8d852c6e53d': 100e3,
    /* DOUGH  */ '0xad32a8e6220741182940c5abf610bde99e737b2d': 100e3,
    /* DYDX   */ '0x92d6c1e31e14520e676a687f0a93788b716beff5': 140e3,
    /* ENS    */ '0xc18360217d8f7ab5e7c516566761ea12ce7f9d72': 40e3,
    /* HOPR   */ '0xf5581dfefd8fb0e4aec526be659cfab1f8c781da': 70e3,
    /* LDO    */ '0x5a98fcbea516cf06857215779fd812ca3bef1b32': 100e3,
    /* LINK   */ '0x514910771af9ca656af840dff83e8264ecf986ca': 15e3,
    /* OCEAN  */ '0x967da4048cd07ab37855c090aaf366e4ce1b9f48': 15e3,
    /* SHIB   */ '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce': 15e3,
    /* SNX    */ '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f': 70e3,
    /* UMA    */ '0x04fa0d235c4abf4bcf4787af4cf447de572ef828': 75e3,
    /* UNI    */ '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': 10e3,
    /* USDC   */ '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 25e3,
    /* USDT   */ '0xdac17f958d2ee523a2206206994597c13d831ec7': 20e3,
    /* YFI    */ '0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e': 10e3,

    // Polygon
    /* USDC   */ '0x2791bca1f2de4661ed88a30c99a7a9449aa84174': 15e3,
    /* USDT   */ '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': 15e3,
    /* WETH   */ '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619': 15e3,
    /* WBTC   */ '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6': 15e3,
    /* DAI    */ '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063': 15e3,
    /* AAVE   */ '0xd6df932a45c0f255f85145f286ea0b292b21c90b': 15e3,
    /* LINK   */ '0xb0897686c545045afc77cf20ec7a532e3120e0f1': 15e3,
    /* LINK   */ '0x53e0bca35ec356bd5dddfebbd1fc0fd03fabad39': 15e3, // lol, yes, there are two LINK tokens on Polygon
    /* SHIB   */ '0x6f8a06447ff6fcf75d803135a7de15ce88c1d4ec': 15e3,
};

// If the buy token is native, an unwrap operation is needed which cost us additional gas.
// $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
// eslint-disable-next-line @typescript-eslint/no-inferrable-types
const UNWRAP_PREMIUM: number = 6e3;

/**
 * Prepares the gas estimate for an RFQM trade
 */
export function calculateGasEstimate(
    makerToken: string,
    takerToken: string,
    orderType: 'rfq' | 'otc',
    isUnwrap: boolean,
): number {
    const makerTokenPremium: number = TOKEN_GAS_PREMIUM[makerToken.toLowerCase()] || 0;
    const takerTokenPremium: number = TOKEN_GAS_PREMIUM[takerToken.toLowerCase()] || 0;
    const unwrapPremium: number = isUnwrap ? UNWRAP_PREMIUM : 0;
    const baseGas = orderType === 'otc' ? RFQM_TX_OTC_ORDER_GAS_ESTIMATE : RFQM_TX_GAS_ESTIMATE;

    return baseGas + makerTokenPremium + takerTokenPremium + unwrapPremium;
}
