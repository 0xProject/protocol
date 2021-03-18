import { ContractAddresses, getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { DummyERC20TokenContract, WETH9Contract } from '@0x/contracts-erc20';
import { getRandomInteger, randomAddress } from '@0x/contracts-test-utils';
import { OrderWithMetadataV4 } from '@0x/mesh-graphql-client';
import { LimitOrder, LimitOrderFields, SignatureType } from '@0x/protocol-utils';
import { Web3ProviderEngine } from '@0x/subproviders';
import { BigNumber, hexUtils } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';

import { ZERO } from '../../src/constants';
import { SignedLimitOrder } from '../../src/types';
import { AddOrdersResultsV4, MeshClient } from '../../src/utils/mesh_client';
import {
    CHAIN_ID,
    CONTRACT_ADDRESSES,
    MAX_INT,
    MAX_MINT_AMOUNT,
    NULL_ADDRESS,
    WETH_TOKEN_ADDRESS,
    ZRX_TOKEN_ADDRESS,
} from '../constants';

type Numberish = BigNumber | number | string;

export const DEFAULT_MAKER_ASSET_AMOUNT = new BigNumber(1);
export const MAKER_WETH_AMOUNT = new BigNumber('1000000000000000000');

/**
 * Creates random limit order
 */
// tslint:disable: custom-no-magic-numbers
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

export class MeshTestUtils {
    protected _accounts!: string[];
    protected _makerAddress!: string;
    protected _contractAddresses: ContractAddresses = CONTRACT_ADDRESSES;
    protected _meshClient!: MeshClient;
    protected _zrxToken!: DummyERC20TokenContract;
    protected _wethToken!: WETH9Contract;
    protected _web3Wrapper: Web3Wrapper;

    /**
     * Creates a random signed limit order
     */
    public async getRandomSignedLimitOrderAsync(fields: Partial<LimitOrderFields> = {}): Promise<SignedLimitOrder> {
        const limitOrder = getRandomLimitOrder(fields);
        const signature = await limitOrder.getSignatureWithProviderAsync(this._provider, SignatureType.EIP712);

        return {
            ...limitOrder,
            signature,
        };
    }

    // TODO: This can be extended to allow more types of orders to be created. Some changes
    // that might be desirable are to allow different makers to be used, different assets to
    // be used, etc.
    public async addOrdersWithPricesAsync(prices: Numberish[]): Promise<AddOrdersResultsV4> {
        if (!prices.length) {
            throw new Error('[mesh-utils] Must provide at least one price to `addOrdersAsync`');
        }
        const orders = [];
        for (const price of prices) {
            const limitOrder = await this.getRandomSignedLimitOrderAsync({
                takerAmount: DEFAULT_MAKER_ASSET_AMOUNT.times(price),
                chainId: CHAIN_ID,
                maker: this._makerAddress,
                // tslint:disable-next-line:custom-no-magic-numbers
                expiry: new BigNumber(Date.now() + 24 * 3600),
            });

            orders.push(limitOrder);
        }
        const validationResults = await this._meshClient.addOrdersV4Async(orders);
        // NOTE(jalextowle): Wait for the 0x-api to catch up.
        await sleepAsync(2);
        return validationResults;
    }

    public async addPartialOrdersAsync(orders: Partial<LimitOrder>[]): Promise<AddOrdersResultsV4> {
        const signedOrders = await Promise.all(
            orders.map(order =>
                this.getRandomSignedLimitOrderAsync({
                    chainId: CHAIN_ID,
                    maker: this._makerAddress,
                    ...order,
                }),
            ),
        );
        const validationResults = await this._meshClient.addOrdersV4Async(signedOrders);
        await sleepAsync(2);
        return validationResults;
    }

    public async getOrdersAsync(): Promise<{ ordersInfos: OrderWithMetadataV4[] }> {
        return this._meshClient.getOrdersV4Async();
    }

    public async setupUtilsAsync(): Promise<void> {
        this._meshClient = new MeshClient('ws://localhost:60557', 'http://localhost:60557');

        this._zrxToken = new DummyERC20TokenContract(this._contractAddresses.zrxToken, this._provider);
        this._wethToken = new WETH9Contract(this._contractAddresses.etherToken, this._provider);

        this._accounts = await this._web3Wrapper.getAvailableAddressesAsync();
        [this._makerAddress] = this._accounts;

        // NOTE(jalextowle): The way that Mesh validation currently works allows us
        // to only set the maker balance a single time. If this changes in the future,
        // this logic may need to be added to `addOrdersAsync`.
        const txDefaults = { from: this._makerAddress };
        await this._zrxToken.mint(MAX_MINT_AMOUNT).awaitTransactionSuccessAsync(txDefaults);
        await this._zrxToken
            .approve(this._contractAddresses.exchangeProxy, MAX_INT)
            .awaitTransactionSuccessAsync(txDefaults);
        await this._wethToken.deposit().awaitTransactionSuccessAsync({ ...txDefaults, value: MAKER_WETH_AMOUNT });
        await this._wethToken
            .approve(this._contractAddresses.exchangeProxy, MAX_INT)
            .awaitTransactionSuccessAsync(txDefaults);

        // NOTE(jalextowle): Mesh's blockwatcher must catch up to the most
        // recently mined block for the mint and approval transactions to
        // be recognized. This is added here in case `addOrdersAsync` is called
        // immediately after this function.
        await sleepAsync(2);
    }

    constructor(protected _provider: Web3ProviderEngine) {
        this._web3Wrapper = new Web3Wrapper(_provider);
    }
}

async function sleepAsync(timeSeconds: number): Promise<void> {
    return new Promise<void>(resolve => {
        const secondsPerMillisecond = 1000;
        setTimeout(resolve, timeSeconds * secondsPerMillisecond);
    });
}
