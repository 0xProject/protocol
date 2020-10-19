import { ContractAddresses } from '@0x/contract-addresses';
import { DummyERC20TokenContract, WETH9Contract } from '@0x/contracts-erc20';
import { constants, OrderFactory } from '@0x/contracts-test-utils';
import { GetOrdersResponse, ValidationResults, WSClient } from '@0x/mesh-rpc-client';
import { assetDataUtils } from '@0x/order-utils';
import { Web3ProviderEngine } from '@0x/subproviders';
import { Order } from '@0x/types';
import { BigNumber } from '@0x/utils';
import { Web3Wrapper } from '@0x/web3-wrapper';

import { CHAIN_ID, CONTRACT_ADDRESSES, MAX_INT, MAX_MINT_AMOUNT } from '../constants';

type Numberish = BigNumber | number | string;

export const DEFAULT_MAKER_ASSET_AMOUNT = new BigNumber(1);
export const MAKER_WETH_AMOUNT = new BigNumber('1000000000000000000');

export class MeshTestUtils {
    protected _accounts!: string[];
    protected _makerAddress!: string;
    protected _contractAddresses: ContractAddresses = CONTRACT_ADDRESSES;
    protected _orderFactory!: OrderFactory;
    protected _meshClient!: WSClient;
    protected _zrxToken!: DummyERC20TokenContract;
    protected _wethToken!: WETH9Contract;
    protected _web3Wrapper: Web3Wrapper;

    // TODO: This can be extended to allow more types of orders to be created. Some changes
    // that might be desirable are to allow different makers to be used, different assets to
    // be used, etc.
    public async addOrdersWithPricesAsync(prices: Numberish[]): Promise<ValidationResults> {
        if (!prices.length) {
            throw new Error('[mesh-utils] Must provide at least one price to `addOrdersAsync`');
        }
        const orders = [];
        for (const price of prices) {
            orders.push(
                await this._orderFactory.newSignedOrderAsync({
                    takerAssetAmount: DEFAULT_MAKER_ASSET_AMOUNT.times(price),
                    // tslint:disable-next-line:custom-no-magic-numbers
                    expirationTimeSeconds: new BigNumber(Date.now() + 24 * 3600),
                }),
            );
        }
        const validationResults = await this._meshClient.addOrdersAsync(orders);
        // NOTE(jalextowle): Wait for the 0x-api to catch up.
        await sleepAsync(2);
        return validationResults;
    }

    public async addPartialOrdersAsync(orders: Partial<Order>[]): Promise<ValidationResults> {
        const signedOrders = await Promise.all(orders.map(order => this._orderFactory.newSignedOrderAsync(order)));
        const validationResults = await this._meshClient.addOrdersAsync(signedOrders);
        await sleepAsync(2);
        return validationResults;
    }

    public async getOrdersAsync(): Promise<GetOrdersResponse> {
        return this._meshClient.getOrdersAsync();
    }

    public async setupUtilsAsync(): Promise<void> {
        this._meshClient = new WSClient('ws://localhost:60557');

        this._zrxToken = new DummyERC20TokenContract(this._contractAddresses.zrxToken, this._provider);
        this._wethToken = new WETH9Contract(this._contractAddresses.etherToken, this._provider);

        this._accounts = await this._web3Wrapper.getAvailableAddressesAsync();
        [this._makerAddress] = this._accounts;
        const defaultOrderParams = {
            ...constants.STATIC_ORDER_PARAMS,
            makerAddress: this._makerAddress,
            feeRecipientAddress: constants.NULL_ADDRESS,
            makerAssetData: assetDataUtils.encodeERC20AssetData(this._zrxToken.address),
            takerAssetData: assetDataUtils.encodeERC20AssetData(this._wethToken.address),
            makerAssetAmount: DEFAULT_MAKER_ASSET_AMOUNT,
            makerFeeAssetData: '0x',
            takerFeeAssetData: '0x',
            makerFee: constants.ZERO_AMOUNT,
            takerFee: constants.ZERO_AMOUNT,
            exchangeAddress: this._contractAddresses.exchange,
            chainId: CHAIN_ID,
        };
        const privateKey = constants.TESTRPC_PRIVATE_KEYS[this._accounts.indexOf(this._makerAddress)];
        this._orderFactory = new OrderFactory(privateKey, defaultOrderParams);

        // NOTE(jalextowle): The way that Mesh validation currently works allows us
        // to only set the maker balance a single time. If this changes in the future,
        // this logic may need to be added to `addOrdersAsync`.
        // tslint:disable-next-line:await-promise
        await this._zrxToken.mint(MAX_MINT_AMOUNT).awaitTransactionSuccessAsync({ from: this._makerAddress });
        // tslint:disable-next-line:await-promise
        await this._zrxToken
            .approve(this._contractAddresses.erc20Proxy, MAX_INT)
            .awaitTransactionSuccessAsync({ from: this._makerAddress });
        // tslint:disable-next-line:await-promise
        await this._wethToken
            .deposit()
            .awaitTransactionSuccessAsync({ from: this._makerAddress, value: MAKER_WETH_AMOUNT });
        // tslint:disable-next-line:await-promise
        await this._wethToken
            .approve(this._contractAddresses.erc20Proxy, MAX_INT)
            .awaitTransactionSuccessAsync({ from: this._makerAddress });

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
