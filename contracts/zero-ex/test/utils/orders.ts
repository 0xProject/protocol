import {
    BlockchainTestsEnvironment,
    constants,
    expect,
    getRandomInteger,
    randomAddress,
} from '@0x/contracts-test-utils';
import {
    LimitOrder,
    LimitOrderFields,
    OrderBase,
    OrderInfo,
    OtcOrder,
    RfqOrder,
    RfqOrderFields,
    SignatureType,
} from '@0x/protocol-utils';
import { BigNumber, hexUtils } from '@0x/utils';
import { TransactionReceiptWithDecodedLogs } from 'ethereum-types';

import {
    IZeroExContract,
    IZeroExLimitOrderFilledEventArgs,
    IZeroExOtcOrderFilledEventArgs,
    IZeroExRfqOrderFilledEventArgs,
} from '../../src/wrappers';
import { artifacts } from '../artifacts';
import { fullMigrateAsync } from '../utils/migration';
import { TestMintableERC20TokenContract } from '../wrappers';

const { ZERO_AMOUNT: ZERO, NULL_ADDRESS } = constants;

interface RfqOrderFilledAmounts {
    makerTokenFilledAmount: BigNumber;
    takerTokenFilledAmount: BigNumber;
}
type OtcOrderFilledAmounts = RfqOrderFilledAmounts;

interface LimitOrderFilledAmounts {
    makerTokenFilledAmount: BigNumber;
    takerTokenFilledAmount: BigNumber;
    takerTokenFeeFilledAmount: BigNumber;
}

export enum OtcOrderWethOptions {
    LeaveAsWeth,
    WrapEth,
    UnwrapWeth,
}

export class NativeOrdersTestEnvironment {
    public static async createAsync(
        env: BlockchainTestsEnvironment,
        gasPrice: BigNumber = new BigNumber('123e9'),
        protocolFeeMultiplier = 70e3,
    ): Promise<NativeOrdersTestEnvironment> {
        const [owner, maker, taker] = await env.getAccountAddressesAsync();
        const [makerToken, takerToken] = await Promise.all(
            [...new Array(2)].map(async () =>
                TestMintableERC20TokenContract.deployFrom0xArtifactAsync(
                    artifacts.TestMintableERC20Token,
                    env.provider,
                    { ...env.txDefaults, gasPrice },
                    artifacts,
                ),
            ),
        );
        const zeroEx = await fullMigrateAsync(owner, env.provider, env.txDefaults, {}, { protocolFeeMultiplier });
        await makerToken.approve(zeroEx.address, constants.MAX_UINT256).awaitTransactionSuccessAsync({ from: maker });
        await takerToken.approve(zeroEx.address, constants.MAX_UINT256).awaitTransactionSuccessAsync({ from: taker });
        return new NativeOrdersTestEnvironment(
            maker,
            taker,
            makerToken,
            takerToken,
            zeroEx,
            gasPrice,
            gasPrice.times(protocolFeeMultiplier),
            env,
        );
    }

    constructor(
        public readonly maker: string,
        public readonly taker: string,
        public readonly makerToken: TestMintableERC20TokenContract,
        public readonly takerToken: TestMintableERC20TokenContract,
        public readonly zeroEx: IZeroExContract,
        public readonly gasPrice: BigNumber,
        public readonly protocolFee: BigNumber,
        private readonly _env: BlockchainTestsEnvironment,
    ) {}

    public async prepareBalancesForOrdersAsync(
        orders: LimitOrder[] | RfqOrder[] | OtcOrder[],
        taker: string = this.taker,
    ): Promise<void> {
        await this.makerToken
            .mint(this.maker, BigNumber.sum(...(orders as OrderBase[]).map(order => order.makerAmount)))
            .awaitTransactionSuccessAsync();
        await this.takerToken
            .mint(
                taker,
                BigNumber.sum(
                    ...(orders as OrderBase[]).map(order =>
                        order.takerAmount.plus(order instanceof LimitOrder ? order.takerTokenFeeAmount : 0),
                    ),
                ),
            )
            .awaitTransactionSuccessAsync();
    }

