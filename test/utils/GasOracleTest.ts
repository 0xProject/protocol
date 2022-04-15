import Axios, { AxiosInstance } from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import { expect } from 'chai';
import * as HttpStatus from 'http-status-codes';

import { GasOracle } from '../../src/utils/GasOracle';

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

let axiosClient: AxiosInstance;
let axiosMock: AxiosMockAdapter;

describe('GasOracle', () => {
    beforeAll(() => {
        axiosClient = Axios.create();
        axiosMock = new AxiosMockAdapter(axiosClient);
    });

    describe('create', () => {
        it('parses the legacy URL', async () => {
            axiosMock.onGet(`http://gas-price-oracle-svc.gas-price-oracle/v2/source/median`).replyOnce(HttpStatus.OK);

            const gasOracle = GasOracle.create(
                'http://gas-price-oracle-svc.gas-price-oracle/source/median?output=eth_gas_station',
                axiosClient,
            );
            try {
                await gasOracle.getBaseFeePerGasWeiAsync();
            } catch {
                // This will fail since we're not faking a valid response.
                // Just want to make sure the right URL is being called.
            }
            expect(axiosMock.history.get[0].url).to.equal(
                'http://gas-price-oracle-svc.gas-price-oracle/v2/source/median',
            );
        });
    });

    describe('getBaseFeePerGasWeiAsync', () => {
        it('gets the base fee', async () => {
            axiosMock
                .onGet(`http://gas-price-oracle-svc.gas-price-oracle/v2/source/median`)
                .replyOnce(HttpStatus.OK, fakeEip1559Response);

            const gasOracle = GasOracle.create(
                'http://gas-price-oracle-svc.gas-price-oracle/v2/source/median',
                axiosClient,
            );

            const baseFee = await gasOracle.getBaseFeePerGasWeiAsync();
            expect(baseFee.toString()).equals('78383362949');
        });
    });

    describe('getMaxPriorityFeePerGasWeiAsync', () => {
        it('gets the max priority fee', async () => {
            axiosMock
                .onGet(`http://gas-price-oracle-svc.gas-price-oracle/v2/source/median`)
                .replyOnce(HttpStatus.OK, fakeEip1559Response);

            const gasOracle = GasOracle.create(
                'http://gas-price-oracle-svc.gas-price-oracle/v2/source/median',
                axiosClient,
            );

            const baseFee = await gasOracle.getMaxPriorityFeePerGasWeiAsync('low');
            expect(baseFee.toString()).equals('1240000000');
        });
    });
});
