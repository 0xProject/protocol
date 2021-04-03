// tslint:disable:custom-no-magic-numbers
// tslint:disable:no-console
// tslint:disable:max-classes-per-file
import { LimitOrderFields, SignatureType, SupportedProvider } from '@0x/asset-swapper';
import { getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { getRandomInteger, randomAddress } from '@0x/contracts-test-utils';
import * as MeshGraphQLClientModule from '@0x/mesh-graphql-client';
import { LimitOrder } from '@0x/protocol-utils';
import { BigNumber, hexUtils } from '@0x/utils';
import * as _ from 'lodash';
import { ImportMock, MockManager } from 'ts-mock-imports';
import * as Observable from 'zen-observable';

import { ZERO } from '../../src/constants';
import { SignedLimitOrder } from '../../src/types';
import * as MeshClientModule from '../../src/utils/mesh_client';
import { CHAIN_ID, NULL_ADDRESS, WETH_TOKEN_ADDRESS, ZRX_TOKEN_ADDRESS } from '../constants';

interface MeshHandlers {
    getStatsAsync?: () => any;
    getOrdersAsync?: () => any;
    addOrdersV4Async?: () => any;
    onOrderEvents?: () => any;
}
export class MeshClientMock {
    public mockManager?: MockManager<MeshClientModule.MeshClient>;
    public mockMeshClient: MockClient;
    private readonly _graphqlMockManager?: MockManager<MeshGraphQLClientModule.MeshGraphQLClient>;

    constructor() {
        this.mockMeshClient = new MockClient();
    }

    public async setupMockAsync(handlers: MeshHandlers = {}): Promise<void> {
        this.mockManager = ImportMock.mockClass(MeshClientModule, 'MeshClient');
        this.mockManager
            .mock('getStatsAsync')
            .callsFake(handlers.getStatsAsync || this.mockMeshClient.getStatsAsync.bind(this.mockMeshClient));
        this.mockManager
            .mock('getOrdersV4Async')
            .callsFake(handlers.getOrdersAsync || this.mockMeshClient.getOrdersAsync.bind(this.mockMeshClient));
        this.mockManager
            .mock('addOrdersV4Async')
            .callsFake(handlers.addOrdersV4Async || this.mockMeshClient.addOrdersV4Async.bind(this.mockMeshClient));
        this.mockManager
            .mock('onOrderEvents')
            .callsFake(handlers.onOrderEvents || this.mockMeshClient.onOrderEvents.bind(this.mockMeshClient));
    }

    public async resetStateAsync(): Promise<void> {
        this.mockMeshClient._resetClient();
        this.teardownMock();
        await this.setupMockAsync();
    }

    public teardownMock(): void {
        this.mockManager?.restore();
        this._graphqlMockManager?.restore();
    }

    public async addPartialOrdersAsync(
        provider: SupportedProvider,
        orders: Partial<LimitOrder>[],
    ): Promise<MeshClientModule.AddOrdersResultsV4> {
        const signedOrders = await Promise.all(
            orders.map((order) =>
                getRandomSignedLimitOrderAsync(provider, {
                    chainId: CHAIN_ID,
                    ...order,
                }),
            ),
        );
        return this.mockMeshClient.addOrdersV4Async(signedOrders);
    }
}

/**
 * Creates a random signed limit order from the provided fields
 */
export async function getRandomSignedLimitOrderAsync(
    provider: SupportedProvider,
    fields: Partial<LimitOrderFields> = {},
): Promise<SignedLimitOrder> {
    const limitOrder = getRandomLimitOrder(fields);
    const signature = await limitOrder.getSignatureWithProviderAsync(provider, SignatureType.EIP712);

    return {
        ...limitOrder,
        signature,
    };
}

/**
 * Creates a random unsigned limit order from the provided fields
 */
export function getRandomLimitOrder(fields: Partial<LimitOrderFields> = {}): LimitOrder {
    return new LimitOrder({
        // Default opts
        makerToken: ZRX_TOKEN_ADDRESS,
        takerToken: WETH_TOKEN_ADDRESS,
        makerAmount: getRandomInteger('100e18', '1000e18'),
        takerAmount: getRandomInteger('100e18', '1000e18'),
        takerTokenFeeAmount: ZERO,
        maker: randomAddress(),
        taker: NULL_ADDRESS, // NOTE: Open limit orders should allow any taker address
        sender: NULL_ADDRESS, // NOTE: Mesh currently only support NULL address sender
        feeRecipient: NULL_ADDRESS,
        expiry: new BigNumber(2524604400), // Close to infinite
        salt: new BigNumber(hexUtils.random()),
        chainId: CHAIN_ID,
        verifyingContract: getContractAddressesForChainOrThrow(CHAIN_ID).exchangeProxy,
        ...fields,
    });
}

export interface AddOrdersOpts {
    keepCancelled?: boolean;
    keepExpired?: boolean;
    keepFullyFilled?: boolean;
    keepUnfunded?: boolean;
}

const toOrderWithMetadata = (order: SignedLimitOrder): MeshGraphQLClientModule.OrderWithMetadataV4 => {
    const limitOrder = new LimitOrder(order);
    return {
        ...order,
        fillableTakerAssetAmount: new BigNumber(order.takerAmount),
        hash: limitOrder.getHash(),
    };
};

export class MockClient {
    private _orders: MeshGraphQLClientModule.OrderWithMetadataV4[] = [];

    private readonly _ordersObservable: Observable<MeshGraphQLClientModule.OrderEvent[]> = new Observable<
        MeshGraphQLClientModule.OrderEvent[]
    >((observer) => {
        this._nextOrderEventsCB = observer.next.bind(observer);
    });
    constructor() {} // tslint:disable-line:no-empty

    // NOTE: Mock only method
    public _resetClient(): void {
        this._orders = [];
    }
    // NOTE: Mock only method
    public _getOrderState(): MeshGraphQLClientModule.OrderWithMetadataV4[] {
        return this._orders;
    }

    // tslint:disable:prefer-function-over-method
    public async getStatsAsync(): Promise<MeshGraphQLClientModule.Stats> {
        return {
            version: '1',
            pubSubTopic: '1',
            rendezvous: '1',
            secondaryRendezvous: ['1'],
            peerID: '1234',
            ethereumChainID: 1337,
            latestBlock: {
                number: new BigNumber('12345'),
                hash: '0x10b7b17523a7441daaa0ca801fc51f6e8c1da169eb163017022e9c831b5d0b1a',
            },
            numPeers: 123,
            numOrders: 12356,
            numOrdersV4: 23456,
            numOrdersIncludingRemoved: 1234567,
            numOrdersIncludingRemovedV4: 34567,
            numPinnedOrders: 123,
            numPinnedOrdersV4: 234,
            maxExpirationTime: new BigNumber(new Date().getTime() + 1000 * 1000),
            startOfCurrentUTCDay: new Date(),
            ethRPCRequestsSentInCurrentUTCDay: 12,
            ethRPCRateLimitExpiredRequests: 13,
        };
    }

    public async getOrdersAsync(
        _perPage: number = 200,
    ): Promise<{ ordersInfos: MeshGraphQLClientModule.OrderWithMetadataV4[] }> {
        return {
            ordersInfos: this._orders,
        };
    }

    public async getOrdersV4Async(): Promise<{ ordersInfos: MeshGraphQLClientModule.OrderWithMetadataV4[] }> {
        return {
            ordersInfos: this._orders,
        };
    }

    public async addOrdersV4Async(
        orders: SignedLimitOrder[],
        _pinned: boolean = true,
        _opts?: AddOrdersOpts,
    ): Promise<MeshClientModule.AddOrdersResultsV4> {
        const ordersWithMetadata: MeshGraphQLClientModule.OrderWithMetadataV4[] = orders.map(toOrderWithMetadata);
        this._orders = [...this._orders, ...ordersWithMetadata];

        const addedOrdersResult = {
            accepted: ordersWithMetadata.map((order) => ({
                order,
                isNew: true,
            })),
            rejected: [],
        };

        const orderEvents = ordersWithMetadata.map<MeshGraphQLClientModule.OrderEvent>((orderv4) => ({
            timestampMs: new Date().getTime(),
            orderv4,
            endState: MeshGraphQLClientModule.OrderEventEndState.Added,
            contractEvents: [],
        }));

        this._nextOrderEventsCB(orderEvents);

        return addedOrdersResult;
    }

    public onOrderEvents(): Observable<MeshGraphQLClientModule.OrderEvent[]> {
        return this._ordersObservable;
    }
    public onReconnected(): Observable<MeshGraphQLClientModule.OrderEvent[]> {
        return this._ordersObservable;
    }
    // tslint:disable-next-line:no-empty
    private _nextOrderEventsCB = (_orders: MeshGraphQLClientModule.OrderEvent[]) => {};
}