    public async fillLimitOrderAsync(
        order: LimitOrder,
        opts: Partial<{
            fillAmount: BigNumber | number;
            taker: string;
            protocolFee: BigNumber | number;
        }> = {},
    ): Promise<TransactionReceiptWithDecodedLogs> {
        const { fillAmount, taker, protocolFee } = {
            taker: this.taker,
            fillAmount: order.takerAmount,
            ...opts,
        };
        await this.prepareBalancesForOrdersAsync([order], taker);
        const value = protocolFee === undefined ? this.protocolFee : protocolFee;
        return this.zeroEx
            .fillLimitOrder(
                order,
                await order.getSignatureWithProviderAsync(this._env.provider),
                new BigNumber(fillAmount),
            )
            .awaitTransactionSuccessAsync({ from: taker, value });
    }

    public async fillRfqOrderAsync(
        order: RfqOrder,
        fillAmount: BigNumber | number = order.takerAmount,
        taker: string = this.taker,
    ): Promise<TransactionReceiptWithDecodedLogs> {
        await this.prepareBalancesForOrdersAsync([order], taker);
        return this.zeroEx
            .fillRfqOrder(
                order,
                await order.getSignatureWithProviderAsync(this._env.provider),
                new BigNumber(fillAmount),
            )
            .awaitTransactionSuccessAsync({ from: taker });
    }

    public async fillOtcOrderAsync(
        order: OtcOrder,
        fillAmount: BigNumber | number = order.takerAmount,
        taker: string = this.taker,
        unwrapWeth = false,
    ): Promise<TransactionReceiptWithDecodedLogs> {
        await this.prepareBalancesForOrdersAsync([order], taker);
        if (unwrapWeth) {
            return this.zeroEx
                .fillOtcOrderForEth(
                    order,
                    await order.getSignatureWithProviderAsync(this._env.provider),
                    new BigNumber(fillAmount),
                )
                .awaitTransactionSuccessAsync({ from: taker });
        } else {
            return this.zeroEx
                .fillOtcOrder(
                    order,
                    await order.getSignatureWithProviderAsync(this._env.provider),
                    new BigNumber(fillAmount),
                )
                .awaitTransactionSuccessAsync({ from: taker });
        }
    }

    public async fillTakerSignedOtcOrderAsync(
        order: OtcOrder,
        origin: string = order.txOrigin,
        taker: string = order.taker,
        unwrapWeth = false,
    ): Promise<TransactionReceiptWithDecodedLogs> {
        await this.prepareBalancesForOrdersAsync([order], taker);
        if (unwrapWeth) {
            return this.zeroEx
                .fillTakerSignedOtcOrderForEth(
                    order,
                    await order.getSignatureWithProviderAsync(this._env.provider),
                    await order.getSignatureWithProviderAsync(this._env.provider, SignatureType.EthSign, taker),
                )
                .awaitTransactionSuccessAsync({ from: origin });
        } else {
            return this.zeroEx
                .fillTakerSignedOtcOrder(
                    order,
                    await order.getSignatureWithProviderAsync(this._env.provider),
                    await order.getSignatureWithProviderAsync(this._env.provider, SignatureType.EthSign, taker),
                )
                .awaitTransactionSuccessAsync({ from: origin });
        }
    }

    public async fillOtcOrderWithEthAsync(
        order: OtcOrder,
        fillAmount: BigNumber | number = order.takerAmount,
        taker: string = this.taker,
    ): Promise<TransactionReceiptWithDecodedLogs> {
        await this.prepareBalancesForOrdersAsync([order], taker);
        return this.zeroEx
            .fillOtcOrderWithEth(order, await order.getSignatureWithProviderAsync(this._env.provider))
            .awaitTransactionSuccessAsync({ from: taker, value: fillAmount });
    }

    public createLimitOrderFilledEventArgs(
        order: LimitOrder,
        takerTokenFillAmount: BigNumber = order.takerAmount,
        takerTokenAlreadyFilledAmount: BigNumber = ZERO,
    ): IZeroExLimitOrderFilledEventArgs {
        const { makerTokenFilledAmount, takerTokenFilledAmount, takerTokenFeeFilledAmount } =
            computeLimitOrderFilledAmounts(order, takerTokenFillAmount, takerTokenAlreadyFilledAmount);
        const protocolFee = order.taker !== NULL_ADDRESS ? ZERO : this.protocolFee;
        return {
            takerTokenFilledAmount,
            makerTokenFilledAmount,
            takerTokenFeeFilledAmount,
            orderHash: order.getHash(),
            maker: order.maker,
            taker: this.taker,
            feeRecipient: order.feeRecipient,
            makerToken: order.makerToken,
            takerToken: order.takerToken,
            protocolFeePaid: protocolFee,
            pool: order.pool,
        };
    }

