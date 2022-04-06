import { BigNumber } from '@0x/utils';
import { AxiosInstance } from 'axios';
import { OK } from 'http-status-codes';

/**
 * Response format from https://github.com/0xProject/gas-price-oracle
 * for "v2" endpoints
 */
export interface T0xGasPriceOracleResponse {
    result: TResult;
}

export interface TResult {
    source: string;
    timestamp: number;
    instant: TRates;
    fast: TRates;
    standard: TRates;
    low: TRates;
}

export interface TRates {
    price: number;
    maxPriorityFeePerGas: number;
    maxFeePerGas: number;
    baseFeePerGas: number;
}

const TIMEOUT_MS = 250;

/**
 * A client to wrap the functionality of the 0x Gas Price Oracle
 * (https://github.com/0xProject/gas-price-oracle) "v2" endpoints
 * which provide support for EIP1559
 */
export class GasOracle {
    private readonly _url: string;
    private readonly _axiosInstance: AxiosInstance;

    /**
     * Creates an instance of `GasOracle`.
     *
     * The URL is parsed so that we can use the "eth gas station" URL format
     * present in the config, eg:
     * "http://gas-price-oracle-svc.gas-price-oracle/source/median?output=eth_gas_station".
     *
     * The function transforms this URL into a v2 URL which will report EIP1559-data.
     */
    public static create(url: string, axiosInstance: AxiosInstance): GasOracle {
        const domainRegex = /https?:\/\/(?<domain>(\w|\d|-|\.)*)/;
        const result = domainRegex.exec(url);
        const domain = result?.groups?.domain;
        if (!domain) {
            throw new Error(`Unable to extract domain for url ${url}`);
        }
        return new GasOracle(`http://${domain}/v2/source/median`, axiosInstance);
    }

    /**
     * Fetch the current baseFeePerGas being reported by the oracle
     */
    public async getBaseFeePerGasWeiAsync(): Promise<BigNumber> {
        const response = await this._axiosInstance.get<T0xGasPriceOracleResponse>(this._url, {
            timeout: TIMEOUT_MS,
        });
        if (response.status !== OK) {
            throw new Error('Failed to request base fee from gas price oracle');
        }
        try {
            // All the speed levels have the same base fee, so just use 'instant'
            const baseFee = response.data.result.instant.baseFeePerGas;
            return new BigNumber(baseFee);
        } catch (e) {
            throw new Error(`Response from gas price oracle did not include the base fee: ${e.message}`);
        }
    }

    /**
     * Fetch the current maxPriorityFeePerGas, aka "tip", being reported by the oracle
     */
    public async getMaxPriorityFeePerGasWeiAsync(speed: 'instant' | 'fast' | 'standard' | 'low'): Promise<BigNumber> {
        const response = await this._axiosInstance.get<T0xGasPriceOracleResponse>(this._url, {
            timeout: TIMEOUT_MS,
        });
        if (response.status !== OK) {
            throw new Error('Failed to request base fee from gas price oracle');
        }
        try {
            const maxPriorityFee = response.data.result[speed].maxPriorityFeePerGas;
            return new BigNumber(maxPriorityFee);
        } catch (e) {
            throw new Error(
                `Response from gas price oracle did not include the expected maxPriorityFeePerGas: ${e.message}`,
            );
        }
    }

    /**
     * Constructor is marked `private` to force users to use the static
     * creator functions, which validate the URL.
     */
    private constructor(url: string, axiosInsatnce: AxiosInstance) {
        this._axiosInstance = axiosInsatnce;
        this._url = url;
    }
}
