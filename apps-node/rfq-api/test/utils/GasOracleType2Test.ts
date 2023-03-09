import Axios, { AxiosInstance } from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import * as HttpStatus from 'http-status-codes';

import { GasOracleType2 } from '../../src/utils/GasOracleType2';

const fakeEip1559Response = {
    result: {
        source: 'MEDIAN',
        timestamp: 1649113582,
        instant: {
            price: 80000000000,
            maxPriorityFeePerGas: 2000000000,
            maxFeePerGas: 158770000000,
            baseFeePerGas: 78383362949,
        },
        fast: {
            price: 79000000000,
            maxPriorityFeePerGas: 1500000000,
            maxFeePerGas: 158270000000,
            baseFeePerGas: 78383362949,
        },
        standard: {
            price: 79000000000,
            maxPriorityFeePerGas: 1500000000,
            maxFeePerGas: 158270000000,
            baseFeePerGas: 78383362949,
        },
        low: {
            price: 79000000000,
            maxPriorityFeePerGas: 1240000000,
            maxFeePerGas: 158000000000,
            baseFeePerGas: 78383362949,
        },
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

describe('GasOracleType2', () => {
    beforeAll(() => {
        axiosClient = Axios.create();
        axiosMock = new AxiosMockAdapter(axiosClient);
    });

    describe('create', () => {
        it('fails for non-default output formats', async () => {
            expect(() =>
                GasOracleType2.create(
                    'http://gas-price-oracle-svc.gas-price-oracle/v2/source/median?output=eth_gas_station',
                    axiosClient,
                ),
            ).toThrow();
        });
        it('fails for a v0 URL', async () => {
            expect(() =>
                GasOracleType2.create('http://gas-price-oracle-svc.gas-price-oracle/source/median', axiosClient),
            ).toThrow();
        });
    });

    describe('getBaseFeePerGasWeiAsync', () => {
        it('gets the base fee', async () => {
            axiosMock
                .onGet(`http://gas-price-oracle-svc.gas-price-oracle/v2/source/median`)
                .replyOnce(HttpStatus.OK, fakeEip1559Response);

            const gasOracle = GasOracleType2.create(
                'http://gas-price-oracle-svc.gas-price-oracle/v2/source/median',
                axiosClient,
            );

            const baseFee = await gasOracle.getBaseFeePerGasWeiAsync();
            expect(baseFee.toString()).toEqual('78383362949');
        });

        it('throws if response is malformed', async () => {
            axiosMock
                .onGet(`http://gas-price-oracle-svc.gas-price-oracle/v2/source/median`)
                .replyOnce(HttpStatus.OK, malformedResponse);

            const gasOracle = GasOracleType2.create(
                'http://gas-price-oracle-svc.gas-price-oracle/v2/source/median',
                axiosClient,
            );

            expect(gasOracle.getBaseFeePerGasWeiAsync()).rejects.toThrow();
        });
    });

    describe('getMaxPriorityFeePerGasWeiAsync', () => {
        it('gets the max priority fee', async () => {
            axiosMock
                .onGet(`http://gas-price-oracle-svc.gas-price-oracle/v2/source/median`)
                .replyOnce(HttpStatus.OK, fakeEip1559Response);

            const gasOracle = GasOracleType2.create(
                'http://gas-price-oracle-svc.gas-price-oracle/v2/source/median',
                axiosClient,
            );

            const baseFee = await gasOracle.getMaxPriorityFeePerGasWeiAsync('low');
            expect(baseFee.toString()).toEqual('1240000000');
        });

        it('throws if response is malformed', async () => {
            axiosMock
                .onGet(`http://gas-price-oracle-svc.gas-price-oracle/v2/source/median`)
                .replyOnce(HttpStatus.OK, malformedResponse);

            const gasOracle = GasOracleType2.create(
                'http://gas-price-oracle-svc.gas-price-oracle/v2/source/median',
                axiosClient,
            );

            expect(gasOracle.getMaxPriorityFeePerGasWeiAsync('low')).rejects.toThrow();
        });
    });
});