    public createRfqOrderFilledEventArgs(
        order: RfqOrder,
        takerTokenFillAmount: BigNumber = order.takerAmount,
        takerTokenAlreadyFilledAmount: BigNumber = ZERO,
    ): IZeroExRfqOrderFilledEventArgs {
        const { makerTokenFilledAmount, takerTokenFilledAmount } = computeRfqOrderFilledAmounts(
            order,
            takerTokenFillAmount,
            takerTokenAlreadyFilledAmount,
        );
        return {
            takerTokenFilledAmount,
            makerTokenFilledAmount,
            orderHash: order.getHash(),
            maker: order.maker,
            taker: this.taker,
            makerToken: order.makerToken,
            takerToken: order.takerToken,
            pool: order.pool,
        };
    }

    public createOtcOrderFilledEventArgs(
        order: OtcOrder,
        takerTokenFillAmount: BigNumber = order.takerAmount,
    ): IZeroExOtcOrderFilledEventArgs {
        const { makerTokenFilledAmount, takerTokenFilledAmount } = computeOtcOrderFilledAmounts(
            order,
            takerTokenFillAmount,
        );
        return {
            takerTokenFilledAmount,
            makerTokenFilledAmount,
            orderHash: order.getHash(),
            maker: order.maker,
            taker: order.taker !== NULL_ADDRESS ? order.taker : this.taker,
            makerToken: order.makerToken,
            takerToken: order.takerToken,
        };
    }
}

/**
 * Generate a random limit order.
 */
export function getRandomLimitOrder(fields: Partial<LimitOrderFields> = {}): LimitOrder {
    return new LimitOrder({
        makerToken: randomAddress(),
        takerToken: randomAddress(),
        makerAmount: getRandomInteger('1e18', '100e18'),
        takerAmount: getRandomInteger('1e6', '100e6'),
        takerTokenFeeAmount: getRandomInteger('0.01e18', '1e18'),
        maker: randomAddress(),
        taker: randomAddress(),
        sender: randomAddress(),
        feeRecipient: randomAddress(),
        pool: hexUtils.random(),
        expiry: new BigNumber(Math.floor(Date.now() / 1000 + 60)),
        salt: new BigNumber(hexUtils.random()),
        ...fields,
    });
}

/**
 * Generate a random RFQ order.
 */
export function getRandomRfqOrder(fields: Partial<RfqOrderFields> = {}): RfqOrder {
    return new RfqOrder({
        makerToken: randomAddress(),
        takerToken: randomAddress(),
        makerAmount: getRandomInteger('1e18', '100e18'),
        takerAmount: getRandomInteger('1e6', '100e6'),
        maker: randomAddress(),
        txOrigin: randomAddress(),
        pool: hexUtils.random(),
        expiry: new BigNumber(Math.floor(Date.now() / 1000 + 60)),
        salt: new BigNumber(hexUtils.random()),
        ...fields,
    });
}

/**
 * Generate a random OTC Order
 */
export function getRandomOtcOrder(fields: Partial<OtcOrder> = {}): OtcOrder {
    return new OtcOrder({
        makerToken: randomAddress(),
        takerToken: randomAddress(),
        makerAmount: getRandomInteger('1e18', '100e18'),
        takerAmount: getRandomInteger('1e6', '100e6'),
        maker: randomAddress(),
        taker: randomAddress(),
        txOrigin: randomAddress(),
        expiryAndNonce: OtcOrder.encodeExpiryAndNonce(
            fields.expiry ?? new BigNumber(Math.floor(Date.now() / 1000 + 60)), // expiry
            fields.nonceBucket ?? getRandomInteger(0, OtcOrder.MAX_NONCE_BUCKET), // nonceBucket
            fields.nonce ?? getRandomInteger(0, OtcOrder.MAX_NONCE_VALUE), // nonce
        ),
        ...fields,
    });
}

/**
 * Asserts the fields of an OrderInfo object.
 */
