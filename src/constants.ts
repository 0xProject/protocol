import { BigNumber } from '@0x/utils';

export const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
export const NULL_BYTES = '0x';
export const DEFAULT_PAGE = 1;
export const DEFAULT_PER_PAGE = 20;
export const ZERO = new BigNumber(0);
export const ONE = new BigNumber(1);
export const DEFAULT_LOGGER_INCLUDE_TIMESTAMP = true;
export const ONE_SECOND_MS = 1000;
export const ONE_MINUTE_MS = ONE_SECOND_MS * 60;
export const ONE_HOUR_MS = ONE_MINUTE_MS * 60;
export const TEN_MINUTES_MS = ONE_MINUTE_MS * 10;
export const DEFAULT_VALIDATION_GAS_LIMIT = 10e6;
export const HEX_BASE = 16;

// Swap Quoter
export const QUOTE_ORDER_EXPIRATION_BUFFER_MS = ONE_SECOND_MS * 60; // Ignore orders that expire in 60 seconds
const GAS_LIMIT_BUFFER_PERCENTAGE = 0.1; // Add 10% to the estimated gas limit
export const GAS_LIMIT_BUFFER_MULTIPLIER = GAS_LIMIT_BUFFER_PERCENTAGE + 1;
export const DEFAULT_QUOTE_SLIPPAGE_PERCENTAGE = 0.01; // 1% Slippage
export const DEFAULT_PRICE_IMPACT_PROTECTION_PERCENTAGE = 1.0; // 100%
export const PERCENTAGE_SIG_DIGITS = 4;
export const TX_BASE_GAS = new BigNumber(21000);
export const AFFILIATE_FEE_TRANSFORMER_GAS = new BigNumber(15000);
export const POSITIVE_SLIPPAGE_FEE_TRANSFORMER_GAS = new BigNumber(30000);
export const ONE_GWEI = new BigNumber(1000000000);
export const AFFILIATE_DATA_SELECTOR = '869584cd';
export const DEFAULT_META_TX_MIN_ALLOWED_SLIPPAGE = 0.001;
export const AVG_MULTIPLEX_TRANFORM_ERC_20_GAS = new BigNumber(933e3);
/**
 * `transformerTransfer` estimated gas (used by `AffiliateFeeTransformer`):
 * - Decrease balance of the owner (flash wallet):
 *   - SLOAD: 2,100
 *   - SSTORE: 2,900 (original value is non-zero)
 * - Increase balance of the spender (fee recipient):
 *   - SLOAD: 2,100
 *   - SSTORE: 20,000 (worst case scenario: original value is zero)
 */
export const TRANSFER_GAS = new BigNumber(27e3);
/**
 * `_transferERC20TokensFrom` estimated gas (used by `FixinTokenSpender`):
 * - Decrease balance of the owner (taker):
 *   - SLOAD: 2,100
 *   - SSTORE: 2,900 (original value is non-zero)
 * - Increase balance of the spender (one of the 0x contracts):
 *   - SLOAD: 2,100
 *   - SSTORE: 20,000 (worst case scenario: original value is zero)
 * - Decrease allowance of the spender if necessary (one of the 0x contracts)
 *   - SLOAD: 2,100
 *   - SSTORE: 2,900 (original value is non-zero)
 */
export const TRANSFER_FROM_GAS = new BigNumber(32e3);

// API namespaces
export const SRA_PATH = '/sra/v4';
export const SWAP_PATH = '/swap/v1';
export const META_TRANSACTION_V1_PATH = '/meta_transaction/v1';
export const META_TRANSACTION_V2_PATH = '/meta_transaction/v2';
export const METRICS_PATH = '/metrics';
export const ORDERBOOK_PATH = '/orderbook/v1';
export const HEALTHCHECK_PATH = '/healthz';

// Docs
export const SWAP_DOCS_URL = 'https://0x.org/docs/api#swap';
export const SRA_DOCS_URL = 'https://0x.org/docs/api#sra';
export const META_TRANSACTION_DOCS_URL = 'https://0x.org/docs/api#meta_transaction';

export const DEFAULT_ZERO_EX_GAS_API_URL = 'https://gas.api.0x.org/source/median';

// RFQ Quote Validator expiration threshold
export const RFQ_FIRM_QUOTE_CACHE_EXPIRY = ONE_MINUTE_MS * 2;
export const RFQ_ALLOWANCE_TARGET = '0xdef1c0ded9bec7f1a1670819833240f027b25eff';
export const RFQ_DYNAMIC_BLACKLIST_TTL = ONE_SECOND_MS * 30;

// General cache control
export const DEFAULT_CACHE_AGE_SECONDS = 13;

// Number of base points in 1
export const ONE_IN_BASE_POINTS = 10000;

// Whether Slippage Protect is enabled by default
export const DEFAULT_ENABLE_SLIPPAGE_PROTECTION = true;
