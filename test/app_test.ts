import { BlockchainLifecycle, web3Factory } from '@0x/dev-utils';
import { runMigrationsOnceAsync } from '@0x/migrations';
import { Web3ProviderEngine } from '@0x/subproviders';
import { Web3Wrapper } from '@0x/web3-wrapper';
import * as HttpStatus from 'http-status-codes';
import 'mocha';
import * as request from 'supertest';

import { AppDependencies, getAppAsync, getDefaultAppDependenciesAsync } from '../src/app';
import * as config from '../src/config';
import { DEFAULT_PAGE, DEFAULT_PER_PAGE, SRA_PATH } from '../src/constants';
import { SignedOrderEntity } from '../src/entities';

import * as orderFixture from './fixtures/order.json';
import { expect } from './utils/expect';

let app: Express.Application;

let web3Wrapper: Web3Wrapper;
let provider: Web3ProviderEngine;
let accounts: string[];
let blockchainLifecycle: BlockchainLifecycle;

let dependencies: AppDependencies;
describe('app test', () => {
    before(async () => {
        // connect to ganache and run contract migrations
        const ganacheConfigs = {
            shouldUseInProcessGanache: false,
            shouldAllowUnlimitedContractSize: true,
            rpcUrl: config.ETHEREUM_RPC_URL,
        };
        provider = web3Factory.getRpcProvider(ganacheConfigs);
        web3Wrapper = new Web3Wrapper(provider);
        blockchainLifecycle = new BlockchainLifecycle(web3Wrapper);
        await blockchainLifecycle.startAsync();
        accounts = await web3Wrapper.getAvailableAddressesAsync();
        const owner = accounts[0];
        await runMigrationsOnceAsync(provider, { from: owner });

        dependencies = await getDefaultAppDependenciesAsync(provider, config);
        // start the 0x-api app
        app = await getAppAsync({ ...dependencies }, config);
    });
    it('should not be undefined', () => {
        expect(app).to.not.be.undefined();
    });
    it('should respond to GET /sra/orders', async () => {
        await request(app)
            .get(`${SRA_PATH}/orders`)
            .expect('Content-Type', /json/)
            .expect(HttpStatus.OK)
            .then(response => {
                expect(response.body.perPage).to.equal(DEFAULT_PER_PAGE);
                expect(response.body.page).to.equal(DEFAULT_PAGE);
                expect(response.body.total).to.equal(0);
                expect(response.body.records).to.deep.equal([]);
            });
    });
    it('should normalize addresses to lowercase', async () => {
        const metaData = {
            hash: '123',
            remainingFillableTakerAssetAmount: '1',
        };
        const expirationTimeSeconds = (new Date().getTime() / 1000 + 600).toString(); // tslint:disable-line:custom-no-magic-numbers
        const orderModel = new SignedOrderEntity({
            ...metaData,
            ...orderFixture,
            expirationTimeSeconds,
        });

        const apiOrderResponse = { chainId: config.CHAIN_ID, ...orderFixture, expirationTimeSeconds };
        await dependencies.connection.manager.save(orderModel);
        await request(app)
            .get(`${SRA_PATH}/orders?makerAddress=${orderFixture.makerAddress.toUpperCase()}`)
            .expect('Content-Type', /json/)
            .expect(HttpStatus.OK)
            .then(response => {
                expect(response.body.perPage).to.equal(DEFAULT_PER_PAGE);
                expect(response.body.page).to.equal(DEFAULT_PAGE);
                expect(response.body.total).to.equal(1);
                expect(response.body.records[0].order).to.deep.equal(apiOrderResponse);
            });

        await dependencies.connection.manager.remove(orderModel);
    });
});
