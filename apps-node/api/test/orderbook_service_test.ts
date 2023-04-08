import { BlockchainLifecycle } from 'dev-utils-deprecated';
import { LimitOrderFields } from '@0x/protocol-utils';
import Web3ProviderEngine from 'web3-provider-engine';
import { BigNumber } from '@0x/utils';
import { toBuffer } from 'ethereumjs-util';
import * as Mocha from 'mocha';
import { expect } from 'chai';
import { Connection } from 'typeorm';

// See https://github.com/0xProject/protocol/blob/34bbdc9c0f5812103d0e3917fd3933e3b510eb84/contracts/test-utils/src/constants.ts#L8-L29
const TESTRPC_PRIVATE_KEYS_STRINGS = [
    '0xf2f48ee19680706196e2e339e5da3491186e0c4c5030670656b0e0164837257d',
    '0x5d862464fe9303452126c8bc94274b8c5f9874cbd219789b3eb2128075a76f72',
    '0xdf02719c4df8b9b8ac7f551fcb5d9ef48fa27eef7a66453879f4d8fdc6e78fb1',
    '0xff12e391b79415e941a94de3bf3a9aee577aed0731e297d5cfa0b8a1e02fa1d0',
    '0x752dd9cf65e68cfaba7d60225cbdbc1f4729dd5e5507def72815ed0d8abc6249',
    '0xefb595a0178eb79a8df953f87c5148402a224cdf725e88c0146727c6aceadccd',
    '0x83c6d2cc5ddcf9711a6d59b417dc20eb48afd58d45290099e5987e3d768f328f',
    '0xbb2d3f7c9583780a7d3904a2f55d792707c345f21de1bacb2d389934d82796b2',
    '0xb2fd4d29c1390b71b8795ae81196bfd60293adf99f9d32a0aff06288fcdac55f',
    '0x23cb7121166b9a2f93ae0b7c05bde02eae50d64449b2cbb42bc84e9d38d6cc89',
    '0x5ad34d7f8704ed33ab9e8dc30a76a8c48060649204c1f7b21b973235bba8092f',
    '0xf18b03c1ae8e3876d76f20c7a5127a169dd6108c55fe9ce78bc7a91aca67dee3',
    '0x4ccc4e7d7843e0701295e8fd671332a0e2f1e92d0dab16e8792e91cb0b719c9d',
    '0xd7638ae813450e710e6f1b09921cc1593181073ce2099fb418fc03a933c7f41f',
    '0xbc7bbca8ca15eb567be60df82e4452b13072dcb60db89747e3c85df63d8270ca',
    '0x55131517839bf782e6e573bc3ac8f262efd2b6cb0ac86e8f147db26fcbdb15a5',
    '0x6c2b5a16e327e0c4e7fafca5ae35616141de81f77da66ee0857bc3101d446e68',
    '0xfd79b71625eec963e6ec42e9b5b10602c938dfec29cbbc7d17a492dd4f403859',
    '0x3003eace3d4997c52ba69c2ca97a6b5d0d1216d894035a97071590ee284c1023',
    '0x84a8bb71450a1b82be2b1cdd25d079cbf23dc8054e94c47ad14510aa967f45de',
];

const TESTRPC_PRIVATE_KEYS = TESTRPC_PRIVATE_KEYS_STRINGS.map((privateKeyString) => toBuffer(privateKeyString));

// Helps with printing test case results
const { color, symbols } = Mocha.reporters.Base;

import { DEFAULT_PAGE, DEFAULT_PER_PAGE } from '../src/constants';
import { getDBConnectionOrThrow } from '../src/db_connection';
import { OrderWatcherSignedOrderEntity, PersistentSignedOrderV4Entity } from '../src/entities';
import { OrderBookService } from '../src/services/orderbook_service';
import { OrderEventEndState, PaginatedCollection, SRAOrder, SRAOrderMetaData } from '../src/types';
import { orderUtils } from '../src/utils/order_utils';

