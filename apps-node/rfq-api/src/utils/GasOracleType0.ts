import { BigNumber } from '@0x/utils';
import { AxiosInstance } from 'axios';
import { OK } from 'http-status-codes';

/**
 * Response format from e.g. https://gas.polygon.api.0x.org/source/median
 */
export interface TMedianResponse {
    result: {
        source: 'MEDIAN';
        timestamp: number; // Unix SECONDS
        instant: number; // wei
        fast: number; // wei
        standard: number; // wei
        low: number; // wei
    };
}

const TIMEOUT_MS = 250;

/**
 * A client to wrap the functionality of the 0x Gas Price Oracle
 * (https://github.com/0xProject/gas-price-oracle) non-"v2" endpoints
 * which return type 0 gas data
 */
export class GasOracleType0 {
    private readonly _url: string;
    private readonly _axiosInstance: AxiosInstance;

    /**
     * Creates an instance of `GasOracleType0`.
     *
     * Verifies that the URL is of the format
     * "http://gas-price-oracle-svc.gas-price-oracle/source/median", that way
     * we don't accidentally put in a v2 (EIP1559) URL.
     */
    public static create(url: string, axiosInstance: AxiosInstance): GasOracleType0 {
        const domainRegex = /^https?:\/\/[^/]*\/source\/median$/;
        if (!domainRegex.test(url)) {
            throw new Error(
                `Error creating GasOracleType0: URL ${url} is not of the expected format.
                Make sure you aren't trying to use a "v2" URL with GasOracleType0`,
            );
        }
        return new GasOracleType0(url, axiosInstance);
    }

    /**
     * Fetch the current "fast" gas price being reported by the oracle, in WEI
     */
    public async getGasWeiAsync(speed: 'instant' | 'fast' | 'standard' | 'low'): Promise<BigNumber> {
        const response = await this._axiosInstance.get<TMedianResponse>(this._url, {
            timeout: TIMEOUT_MS,
        });
        if (response.status !== OK) {
            throw new Error('Failed to request base fee from gas price oracle');
        }
        try {
            const gasFee = new BigNumber(response.data.result[speed]);
            if (gasFee.isNaN()) {
                throw new Error(`Malformed gas fee response: ${response.data.result[speed]}`);
            }

            return gasFee;
        } catch (e) {
            throw new Error(
                `Response from gas price oracle did not include the expected values:
                ${e.message} ${JSON.stringify(response.data)}`,
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
