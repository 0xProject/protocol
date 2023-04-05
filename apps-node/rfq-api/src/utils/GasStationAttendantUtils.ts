import { AxiosInstance } from 'axios';

import { ChainConfiguration } from '../config';
import { GasOracleType0 } from './GasOracleType0';

import { GasOracleType2 } from './GasOracleType2';
import { GasStationAttendant } from './GasStationAttendant';
import { GasStationAttendantEthereum } from './GasStationAttendantEthereum';
import { GasStationAttendantPolygon } from './GasStationAttendantPolygon';

export function getGasStationAttendant(chain: ChainConfiguration, axiosInstance: AxiosInstance): GasStationAttendant {
    switch (chain.chainId) {
        case /* ethereum */ 1:
            return new GasStationAttendantEthereum(GasOracleType2.create(chain.gasStationUrl, axiosInstance));
        case /* ganache */ 1337:
            return new GasStationAttendantEthereum(GasOracleType2.create(chain.gasStationUrl, axiosInstance));
        case /* polygon */ 137:
            return new GasStationAttendantPolygon(GasOracleType0.create(chain.gasStationUrl, axiosInstance));
        case /* mumbai */ 80001:
            return new GasStationAttendantPolygon(GasOracleType0.create(chain.gasStationUrl, axiosInstance));
        default:
            throw new Error(`Gas station attendant not configured for chain: ${chain.name}`);
    }
}
