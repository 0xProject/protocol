import { ProtocolFeeUtils } from '@0x/asset-swapper';
import { AxiosInstance } from 'axios';

import { ChainConfiguration } from '../config';

import { GasOracleType2 } from './GasOracleType2';
import { GasStationAttendant } from './GasStationAttendant';
import { GasStationAttendantEthereum } from './GasStationAttendantEthereum';
import { GasStationAttendantPolygon } from './GasStationAttendantPolygon';

export function getGasStationAttendant(
    chain: ChainConfiguration,
    axiosInstance: AxiosInstance,
    protocolFeeUtils: ProtocolFeeUtils,
): GasStationAttendant {
    let gasOracle: GasOracleType2;
    // tslint:disable: custom-no-magic-numbers
    switch (chain.chainId) {
        case /* ethereum */ 1:
            gasOracle = GasOracleType2.create(chain.gasStationUrl, axiosInstance);
            return new GasStationAttendantEthereum(gasOracle);
        case /* ganache */ 1337:
            gasOracle = GasOracleType2.create(chain.gasStationUrl, axiosInstance);
            return new GasStationAttendantEthereum(gasOracle);
        case /* polygon */ 137:
            return new GasStationAttendantPolygon(protocolFeeUtils);
        case /* mumbai */ 80001:
            return new GasStationAttendantPolygon(protocolFeeUtils);
        default:
            throw new Error(`Gas station attendant not configured for chain: ${chain.name}`);
    }
    // tslint:enable: custom-no-magic-numbers
}
