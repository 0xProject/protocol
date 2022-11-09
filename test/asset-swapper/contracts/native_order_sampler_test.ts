import { artifacts as erc20Artifacts, DummyERC20TokenContract } from '@0x/contracts-erc20';
import {
    assertIntegerRoughlyEquals,
    blockchainTests,
    constants,
    expect,
    getRandomInteger,
    randomAddress,
} from '@0x/contracts-test-utils';
import { Web3Wrapper } from '@0x/dev-utils';
import { SignatureType } from '@0x/protocol-utils';
import { BigNumber, hexUtils } from '@0x/utils';

import { LimitOrderFields } from '../../../src/asset-swapper';
import { NULL_ADDRESS } from '../../../src/asset-swapper/utils/market_operation_utils/constants';
import { artifacts } from '../../artifacts';
import { TestNativeOrderSamplerContract } from '../../wrappers';

const { NULL_BYTES, ZERO_AMOUNT } = constants;

blockchainTests.resets('NativeOrderSampler contract', (env) => {
    let testContract: TestNativeOrderSamplerContract;
    let makerToken: string;
    let takerToken: string;
    let makerAddress: string;
    const VALID_SIGNATURE = { v: 1, r: '0x01', s: '0x01', signatureType: SignatureType.EthSign };

    before(async () => {
        testContract = await TestNativeOrderSamplerContract.deployFrom0xArtifactAsync(
            artifacts.TestNativeOrderSampler,
            env.provider,
            env.txDefaults,
            {},
        );
        const NUM_TOKENS = new BigNumber(3);
        [makerToken, takerToken] = await testContract.createTokens(NUM_TOKENS).callAsync();
        [makerAddress] = await new Web3Wrapper(env.provider).getAvailableAddressesAsync();
        await testContract.createTokens(NUM_TOKENS).awaitTransactionSuccessAsync();
    });

    function getPackedHash(...args: string[]): string {
        return hexUtils.hash(hexUtils.concat(...args.map((a) => hexUtils.toHex(a))));
    }

    interface OrderInfo {
        orderHash: string;
        orderStatus: number;
        orderTakerAssetFilledAmount: BigNumber;
    }

    function getOrderInfo(order: LimitOrderFields): OrderInfo {
        const hash = getPackedHash(hexUtils.leftPad(order.salt));
        const orderStatus = order.salt.mod(255).eq(0) ? 3 : 5;
        const filledAmount = order.expiry;
        return {
            orderStatus,
            orderHash: hash,
            orderTakerAssetFilledAmount: filledAmount,
        };
    }

    function createFillableOrderSalt(): BigNumber {
        return new BigNumber(hexUtils.concat(hexUtils.slice(hexUtils.random(), 0, -1), '0x01'));
    }

    function createUnfillableOrderSalt(): BigNumber {
        return new BigNumber(hexUtils.concat(hexUtils.slice(hexUtils.random(), 0, -1), '0xff'));
    }

    function getLimitOrderFillableTakerAmount(order: LimitOrderFields): BigNumber {
        return order.takerAmount.minus(getOrderInfo(order).orderTakerAssetFilledAmount);
    }

    function createOrder(
        fields: Partial<LimitOrderFields> = {},
        filledTakerAssetAmount: BigNumber = ZERO_AMOUNT,
    ): LimitOrderFields {
        return {
            chainId: 1337,
            verifyingContract: randomAddress(),
            maker: makerAddress,
            taker: NULL_ADDRESS,
            pool: NULL_BYTES,
            sender: NULL_ADDRESS,
            feeRecipient: randomAddress(),
            makerAmount: getRandomInteger(1, 1e18),
            takerAmount: getRandomInteger(1, 1e18),
            takerTokenFeeAmount: getRandomInteger(1, 1e18),
            makerToken,
            takerToken,
            salt: createFillableOrderSalt(),
            expiry: filledTakerAssetAmount,
            ...fields,
        };
    }

    async function fundMakerAsync(order: LimitOrderFields, balanceScaling = 1, allowanceScaling = 1): Promise<void> {
        const token = makerToken;
        let amount = order.makerAmount;
        amount = amount.times(getLimitOrderFillableTakerAmount(order).div(BigNumber.max(1, order.takerAmount)));
        await testContract
            .setTokenBalanceAndAllowance(
                token,
                order.maker,
                testContract.address,
                amount.times(balanceScaling).integerValue(),
                amount.times(allowanceScaling).integerValue(),
            )
            .awaitTransactionSuccessAsync();
    }

    describe('getTokenDecimals()', () => {
        it('correctly returns the token decimals', async () => {
            const newMakerToken = await DummyERC20TokenContract.deployFrom0xArtifactAsync(
                erc20Artifacts.DummyERC20Token,
                env.provider,
                env.txDefaults,
                artifacts,
                constants.DUMMY_TOKEN_NAME,
                constants.DUMMY_TOKEN_SYMBOL,
                new BigNumber(18),
                constants.DUMMY_TOKEN_TOTAL_SUPPLY,
            );
            const newTakerToken = await DummyERC20TokenContract.deployFrom0xArtifactAsync(
                erc20Artifacts.DummyERC20Token,
                env.provider,
                env.txDefaults,
                artifacts,
                constants.DUMMY_TOKEN_NAME,
                constants.DUMMY_TOKEN_SYMBOL,
                new BigNumber(6),
                constants.DUMMY_TOKEN_TOTAL_SUPPLY,
            );
            const [makerDecimals, takerDecimals] = await testContract
                .getTokenDecimals([newMakerToken.address, newTakerToken.address])
                .callAsync();
            expect(makerDecimals.toString()).to.eql('18');
            expect(takerDecimals.toString()).to.eql('6');
        });
    });

    describe('getLimitOrderFillableTakerAmount()', () => {
        it('returns the full amount for a fully funded order', async () => {
            const order = createOrder();
            await fundMakerAsync(order);
            const expected = getLimitOrderFillableTakerAmount(order);
            const actual = await testContract
                .getLimitOrderFillableTakerAmount(order, VALID_SIGNATURE, testContract.address)
                .callAsync();
            expect(actual).to.bignumber.eq(expected);
        });

        it('returns partial amount with insufficient maker asset balance', async () => {
            const order = createOrder();
            const expected = getLimitOrderFillableTakerAmount(order).times(0.5).integerValue(BigNumber.ROUND_DOWN);
            await fundMakerAsync(order, 0.5);
            const actual = await testContract
                .getLimitOrderFillableTakerAmount(order, VALID_SIGNATURE, testContract.address)
                .callAsync();
            assertIntegerRoughlyEquals(actual, expected, 100);
        });

        it('returns partial amount with insufficient maker asset allowance', async () => {
            const order = createOrder();
            const expected = getLimitOrderFillableTakerAmount(order).times(0.5).integerValue(BigNumber.ROUND_DOWN);
            await fundMakerAsync(order, 1, 0.5);
            const actual = await testContract
                .getLimitOrderFillableTakerAmount(order, VALID_SIGNATURE, testContract.address)
                .callAsync();
            assertIntegerRoughlyEquals(actual, expected, 100);
        });

        it('returns zero for an that is not fillable', async () => {
            const order = {
                ...createOrder(),
                salt: createUnfillableOrderSalt(),
            };
            await fundMakerAsync(order);
            const fillableTakerAmount = await testContract
                .getLimitOrderFillableTakerAmount(order, VALID_SIGNATURE, testContract.address)
                .callAsync();
            expect(fillableTakerAmount).to.bignumber.eq(ZERO_AMOUNT);
        });

        it('returns zero for an order with zero maker asset amount', async () => {
            const order = {
                ...createOrder(),
                makerAmount: ZERO_AMOUNT,
            };
            await fundMakerAsync(order);
            const fillableTakerAmount = await testContract
                .getLimitOrderFillableTakerAmount(order, VALID_SIGNATURE, testContract.address)
                .callAsync();
            expect(fillableTakerAmount).to.bignumber.eq(ZERO_AMOUNT);
        });

        it('returns zero for an order with zero taker asset amount', async () => {
            const order = {
                ...createOrder(),
                takerAmount: ZERO_AMOUNT,
            };
            await fundMakerAsync(order);
            const fillableTakerAmount = await testContract
                .getLimitOrderFillableTakerAmount(order, VALID_SIGNATURE, testContract.address)
                .callAsync();
            expect(fillableTakerAmount).to.bignumber.eq(ZERO_AMOUNT);
        });

        it('returns zero for an order with an empty signature', async () => {
            const order = createOrder();
            await fundMakerAsync(order);
            const fillableTakerAmount = await testContract
                .getLimitOrderFillableTakerAmount(
                    order,
                    { ...VALID_SIGNATURE, r: NULL_BYTES, s: NULL_BYTES },
                    testContract.address,
                )
                .callAsync();
            expect(fillableTakerAmount).to.bignumber.eq(ZERO_AMOUNT);
        });
    });
});
