import { ContractAddresses, getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { DummyERC20TokenContract, WETH9Contract } from '@0x/contracts-erc20';
import { constants, expect, OrderFactory } from '@0x/contracts-test-utils';
import { BlockchainLifecycle, web3Factory, Web3ProviderEngine } from '@0x/dev-utils';
import { OrderEventEndState } from '@0x/mesh-rpc-client';
import { assetDataUtils, Order, orderHashUtils } from '@0x/order-utils';
import { BigNumber } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';
import 'mocha';

import * as config from '../src/config';
import { DEFAULT_PAGE, DEFAULT_PER_PAGE } from '../src/constants';
import { getDBConnectionAsync } from '../src/db_connection';
import { SignedOrderEntity } from '../src/entities';
import { PersistentSignedOrderEntity } from '../src/entities/PersistentSignedOrderEntity';
import { OrderBookService } from '../src/services/orderbook_service';
import { APIOrderWithMetaData } from '../src/types';
import { MeshClient } from '../src/utils/mesh_client';
import { orderUtils } from '../src/utils/order_utils';

import {
    setupDependenciesAsync,
    setupMeshAsync,
    teardownDependenciesAsync,
    teardownMeshAsync,
} from './utils/deployment';
import { DEFAULT_MAKER_ASSET_AMOUNT, MeshTestUtils } from './utils/mesh_test_utils';

const SUITE_NAME = 'OrderBook Service tests';

const EMPTY_PAGINATED_RESPONSE = {
    perPage: DEFAULT_PER_PAGE,
    page: DEFAULT_PAGE,
    total: 0,
    records: [],
};

const TOMORROW = new BigNumber(Date.now() + 24 * 3600); // tslint:disable-line:custom-no-magic-numbers

async function saveSignedOrderAsync(apiOrder: APIOrderWithMetaData): Promise<void> {
    await (await getDBConnectionAsync()).manager.save(orderUtils.serializeOrder(apiOrder));
}

async function savePersistentOrderAsync(apiOrder: APIOrderWithMetaData): Promise<void> {
    await (await getDBConnectionAsync()).manager.save(orderUtils.serializePersistentOrder(apiOrder));
}

async function deleteSignedOrderAsync(orderHash: string): Promise<void> {
    await (await getDBConnectionAsync()).manager.delete(SignedOrderEntity, orderHash);
}

async function deletePersistentOrderAsync(orderHash: string): Promise<void> {
    await (await getDBConnectionAsync()).manager.delete(PersistentSignedOrderEntity, orderHash);
}

async function newAPIOrderAsync(
    orderFactory: OrderFactory,
    params: Partial<Order>,
    remainingFillableAssetAmount?: BigNumber,
): Promise<APIOrderWithMetaData> {
    const order = await orderFactory.newSignedOrderAsync({
        expirationTimeSeconds: TOMORROW,
        ...params,
    });
    const apiOrder: APIOrderWithMetaData = {
        order,
        metaData: {
            orderHash: orderHashUtils.getOrderHash(order),
            remainingFillableTakerAssetAmount: remainingFillableAssetAmount || order.takerAssetAmount,
        },
    };
    return apiOrder;
}

describe(SUITE_NAME, () => {
    let chainId: number;
    let contractAddresses: ContractAddresses;
    let makerAddress: string;

    let blockchainLifecycle: BlockchainLifecycle;
    let provider: Web3ProviderEngine;

    let weth: WETH9Contract;
    let zrx: DummyERC20TokenContract;

    let orderFactory: OrderFactory;
    let meshClient: MeshClient;
    let orderBookService: OrderBookService;

    before(async () => {
        await setupDependenciesAsync(SUITE_NAME);
        meshClient = new MeshClient(config.MESH_WEBSOCKET_URI, config.MESH_HTTP_URI);
        orderBookService = new OrderBookService(await getDBConnectionAsync(), meshClient);
        // connect to ganache and run contract migrations
        const ganacheConfigs = {
            shouldUseInProcessGanache: false,
            shouldAllowUnlimitedContractSize: true,
            rpcUrl: config.ETHEREUM_RPC_URL,
        };
        provider = web3Factory.getRpcProvider(ganacheConfigs);

        const web3Wrapper = new Web3Wrapper(provider);
        blockchainLifecycle = new BlockchainLifecycle(web3Wrapper);

        const accounts = await web3Wrapper.getAvailableAddressesAsync();
        [makerAddress] = accounts;

        chainId = await web3Wrapper.getChainIdAsync();
        contractAddresses = getContractAddressesForChainOrThrow(chainId);

        weth = new WETH9Contract(contractAddresses.etherToken, provider);
        zrx = new DummyERC20TokenContract(contractAddresses.zrxToken, provider);

        const defaultOrderParams = {
            ...constants.STATIC_ORDER_PARAMS,
            makerAddress,
            feeRecipientAddress: constants.NULL_ADDRESS,
            makerAssetData: assetDataUtils.encodeERC20AssetData(zrx.address),
            takerAssetData: assetDataUtils.encodeERC20AssetData(weth.address),
            makerAssetAmount: DEFAULT_MAKER_ASSET_AMOUNT,
            makerFeeAssetData: '0x',
            takerFeeAssetData: '0x',
            makerFee: constants.ZERO_AMOUNT,
            takerFee: constants.ZERO_AMOUNT,
            exchangeAddress: contractAddresses.exchange,
            chainId,
        };
        const privateKey = constants.TESTRPC_PRIVATE_KEYS[accounts.indexOf(makerAddress)];
        orderFactory = new OrderFactory(privateKey, defaultOrderParams);
        await blockchainLifecycle.startAsync();
    });
    after(async () => {
        await teardownDependenciesAsync(SUITE_NAME);
    });

    describe('getOrdersAsync', () => {
        it('should return empty response when no orders', async () => {
            const response = await orderBookService.getOrdersAsync(DEFAULT_PAGE, DEFAULT_PER_PAGE, {});
            expect(response).to.deep.equal(EMPTY_PAGINATED_RESPONSE);
        });
        it('should return orders in the SignedOrders cache', async () => {
            const apiOrder = await newAPIOrderAsync(orderFactory, {});
            await saveSignedOrderAsync(apiOrder);

            const response = await orderBookService.getOrdersAsync(DEFAULT_PAGE, DEFAULT_PER_PAGE, {});
            apiOrder.metaData.state = undefined; // state is not saved in SignedOrders table
            apiOrder.metaData.createdAt = response.records[0].metaData.createdAt; // createdAt is saved in the SignedOrders table directly
            expect(response).to.deep.eq({
                ...EMPTY_PAGINATED_RESPONSE,
                total: 1,
                records: [apiOrder],
            });
            await deleteSignedOrderAsync(apiOrder.metaData.orderHash);
        });
        it('should de-duplicate orders present in both the SignedOrders and PersistentOrders cache', async () => {
            const apiOrder = await newAPIOrderAsync(orderFactory, {});
            await saveSignedOrderAsync(apiOrder);
            await savePersistentOrderAsync(apiOrder);
            const response = await orderBookService.getOrdersAsync(DEFAULT_PAGE, DEFAULT_PER_PAGE, {});
            apiOrder.metaData.state = undefined; // state is not saved in SignedOrders table
            apiOrder.metaData.createdAt = response.records[0].metaData.createdAt; // createdAt is saved in the SignedOrders table directly
            expect(response).to.deep.eq({
                ...EMPTY_PAGINATED_RESPONSE,
                total: 1,
                records: [apiOrder],
            });
            await deleteSignedOrderAsync(apiOrder.metaData.orderHash);
            await deletePersistentOrderAsync(apiOrder.metaData.orderHash);
        });
        it('should return persistent orders not in the SignedOrders cache', async () => {
            const apiOrder = await newAPIOrderAsync(orderFactory, {});
            apiOrder.metaData.state = OrderEventEndState.Cancelled; // only unfillable orders are removed from SignedOrders but remain in PersistentOrders
            await savePersistentOrderAsync(apiOrder);
            const response = await orderBookService.getOrdersAsync(DEFAULT_PAGE, DEFAULT_PER_PAGE, {
                isUnfillable: true,
                makerAddress: apiOrder.order.makerAddress,
            });
            apiOrder.metaData.createdAt = response.records[0].metaData.createdAt; // createdAt is saved in the PersistentOrders table directly
            expect(response).to.deep.eq({
                ...EMPTY_PAGINATED_RESPONSE,
                total: 1,
                records: [apiOrder],
            });
            await deletePersistentOrderAsync(apiOrder.metaData.orderHash);
        });
    });
    describe('addOrdersAsync, addPersistentOrdersAsync', () => {
        let meshUtils: MeshTestUtils;
        before(async () => {
            meshUtils = new MeshTestUtils(provider);
            await meshUtils.setupUtilsAsync();
        });
        beforeEach(async () => {
            blockchainLifecycle.startAsync();
        });
        afterEach(async () => {
            await teardownMeshAsync(SUITE_NAME);
            await setupMeshAsync(SUITE_NAME);
            blockchainLifecycle.revertAsync();
        });
        it('should post orders to Mesh', async () => {
            const apiOrder = await newAPIOrderAsync(orderFactory, {});
            await orderBookService.addOrdersAsync([apiOrder.order], false);

            const meshOrders = await meshUtils.getOrdersAsync();
            expect(meshOrders.ordersInfos.find(i => i.orderHash === apiOrder.metaData.orderHash)).to.not.be.undefined();

            // should not save to persistent orders table
            const result = await (await getDBConnectionAsync()).manager.find(PersistentSignedOrderEntity, {
                hash: apiOrder.metaData.orderHash,
            });
            expect(result).to.deep.equal([]);
        });
        it('should post persistent orders', async () => {
            const apiOrder = await newAPIOrderAsync(orderFactory, {});
            await orderBookService.addPersistentOrdersAsync([apiOrder.order], false);

            const meshOrders = await meshUtils.getOrdersAsync();
            expect(meshOrders.ordersInfos.find(i => i.orderHash === apiOrder.metaData.orderHash)).to.not.be.undefined();

            const result = await (await getDBConnectionAsync()).manager.find(PersistentSignedOrderEntity, {
                hash: apiOrder.metaData.orderHash,
            });
            const expected = orderUtils.serializePersistentOrder(apiOrder);
            expected.createdAt = result[0].createdAt; // createdAt is saved in the PersistentOrders table directly
            expect(result).to.deep.equal([expected]);
            await deletePersistentOrderAsync(apiOrder.metaData.orderHash);
        });
    });
});
