import { constants, expect } from '@0x/contracts-test-utils';
import { BlockchainLifecycle, Web3ProviderEngine, Web3Wrapper } from '@0x/dev-utils';
import { OrderEventEndState } from '@0x/mesh-graphql-client';
import { LimitOrderFields } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';
import * as Mocha from 'mocha';
import { Connection } from 'typeorm';

// Helps with printing test case results
const { color, symbols } = Mocha.reporters.Base;

import * as config from '../src/config';
import { DEFAULT_PAGE, DEFAULT_PER_PAGE } from '../src/constants';
import { getDBConnectionAsync } from '../src/db_connection';
import { PersistentSignedOrderV4Entity, SignedOrderV4Entity } from '../src/entities';
import { OrderBookService } from '../src/services/orderbook_service';
import { PaginatedCollection, SRAOrder, SRAOrderMetaData } from '../src/types';
import { MeshClient } from '../src/utils/mesh_client';
import { orderUtils } from '../src/utils/order_utils';

import { CHAIN_ID, getProvider } from './constants';
import { setupDependenciesAsync, teardownDependenciesAsync } from './utils/deployment';
import { getRandomLimitOrder, MeshClientMock } from './utils/mesh_client_mock';

const SUITE_NAME = 'OrderbookService';

const EMPTY_PAGINATED_RESPONSE = {
    perPage: DEFAULT_PER_PAGE,
    page: DEFAULT_PAGE,
    total: 0,
    records: [],
};

const TOMORROW = new BigNumber(Date.now() + 24 * 3600); // tslint:disable-line:custom-no-magic-numbers

async function saveSignedOrdersAsync(connection: Connection, orders: SRAOrder[]): Promise<void> {
    await connection.getRepository(SignedOrderV4Entity).save(orders.map(orderUtils.serializeOrder));
}

async function savePersistentOrdersAsync(connection: Connection, orders: SRAOrder[]): Promise<void> {
    await connection.getRepository(PersistentSignedOrderV4Entity).save(orders.map(orderUtils.serializePersistentOrder));
}

async function deleteSignedOrdersAsync(connection: Connection, orderHashes: string[]): Promise<void> {
    try {
        await connection.manager.delete(SignedOrderV4Entity, orderHashes);
    } catch (e) {
        return;
    }
}

async function deletePersistentOrdersAsync(connection: Connection, orderHashes: string[]): Promise<void> {
    try {
        await connection.manager.delete(PersistentSignedOrderV4Entity, orderHashes);
    } catch (e) {
        return;
    }
}

async function newSRAOrderAsync(
    privateKey: string,
    params: Partial<LimitOrderFields>,
    metadata?: Partial<SRAOrderMetaData>,
): Promise<SRAOrder> {
    const limitOrder = getRandomLimitOrder({
        expiry: TOMORROW,
        chainId: CHAIN_ID,
        ...params,
    });
    const apiOrder: SRAOrder = {
        order: {
            ...limitOrder,
            signature: limitOrder.getSignatureWithKey(privateKey),
        },
        metaData: {
            orderHash: limitOrder.getHash(),
            remainingFillableTakerAmount: limitOrder.takerAmount,
            state: undefined,
            ...metadata,
        },
    };
    return apiOrder;
}

