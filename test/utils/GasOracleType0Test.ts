import Axios, { AxiosInstance } from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import * as HttpStatus from 'http-status-codes';

import { GasOracleType0 } from '../../src/utils/GasOracleType0';

const fakeResponse = {
    result: {
        source: 'MEDIAN',
        timestamp: 1676403824,
        instant: 353363290000,
        fast: 353363290000,
        standard: 353113290000,
        low: 266513290000,
    },
};
const malformedResponse = {
    result: {
        source: 'MEDIAN',
        timestamp: 1676403824,
        instant: null,
        fast: null,
        standard: null,
        low: null,
    },
};

let axiosClient: AxiosInstance;
let axiosMock: AxiosMockAdapter;

describe('GasOracleType0', () => {
    beforeAll(() => {
        axiosClient = Axios.create();
        axiosMock = new AxiosMockAdapter(axiosClient);
    });

    describe('create', () => {
        it('fails for non-default output formats', async () => {
            expect(() =>
                GasOracleType0.create(
                    'http://gas-price-oracle-svc.gas-price-oracle/source/median?output=eth_gas_station',
                    axiosClient,
                ),
            ).toThrow();
        });
        it('fails for a v2 URL', async () => {
            expect(() =>
                GasOracleType0.create('http://gas-price-oracle-svc.gas-price-oracle/v2/source/median', axiosClient),
            ).toThrow();
        });
    });

    describe('getGasWeiAsync', () => {
        it('gets the fast gas price', async () => {
            axiosMock
                .onGet(`http://gas-price-oracle-svc.gas-price-oracle/source/median`)
                .replyOnce(HttpStatus.OK, fakeResponse);

            const gasOracle = GasOracleType0.create(
                'http://gas-price-oracle-svc.gas-price-oracle/source/median',
                axiosClient,
            );

            const result = await gasOracle.getGasWeiAsync('fast');
            expect(result.toString()).toEqual('353363290000');
        });
        it('gets the standard gas price', async () => {
            axiosMock
                .onGet(`http://gas-price-oracle-svc.gas-price-oracle/source/median`)
                .replyOnce(HttpStatus.OK, fakeResponse);

            const gasOracle = GasOracleType0.create(
                'http://gas-price-oracle-svc.gas-price-oracle/source/median',
                axiosClient,
            );

            const result = await gasOracle.getGasWeiAsync('standard');
            expect(result.toString()).toEqual('353113290000');
        });
        it('throws if response is malformed', async () => {
            axiosMock
                .onGet(`http://gas-price-oracle-svc.gas-price-oracle/source/median`)
                .replyOnce(HttpStatus.OK, malformedResponse);

            const gasOracle = GasOracleType0.create(
                'http://gas-price-oracle-svc.gas-price-oracle/source/median',
                axiosClient,
            );

            await expect(gasOracle.getGasWeiAsync('fast')).rejects.toThrow();
        });
    });
});
