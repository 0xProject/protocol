import { BlockchainTestsEnvironment } from '@0x/contracts-test-utils';
import { LimitOrder, LimitOrderFields, OrderInfo, RfqOrder, RfqOrderFields } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';
import { TransactionReceiptWithDecodedLogs } from 'ethereum-types';
import { IZeroExContract, IZeroExLimitOrderFilledEventArgs, IZeroExRfqOrderFilledEventArgs } from '../../src/wrappers';
import { TestMintableERC20TokenContract } from '../wrappers';
interface RfqOrderFilledAmounts {
    makerTokenFilledAmount: BigNumber;
    takerTokenFilledAmount: BigNumber;
}
interface LimitOrderFilledAmounts {
    makerTokenFilledAmount: BigNumber;
    takerTokenFilledAmount: BigNumber;
    takerTokenFeeFilledAmount: BigNumber;
}
export declare class NativeOrdersTestEnvironment {
    readonly maker: string;
    readonly taker: string;
    readonly makerToken: TestMintableERC20TokenContract;
    readonly takerToken: TestMintableERC20TokenContract;
    readonly zeroEx: IZeroExContract;
    readonly gasPrice: BigNumber;
    readonly protocolFee: BigNumber;
    private readonly _env;
    static createAsync(env: BlockchainTestsEnvironment, gasPrice?: BigNumber, protocolFeeMultiplier?: number): Promise<NativeOrdersTestEnvironment>;
    constructor(maker: string, taker: string, makerToken: TestMintableERC20TokenContract, takerToken: TestMintableERC20TokenContract, zeroEx: IZeroExContract, gasPrice: BigNumber, protocolFee: BigNumber, _env: BlockchainTestsEnvironment);
    prepareBalancesForOrdersAsync(orders: LimitOrder[] | RfqOrder[], taker?: string): Promise<void>;
    fillLimitOrderAsync(order: LimitOrder, opts?: Partial<{
        fillAmount: BigNumber | number;
        taker: string;
        protocolFee: BigNumber | number;
    }>): Promise<TransactionReceiptWithDecodedLogs>;
    fillRfqOrderAsync(order: RfqOrder, fillAmount?: BigNumber | number, taker?: string): Promise<TransactionReceiptWithDecodedLogs>;
    createLimitOrderFilledEventArgs(order: LimitOrder, takerTokenFillAmount?: BigNumber, takerTokenAlreadyFilledAmount?: BigNumber): IZeroExLimitOrderFilledEventArgs;
    createRfqOrderFilledEventArgs(order: RfqOrder, takerTokenFillAmount?: BigNumber, takerTokenAlreadyFilledAmount?: BigNumber): IZeroExRfqOrderFilledEventArgs;
}
/**
 * Generate a random limit order.
 */
export declare function getRandomLimitOrder(fields?: Partial<LimitOrderFields>): LimitOrder;
/**
 * Generate a random RFQ order.
 */
export declare function getRandomRfqOrder(fields?: Partial<RfqOrderFields>): RfqOrder;
/**
 * Asserts the fields of an OrderInfo object.
 */
export declare function assertOrderInfoEquals(actual: OrderInfo, expected: OrderInfo): void;
/**
 * Creates an order expiry field.
 */
export declare function createExpiry(deltaSeconds?: number): BigNumber;
/**
 * Computes the maker, taker, and taker token fee amounts filled for
 * the given limit order.
 */
export declare function computeLimitOrderFilledAmounts(order: LimitOrder, takerTokenFillAmount?: BigNumber, takerTokenAlreadyFilledAmount?: BigNumber): LimitOrderFilledAmounts;
/**
 * Computes the maker and taker amounts filled for the given RFQ order.
 */
export declare function computeRfqOrderFilledAmounts(order: RfqOrder, takerTokenFillAmount?: BigNumber, takerTokenAlreadyFilledAmount?: BigNumber): RfqOrderFilledAmounts;
/**
 * Computes the remaining fillable amount in maker token for
 * the given order.
 */
export declare function getFillableMakerTokenAmount(order: LimitOrder | RfqOrder, takerTokenFilledAmount?: BigNumber): BigNumber;
/**
 * Computes the remaining fillable amnount in taker token, based on
 * the amount already filled and the maker's balance/allowance.
 */
export declare function getActualFillableTakerTokenAmount(order: LimitOrder | RfqOrder, makerBalance?: BigNumber, makerAllowance?: BigNumber, takerTokenFilledAmount?: BigNumber): BigNumber;
export {};
//# sourceMappingURL=orders.d.ts.map