import { CHAIN_ID, getProvider } from './constants';
import { setupDependenciesAsync, teardownDependenciesAsync } from './utils/deployment';
import { MockOrderWatcher } from './utils/mock_order_watcher';
import { getRandomLimitOrder } from './utils/orders';
import { Web3Wrapper } from '@0x/web3-wrapper';

const SUITE_NAME = 'OrderbookService';

const EMPTY_PAGINATED_RESPONSE = {
    perPage: DEFAULT_PER_PAGE,
    page: DEFAULT_PAGE,
    total: 0,
    records: [],
};

const TOMORROW = new BigNumber(Date.now() + 24 * 3600);

async function saveSignedOrdersAsync(connection: Connection, orders: SRAOrder[]): Promise<void> {
    await connection.getRepository(OrderWatcherSignedOrderEntity).save(orders.map(orderUtils.serializeOrder));
}

async function savePersistentOrdersAsync(connection: Connection, orders: SRAOrder[]): Promise<void> {
    await connection.getRepository(PersistentSignedOrderV4Entity).save(orders.map(orderUtils.serializePersistentOrder));
}

async function deleteSignedOrdersAsync(connection: Connection, orderHashes: string[]): Promise<void> {
    try {
        await connection.manager.delete(OrderWatcherSignedOrderEntity, orderHashes);
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

    let orderBookService: OrderBookService;
    let privateKey: string;

    let connection: Connection;

    before(async () => {
        await setupDependenciesAsync(SUITE_NAME);
        connection = await getDBConnectionOrThrow();
        await connection.runMigrations();
        orderBookService = new OrderBookService(connection, new MockOrderWatcher(connection));
        provider = getProvider();
        const web3Wrapper = new Web3Wrapper(provider);
        blockchainLifecycle = new BlockchainLifecycle(web3Wrapper);

        const accounts = await web3Wrapper.getAvailableAddressesAsync();
        [makerAddress] = accounts;

        const privateKeyBuf = TESTRPC_PRIVATE_KEYS[accounts.indexOf(makerAddress)];
        privateKey = `0x${privateKeyBuf.toString('hex')}`;
        await blockchainLifecycle.startAsync();
    });

    after(async () => {
        await teardownDependenciesAsync(SUITE_NAME);
    });

    describe('getOrdersAsync', () => {
        it.skip(`ran getOrdersAsync test cases`, async () => {
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
                    } catch (e) {
                        console.log(indent, color('bright fail', `${symbols.err}`), color('fail', description));
                        throw e;
                    }
                    // Otherwise, succeeded
                    console.log(indent, color('checkmark', `${symbols.ok}`), color('pass', description));
                };
            }

            // Run the tests synchronously; fill in default values
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
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- TODO: fix me!
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
        });
    });
    describe('addOrdersAsync, addPersistentOrdersAsync', () => {
        before(async () => {
            // await connection.runMigrations();
        });
        beforeEach(async () => {
            await blockchainLifecycle.startAsync();
        });
        afterEach(async () => {
            await blockchainLifecycle.revertAsync();
        });
        it('should post orders to order watcher', async () => {
            const apiOrder = await newSRAOrderAsync(privateKey, {});
            await orderBookService.addOrdersAsync([apiOrder.order]);

            // should not save to persistent orders table
            const result = await connection.manager.find(PersistentSignedOrderV4Entity, {
                hash: apiOrder.metaData.orderHash,
            });
            expect(result).to.deep.equal([]);

            await deleteSignedOrdersAsync(connection, [apiOrder.metaData.orderHash]);
        });
        it('should find persistent orders after posting them', async () => {
            const apiOrder = await newSRAOrderAsync(privateKey, {});
            await orderBookService.addPersistentOrdersAsync([apiOrder.order]);

            const result = await connection.manager.find(PersistentSignedOrderV4Entity, {
                hash: apiOrder.metaData.orderHash,
            });
            const expected = orderUtils.serializePersistentOrder(apiOrder);
            expected.createdAt = result[0].createdAt; // createdAt is saved in the PersistentOrders table directly
            expect(result).to.deep.equal([expected]);

            await deletePersistentOrdersAsync(connection, [apiOrder.metaData.orderHash]);
        });
    });
});
