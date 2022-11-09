import { BigNumber } from '@0x/utils';
import * as heartbeats from 'heartbeats';

import { constants } from '../constants';
import { SwapQuoterError } from '../types';

const MAX_ERROR_COUNT = 5;

interface GasOracleResponse {
    result: {
        // gas price in wei
        fast: number;
    };
}

export class ProtocolFeeUtils {
    private static _instances = new Map<string, ProtocolFeeUtils>();
    private readonly _zeroExGasApiUrl: string;
    private readonly _gasPriceHeart: any;
    private _gasPriceEstimation: BigNumber = constants.ZERO_AMOUNT;
    private _errorCount = 0;

    public static getInstance(
        gasPricePollingIntervalInMs: number,
        zeroExGasApiUrl: string = constants.ZERO_EX_GAS_API_URL,
    ): ProtocolFeeUtils {
        if (!ProtocolFeeUtils._instances.has(zeroExGasApiUrl)) {
            ProtocolFeeUtils._instances.set(
                zeroExGasApiUrl,
                new ProtocolFeeUtils(gasPricePollingIntervalInMs, zeroExGasApiUrl),
            );
        }

        const instance = ProtocolFeeUtils._instances.get(zeroExGasApiUrl);
        if (instance === undefined) {
            // should not be reachable
            throw new Error(`Singleton for ${zeroExGasApiUrl} was not initialized`);
        }

        return instance;
    }

    /** @returns gas price (in wei) */
    public async getGasPriceEstimationOrThrowAsync(shouldHardRefresh?: boolean): Promise<BigNumber> {
        if (this._gasPriceEstimation.eq(constants.ZERO_AMOUNT)) {
            return this._getGasPriceFromGasStationOrThrowAsync();
        }
        if (shouldHardRefresh) {
            return this._getGasPriceFromGasStationOrThrowAsync();
        } else {
            return this._gasPriceEstimation;
        }
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

    private async _getGasPriceFromGasStationOrThrowAsync(): Promise<BigNumber> {
        try {
            const res = await fetch(this._zeroExGasApiUrl);
            const gasInfo: GasOracleResponse = await res.json();
            const gasPriceWei = new BigNumber(gasInfo.result.fast);
            // Reset the error count to 0 once we have a successful response
            this._errorCount = 0;
            return gasPriceWei;
        } catch (e) {
            this._errorCount++;
            // If we've reached our max error count then throw
            if (this._errorCount > MAX_ERROR_COUNT || this._gasPriceEstimation.isZero()) {
                this._errorCount = 0;
                throw new Error(SwapQuoterError.NoGasPriceProvidedOrEstimated);
            }
            return this._gasPriceEstimation;
        }
    }

    private _initializeHeartBeat(): void {
        this._gasPriceHeart.createEvent(1, async () => {
            this._gasPriceEstimation = await this._getGasPriceFromGasStationOrThrowAsync();
        });
    }
}
