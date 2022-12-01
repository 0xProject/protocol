import * as heartbeats from 'heartbeats';

import { constants } from '../constants';
import { SwapQuoterError } from '../types';

const MAX_ERROR_COUNT = 5;

interface GasPrices {
    // gas price in wei
    fast: number;
    l1CalldataPricePerUnit?: number;
}
interface GasInfoResponse {
    result: GasPrices;
}

export class GasPriceUtils {
    private static _instances = new Map<string, GasPriceUtils>();
    private readonly _zeroExGasApiUrl: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: fix me!
    private readonly _gasPriceHeart: any;
    private _gasPriceEstimation: GasPrices | undefined;
    private _errorCount = 0;

    public static getInstance(
        gasPricePollingIntervalInMs: number,
        zeroExGasApiUrl: string = constants.ZERO_EX_GAS_API_URL,
    ): GasPriceUtils {
        if (!GasPriceUtils._instances.has(zeroExGasApiUrl)) {
            GasPriceUtils._instances.set(
                zeroExGasApiUrl,
                new GasPriceUtils(gasPricePollingIntervalInMs, zeroExGasApiUrl),
            );
        }

        const instance = GasPriceUtils._instances.get(zeroExGasApiUrl);
        if (instance === undefined) {
            // should not be reachable
            throw new Error(`Singleton for ${zeroExGasApiUrl} was not initialized`);
        }

        return instance;
    }

    public async getGasPriceEstimationOrDefault(defaultGasPrices: GasPrices): Promise<GasPrices> {
        if (this._gasPriceEstimation === undefined) {
            return defaultGasPrices;
        }

        return {
            ...defaultGasPrices,
            ...this._gasPriceEstimation,
        };
    }

    /** @returns gas price (in wei) */
    public async getGasPriceEstimationOrThrowAsync(): Promise<GasPrices> {
        if (this._gasPriceEstimation === undefined) {
            await this._updateGasPriceFromOracleOrThrow();
        }
        // eslint-disable-next-line  @typescript-eslint/no-non-null-assertion
        return this._gasPriceEstimation!;
    }

    /**
     * Destroys any subscriptions or connections.
     */
    public async destroyAsync(): Promise<void> {
        this._gasPriceHeart.kill();
    }

    private constructor(gasPricePollingIntervalInMs: number, zeroExGasApiUrl: string) {
        this._gasPriceHeart = heartbeats.createHeart(gasPricePollingIntervalInMs);
        this._zeroExGasApiUrl = zeroExGasApiUrl;
        this._initializeHeartBeat();
    }

    private async _updateGasPriceFromOracleOrThrow(): Promise<void> {
        try {
            const res = await fetch(this._zeroExGasApiUrl);
            const gasInfo: GasInfoResponse = await res.json();
            // Reset the error count to 0 once we have a successful response
            this._errorCount = 0;
            this._gasPriceEstimation = gasInfo.result;
        } catch (e) {
            this._errorCount++;
            // If we've reached our max error count then throw
            if (this._errorCount > MAX_ERROR_COUNT || this._gasPriceEstimation === undefined) {
                this._errorCount = 0;
                throw new Error(SwapQuoterError.NoGasPriceProvidedOrEstimated);
            }
        }
    }

    private _initializeHeartBeat(): void {
        this._gasPriceHeart.createEvent(1, async () => {
            await this._updateGasPriceFromOracleOrThrow();
        });
    }
}
