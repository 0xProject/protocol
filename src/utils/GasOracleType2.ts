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
export class GasOracleType2 {
    private readonly _url: string;
    private readonly _axiosInstance: AxiosInstance;

    /**
     * Creates an instance of `GasOracleType2`.
     *
     * Verifies that the URL is of the format
     * "http://gas-price-oracle-svc.gas-price-oracle/v2/source/median", that way
     * we don't accidentally put in a v0 URL.
     */
    public static create(url: string, axiosInstance: AxiosInstance): GasOracleType2 {
        const domainRegex = /^https?:\/\/[^/]*\/v2\/source\/median$/;
        if (!domainRegex.test(url)) {
            throw new Error(
                `Error creating GasOracleType2: URL ${url} is not of the expected format.
                Make sure you aren't trying to use a v0 URL with GasOracleType2`,
            );
        }
        return new GasOracleType2(url, axiosInstance);
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
    private constructor(url: string, axiosInstance: AxiosInstance) {
        this._axiosInstance = axiosInstance;
        this._url = url;
    }
}