describe(SUITE_NAME, () => {
    let makerAddress: string;

    let blockchainLifecycle: BlockchainLifecycle;
    let provider: Web3ProviderEngine;

    let meshClient: MeshClient;
    let orderBookService: OrderBookService;
    let privateKey: string;

    let connection: Connection;
    const meshClientMock = new MeshClientMock();

    before(async () => {
        await setupDependenciesAsync(SUITE_NAME);
        connection = await getDBConnectionAsync();
        await connection.synchronize(true);
        await meshClientMock.setupMockAsync();
        meshClient = new MeshClient(config.MESH_WEBSOCKET_URI, config.MESH_HTTP_URI);
        orderBookService = new OrderBookService(connection, meshClient);
        provider = getProvider();
        const web3Wrapper = new Web3Wrapper(provider);
        blockchainLifecycle = new BlockchainLifecycle(web3Wrapper);

        const accounts = await web3Wrapper.getAvailableAddressesAsync();
        [makerAddress] = accounts;

        const privateKeyBuf = constants.TESTRPC_PRIVATE_KEYS[accounts.indexOf(makerAddress)];
        privateKey = `0x${privateKeyBuf.toString('hex')}`;
        await blockchainLifecycle.startAsync();
    });
    after(async () => {
        meshClientMock.teardownMock();
        await teardownDependenciesAsync(SUITE_NAME);
    });

    describe('getOrdersAsync', () => {
        it(`ran getOrdersAsync test cases`, async () => {
            // Test case interface
            type GetOrdersTestCase = [
                SRAOrder[], // orders to save in the SignedOrder cache
                SRAOrder[], // orders to save in the PersistentOrder cache
                Partial<PaginatedCollection<SRAOrder>>, // expected response; missing fields will be filled in with defaults
                Partial<Parameters<typeof orderBookService.getOrdersAsync>>, // params to pass to getOrdersAsync; using [] means default empty filter
                string, // optional description to print out with the test case
            ];

            /** Define All Test Cases Here */
            const testCases: GetOrdersTestCase[] = await Promise.all([
                [[], [], {}, [], `should return empty response when no orders`],
                await (async () => {
                    const description = `should return orders in the cache when no filters`;
                    const apiOrder = await newSRAOrderAsync(privateKey, {});
                    const expected = {
                        records: [apiOrder],
                    };
                    return [[apiOrder], [], expected, [], description] as GetOrdersTestCase;
                })(),
                await (async () => {
                    const description = `should de-duplicate signed orders and persistent orders`;
                    const apiOrder = await newSRAOrderAsync(privateKey, {});
                    const expected = {
                        records: [apiOrder],
                    };
                    return [[apiOrder], [apiOrder], expected, [], description] as GetOrdersTestCase;
                })(),
                await (async () => {
                    const description = `should return persistent orders that are NOT in the signed orders cache`;
                    const apiOrder = await newSRAOrderAsync(privateKey, {}, { state: OrderEventEndState.Cancelled });
                    const expected = {
                        records: [apiOrder],
                    };
                    const params = [
                        DEFAULT_PAGE,
                        DEFAULT_PER_PAGE,
                        { maker: apiOrder.order.maker },
                        { isUnfillable: true },
                    ] as Parameters<typeof orderBookService.getOrdersAsync>;
                    return [[], [apiOrder], expected, params, description] as GetOrdersTestCase;
                })(),
            ]);
            /** End Test Cases */

            // Generic test runner
            function runTestCaseForGetOrdersFilters(
                orders: SRAOrder[],
                persistentOrders: SRAOrder[],
                expectedResponse: PaginatedCollection<SRAOrder>,
                description: string,
            ): (params: Parameters<typeof orderBookService.getOrdersAsync>) => Promise<void> {
                const indent = '     ';
                return async (args: Parameters<typeof orderBookService.getOrdersAsync>) => {
                    try {
                        // setup
                        await Promise.all([
                            saveSignedOrdersAsync(connection, orders),
                            savePersistentOrdersAsync(connection, persistentOrders),
                        ]);
                        const results = await orderBookService.getOrdersAsync(...args);
                        // clean non-deterministic field
                        expectedResponse.records.forEach((o, i) => {
                            o.metaData.createdAt = results.records[i].metaData.createdAt;
                        });
                        // assertion
                        expect(expectedResponse).deep.equal(results);

                        // cleanup
                        const deletePromise = async (_orders: SRAOrder[], isPersistent: boolean) => {
                            const deleteFn = isPersistent ? deletePersistentOrdersAsync : deleteSignedOrdersAsync;
                            return _orders.length > 0
                                ? deleteFn(
                                      connection,
                                      _orders.map((o) => o.metaData.orderHash),
                                  )
                                : Promise.resolve();
                        };
                        await Promise.all([deletePromise(orders, false), deletePromise(persistentOrders, true)]);
                        // If anything went wrong, the test failed
                        // tslint:disable:no-console
                    } catch (e) {
                        console.log(indent, color('bright fail', `${symbols.err}`), color('fail', description));
                        throw e;
                    }
                    // Otherwise, succeeded
                    console.log(indent, color('checkmark', `${symbols.ok}`), color('pass', description));
                    // tslint:enable:no-console
                };
            }

            // Run the tests synchronously; fill in default values
            // tslint:disable:custom-no-magic-numbers
            for (const [i, _test] of testCases.entries()) {
                const test = fillInDefaultTestCaseValues(_test, i);
                await runTestCaseForGetOrdersFilters(
                    test[0],
                    test[1],
                    test[2] as PaginatedCollection<SRAOrder>,
                    test[4],
                )(test[3] as Parameters<typeof orderBookService.getOrdersAsync>);
            }
            function fillInDefaultTestCaseValues(test: GetOrdersTestCase, i: number): GetOrdersTestCase {
                // expected orderbook response
                test[2] = { ...EMPTY_PAGINATED_RESPONSE, ...test[2] };
                test[2] = { ...test[2], total: test[2].records!.length };
                // test description
                test[4] = test[4] || `Test Case #${i}`;
                // params for getOrdersAsync
                test[3][0] = test[3][0] || DEFAULT_PAGE;
                test[3][1] = test[3][1] || DEFAULT_PER_PAGE;
                test[3][2] = test[3][2] || {};
                test[3][3] = test[3][3] || {};
                return test;
            }
            // tslint:enable:custom-no-magic-numbers
        });
    });
    describe('addOrdersAsync, addPersistentOrdersAsync', () => {
        before(async () => {
            await meshClientMock.resetStateAsync();
            await connection.synchronize(true);
        });
        beforeEach(async () => {
            await blockchainLifecycle.startAsync();
        });
        afterEach(async () => {
            await blockchainLifecycle.revertAsync();
        });
        it('should post orders to Mesh', async () => {
            const apiOrder = await newSRAOrderAsync(privateKey, {});
            await orderBookService.addOrdersAsync([apiOrder.order], false);

            const meshOrders = await meshClientMock.mockMeshClient.getOrdersAsync();
            expect(meshOrders.ordersInfos.find((i) => i.hash === apiOrder.metaData.orderHash)).to.not.be.undefined();

            // should not save to persistent orders table
            const result = await connection.manager.find(PersistentSignedOrderV4Entity, {
                hash: apiOrder.metaData.orderHash,
            });
            expect(result).to.deep.equal([]);
            await deleteSignedOrdersAsync(connection, [apiOrder.metaData.orderHash]);
        });
        it('should post persistent orders', async () => {
            const apiOrder = await newSRAOrderAsync(privateKey, {});
            await orderBookService.addPersistentOrdersAsync([apiOrder.order], false);

            const meshOrders = await meshClientMock.mockMeshClient.getOrdersAsync();
            expect(meshOrders.ordersInfos.find((i) => i.hash === apiOrder.metaData.orderHash)).to.not.be.undefined();

            const result = await connection.manager.find(PersistentSignedOrderV4Entity, {
                hash: apiOrder.metaData.orderHash,
            });
            const expected = orderUtils.serializePersistentOrder(apiOrder);
            expected.createdAt = result[0].createdAt; // createdAt is saved in the PersistentOrders table directly
            expect(result).to.deep.equal([expected]);
            await deletePersistentOrdersAsync(connection, [apiOrder.metaData.orderHash]);
            await deleteSignedOrdersAsync(connection, [apiOrder.metaData.orderHash]);
        });
    });
});