export function assertOrderInfoEquals(actual: OrderInfo, expected: OrderInfo): void {
    expect(actual.status, 'Order status').to.eq(expected.status);
    expect(actual.orderHash, 'Order hash').to.eq(expected.orderHash);
    expect(actual.takerTokenFilledAmount, 'Order takerTokenFilledAmount').to.bignumber.eq(
        expected.takerTokenFilledAmount,
    );
}

/**
 * Creates an order expiry field.
 */
export function createExpiry(deltaSeconds = 60): BigNumber {
    return new BigNumber(Math.floor(Date.now() / 1000) + deltaSeconds);
}

/**
 * Computes the maker, taker, and taker token fee amounts filled for
 * the given limit order.
 */
export function computeLimitOrderFilledAmounts(
    order: LimitOrder,
    takerTokenFillAmount: BigNumber = order.takerAmount,
    takerTokenAlreadyFilledAmount: BigNumber = ZERO,
): LimitOrderFilledAmounts {
    const fillAmount = BigNumber.min(
        order.takerAmount,
        takerTokenFillAmount,
        order.takerAmount.minus(takerTokenAlreadyFilledAmount),
    );
    const makerTokenFilledAmount = fillAmount
        .times(order.makerAmount)
        .div(order.takerAmount)
        .integerValue(BigNumber.ROUND_DOWN);
    const takerTokenFeeFilledAmount = fillAmount
        .times(order.takerTokenFeeAmount)
        .div(order.takerAmount)
        .integerValue(BigNumber.ROUND_DOWN);
    return {
        makerTokenFilledAmount,
        takerTokenFilledAmount: fillAmount,
        takerTokenFeeFilledAmount,
    };
}

/**
 * Computes the maker and taker amounts filled for the given RFQ order.
 */
export function computeRfqOrderFilledAmounts(
    order: RfqOrder,
    takerTokenFillAmount: BigNumber = order.takerAmount,
    takerTokenAlreadyFilledAmount: BigNumber = ZERO,
): RfqOrderFilledAmounts {
    const fillAmount = BigNumber.min(
        order.takerAmount,
        takerTokenFillAmount,
        order.takerAmount.minus(takerTokenAlreadyFilledAmount),
    );
    const makerTokenFilledAmount = fillAmount
        .times(order.makerAmount)
        .div(order.takerAmount)
        .integerValue(BigNumber.ROUND_DOWN);
    return {
        makerTokenFilledAmount,
        takerTokenFilledAmount: fillAmount,
    };
}

/**
 * Computes the maker and taker amounts filled for the given OTC order.
 */
export function computeOtcOrderFilledAmounts(
    order: OtcOrder,
    takerTokenFillAmount: BigNumber = order.takerAmount,
): OtcOrderFilledAmounts {
    const fillAmount = BigNumber.min(order.takerAmount, takerTokenFillAmount, order.takerAmount);
    const makerTokenFilledAmount = fillAmount
        .times(order.makerAmount)
        .div(order.takerAmount)
        .integerValue(BigNumber.ROUND_DOWN);
    return {
        makerTokenFilledAmount,
        takerTokenFilledAmount: fillAmount,
    };
}

/**
 * Computes the remaining fillable amount in maker token for
 * the given order.
 */
export function getFillableMakerTokenAmount(
    order: LimitOrder | RfqOrder,
    takerTokenFilledAmount: BigNumber = ZERO,
): BigNumber {
    return order.takerAmount
        .minus(takerTokenFilledAmount)
        .times(order.makerAmount)
        .div(order.takerAmount)
        .integerValue(BigNumber.ROUND_DOWN);
}

/**
 * Computes the remaining fillable amnount in taker token, based on
 * the amount already filled and the maker's balance/allowance.
 */
export function getActualFillableTakerTokenAmount(
    order: LimitOrder | RfqOrder,
    makerBalance: BigNumber = order.makerAmount,
    makerAllowance: BigNumber = order.makerAmount,
    takerTokenFilledAmount: BigNumber = ZERO,
): BigNumber {
    const fillableMakerTokenAmount = getFillableMakerTokenAmount(order, takerTokenFilledAmount);
    return BigNumber.min(fillableMakerTokenAmount, makerBalance, makerAllowance)
        .times(order.takerAmount)
        .div(order.makerAmount)
        .integerValue(BigNumber.ROUND_UP);
}
