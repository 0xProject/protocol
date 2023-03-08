import { BigNumber } from '@0x/utils';
import { linearBuckets } from 'prom-client';

// tslint:disable:custom-no-magic-numbers

export const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
export const NULL_BYTES = '0x';
export const ZRX_DECIMALS = 18;
export const DEFAULT_PAGE = 1;
export const DEFAULT_PER_PAGE = 20;
export const ZERO = new BigNumber(0);
export const ONE = new BigNumber(1);
export const MAX_TOKEN_SUPPLY_POSSIBLE = new BigNumber(2).pow(256);
export const DEFAULT_LOCAL_POSTGRES_URI = 'postgres://api:api@localhost/api';
export const DEFAULT_LOCAL_REDIS_URI = 'redis://localhost';
export const DEFAULT_LOGGER_INCLUDE_TIMESTAMP = true;
export const ONE_SECOND_MS = 1000;
export const ONE_MINUTE_MS = ONE_SECOND_MS * 60;
export const TEN_MINUTES_MS = ONE_MINUTE_MS * 10;
export const DEFAULT_VALIDATION_GAS_LIMIT = 10e6;
export const HEX_BASE = 16;
export const PROTOCOL_FEE = 0;

// Swap Quoter
export const QUOTE_ORDER_EXPIRATION_BUFFER_MS = ONE_SECOND_MS * 60; // Ignore orders that expire in 60 seconds
const GAS_LIMIT_BUFFER_PERCENTAGE = 0.1; // Add 10% to the estimated gas limit
export const GAS_LIMIT_BUFFER_MULTIPLIER = GAS_LIMIT_BUFFER_PERCENTAGE + 1;
export const DEFAULT_QUOTE_SLIPPAGE_PERCENTAGE = 0.01; // 1% Slippage
export const DEFAULT_FALLBACK_SLIPPAGE_PERCENTAGE = 0.015; // 1.5% Slippage in a fallback route
export const ETH_SYMBOL = 'ETH';
export const WETH_SYMBOL = 'WETH';
export const ADDRESS_HEX_LENGTH = 42;
export const DEFAULT_TOKEN_DECIMALS = 18;
export const FIRST_PAGE = 1;
export const PERCENTAGE_SIG_DIGITS = 4;
export const PROTOCOL_FEE_UTILS_POLLING_INTERVAL_IN_MS = 6000;
export const TX_BASE_GAS = new BigNumber(21000);
export const UNWRAP_WETH_GAS = new BigNumber(25000);
export const WRAP_ETH_GAS = UNWRAP_WETH_GAS;
export const UNWRAP_QUOTE_GAS = TX_BASE_GAS.plus(UNWRAP_WETH_GAS);
export const WRAP_QUOTE_GAS = UNWRAP_QUOTE_GAS;
export const AFFILIATE_FEE_TRANSFORMER_GAS = new BigNumber(15000);
export const POSITIVE_SLIPPAGE_FEE_TRANSFORMER_GAS = new BigNumber(30000);
export const ONE_GWEI = new BigNumber(1000000000);

// RFQM Service
export const KEEP_ALIVE_TTL = ONE_MINUTE_MS * 5;
export const RFQM_TRANSACTION_WATCHER_SLEEP_TIME_MS = ONE_SECOND_MS * 15;
export const RFQM_NUM_BUCKETS = 1000;

// API namespaces
export const SRA_PATH = '/sra/v4';
export const SWAP_PATH = '/swap/v1';
export const META_TRANSACTION_PATH = '/meta_transaction/v1';
export const METRICS_PATH = '/metrics';
export const RFQM_PATH = '/rfqm/v1';
export const ORDERBOOK_PATH = '/orderbook/v1';
export const API_KEY_HEADER = '0x-api-key';
export const HEALTHCHECK_PATH = '/healthz';

// Docs
export const SWAP_DOCS_URL = 'https://0x.org/docs/api#swap';
export const SRA_DOCS_URL = 'https://0x.org/docs/api#sra';
export const META_TRANSACTION_DOCS_URL = 'https://0x.org/docs/api#meta_transaction';

// Meta Transactions
export const DEFAULT_ETH_GAS_STATION_API_URL = 'https://ethgasstation.api.0x.org/api/ethgasAPI.json';
export const UNSTICKING_TRANSACTION_GAS_MULTIPLIER = 1.1;
export const ETH_TRANSFER_GAS_LIMIT = 21000;
export const TX_HASH_RESPONSE_WAIT_TIME_MS = ONE_SECOND_MS * 100;
export const SUBMITTED_TX_DB_POLLING_INTERVAL_MS = 200;
export const PUBLIC_ADDRESS_FOR_ETH_CALLS = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B';

// TransactionWatcher
// The expected time of a transaction to be mined according to ETHGasStation
// "Fast" gas price estimations multiplied by a safety margin.
export const DEFAULT_EXPECTED_MINED_SEC = 120 * 1.5;
export const TX_WATCHER_POLLING_INTERVAL_MS = ONE_SECOND_MS * 5;
export const NUMBER_OF_BLOCKS_UNTIL_CONFIRMED = 3;
export const TX_WATCHER_UPDATE_METRICS_INTERVAL_MS = ONE_SECOND_MS * 30;
export const ETH_DECIMALS = 18;
export const GWEI_DECIMALS = 9;
export const META_TXN_MIN_SIGNER_ETH_BALANCE = 0.1;
export const SIGNER_STATUS_DB_KEY = 'signer_status';

// Market Depth
export const MARKET_DEPTH_MAX_SAMPLES = 50;
export const MARKET_DEPTH_DEFAULT_DISTRIBUTION = 1.05;
export const MARKET_DEPTH_END_PRICE_SLIPPAGE_PERC = 20;

// Logging
export const NUMBER_SOURCES_PER_LOG_LINE = 12;

// RFQ Quote Validator expiration threshold
export const RFQ_FIRM_QUOTE_CACHE_EXPIRY = ONE_MINUTE_MS * 2;
export const RFQ_ALLOWANCE_TARGET = '0xdef1c0ded9bec7f1a1670819833240f027b25eff';
export const RFQM_MINIMUM_EXPIRY_DURATION_MS = ONE_MINUTE_MS;
export const RFQM_TX_GAS_ESTIMATE = 165e3;
export const RFQ_DYNAMIC_BLACKLIST_TTL = ONE_SECOND_MS * 30;

// SQS Client
export const LONG_POLLING_WAIT_TIME_SECONDS = 20;
export const SINGLE_MESSAGE = 1;

// General cache control
export const DEFAULT_CACHE_AGE_SECONDS = 13;

// Prometheus shared metrics
export const PROMETHEUS_REQUEST_BUCKETS = linearBuckets(0, 0.25, 25); // [ 0,  0.25,  0.5,  0.75, ... 5 ]
