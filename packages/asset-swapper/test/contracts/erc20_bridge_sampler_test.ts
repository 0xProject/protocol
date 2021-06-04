import {
    blockchainTests,
    constants,
    expect,
    getRandomInteger,
    getRandomPortion,
    randomAddress,
} from '@0x/contracts-test-utils';
import { SignatureType } from '@0x/protocol-utils';
import { BigNumber, hexUtils, NULL_BYTES } from '@0x/utils';
import * as _ from 'lodash';

import { FillQuoteTransformerOrderType, LimitOrderFields } from '../../src';
import { SamplerCallResult, SignedNativeOrder } from '../../src/types';
import { artifacts } from '../artifacts';
import { DummyLiquidityProviderContract, TestERC20BridgeSamplerContract } from '../wrappers';

// tslint:disable: custom-no-magic-numbers

const { NULL_ADDRESS } = constants;
// jacob: Skip until we can override in Ganache
blockchainTests.skip('erc20-bridge-sampler', env => {
    let testContract: TestERC20BridgeSamplerContract;
    const RATE_DENOMINATOR = constants.ONE_ETHER;
    const MIN_RATE = new BigNumber('0.01');
    const MAX_RATE = new BigNumber('100');
    const MIN_DECIMALS = 4;
    const MAX_DECIMALS = 20;
    const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
    const KYBER_SALT = '0x0ff3ca9d46195c39f9a12afb74207b4970349fb3cfb1e459bbf170298d326bc7';
    const ETH2DAI_SALT = '0xb713b61bb9bb2958a0f5d1534b21e94fc68c4c0c034b0902ed844f2f6cd1b4f7';
    const UNISWAP_BASE_SALT = '0x1d6a6a0506b0b4a554b907a4c29d9f4674e461989d9c1921feb17b26716385ab';
    const UNISWAP_V2_SALT = '0xadc7fcb33c735913b8635927e66896b356a53a912ab2ceff929e60a04b53b3c1';
    const INVALID_TOKEN_PAIR_ERROR = 'ERC20BridgeSampler/INVALID_TOKEN_PAIR';
    const MAKER_TOKEN = randomAddress();
    const TAKER_TOKEN = randomAddress();
    const INTERMEDIATE_TOKEN = randomAddress();
    const KYBER_RESERVE_OFFSET = new BigNumber(0);
    let KYBER_ADDRESS = '';
    let ETH2DAI_ADDRESS = '';
    let UNISWAP_V2_ROUTER = '';

    before(async () => {
        testContract = await TestERC20BridgeSamplerContract.deployFrom0xArtifactAsync(
            artifacts.TestERC20BridgeSampler,
            env.provider,
            { ...env.txDefaults, gas: 100e6 },
            {},
        );
        UNISWAP_V2_ROUTER = await testContract.uniswapV2Router().callAsync();
        KYBER_ADDRESS = await testContract.kyber().callAsync();
        ETH2DAI_ADDRESS = await testContract.eth2Dai().callAsync();
    });

    function getPackedHash(...args: string[]): string {
        return hexUtils.hash(hexUtils.concat(...args.map(a => hexUtils.toHex(a))));
    }

    function getUniswapExchangeSalt(tokenAddress: string): string {
        return getPackedHash(UNISWAP_BASE_SALT, tokenAddress);
    }

    function getDeterministicRate(salt: string, sellToken: string, buyToken: string): BigNumber {
        const hash = getPackedHash(salt, sellToken, buyToken);
        const _minRate = RATE_DENOMINATOR.times(MIN_RATE);
        const _maxRate = RATE_DENOMINATOR.times(MAX_RATE);
        return new BigNumber(hash)
            .mod(_maxRate.minus(_minRate))
            .plus(_minRate)
            .div(RATE_DENOMINATOR);
    }

    function getDeterministicTokenDecimals(token: string): number {
        if (token === WETH_ADDRESS) {
            return 18;
        }
        // HACK(dorothy-zbornak): Linter will complain about the addition not being
        // between two numbers, even though they are.
        // tslint:disable-next-line restrict-plus-operands
        return new BigNumber(getPackedHash(token)).mod(MAX_DECIMALS - MIN_DECIMALS).toNumber() + MIN_DECIMALS;
    }

    function getDeterministicSellQuote(
        salt: string,
        sellToken: string,
        buyToken: string,
        sellAmount: BigNumber,
    ): BigNumber {
        const sellBase = new BigNumber(10).pow(getDeterministicTokenDecimals(sellToken));
        const buyBase = new BigNumber(10).pow(getDeterministicTokenDecimals(buyToken));
        const rate = getDeterministicRate(salt, sellToken, buyToken);
        return sellAmount
            .times(rate)
            .times(buyBase)
            .dividedToIntegerBy(sellBase);
    }

    function getDeterministicBuyQuote(
        salt: string,
        sellToken: string,
        buyToken: string,
        buyAmount: BigNumber,
    ): BigNumber {
        const sellBase = new BigNumber(10).pow(getDeterministicTokenDecimals(sellToken));
        const buyBase = new BigNumber(10).pow(getDeterministicTokenDecimals(buyToken));
        const rate = getDeterministicRate(salt, sellToken, buyToken);
        return buyAmount
            .times(sellBase)
            .dividedToIntegerBy(rate)
            .dividedToIntegerBy(buyBase);
    }

    function areAddressesEqual(a: string, b: string): boolean {
        return a.toLowerCase() === b.toLowerCase();
    }

    function getDeterministicUniswapSellQuote(sellToken: string, buyToken: string, sellAmount: BigNumber): BigNumber {
        if (areAddressesEqual(buyToken, WETH_ADDRESS)) {
            return getDeterministicSellQuote(getUniswapExchangeSalt(sellToken), sellToken, WETH_ADDRESS, sellAmount);
        }
        if (areAddressesEqual(sellToken, WETH_ADDRESS)) {
            return getDeterministicSellQuote(getUniswapExchangeSalt(buyToken), buyToken, WETH_ADDRESS, sellAmount);
        }
        const ethBought = getDeterministicSellQuote(
            getUniswapExchangeSalt(sellToken),
            sellToken,
            WETH_ADDRESS,
            sellAmount,
        );
        return getDeterministicSellQuote(getUniswapExchangeSalt(buyToken), buyToken, WETH_ADDRESS, ethBought);
    }

    function getDeterministicUniswapBuyQuote(sellToken: string, buyToken: string, buyAmount: BigNumber): BigNumber {
        if (areAddressesEqual(buyToken, WETH_ADDRESS)) {
            return getDeterministicBuyQuote(getUniswapExchangeSalt(sellToken), WETH_ADDRESS, sellToken, buyAmount);
        }
        if (areAddressesEqual(sellToken, WETH_ADDRESS)) {
            return getDeterministicBuyQuote(getUniswapExchangeSalt(buyToken), WETH_ADDRESS, buyToken, buyAmount);
        }
        const ethSold = getDeterministicBuyQuote(getUniswapExchangeSalt(buyToken), WETH_ADDRESS, buyToken, buyAmount);
        return getDeterministicBuyQuote(getUniswapExchangeSalt(sellToken), WETH_ADDRESS, sellToken, ethSold);
    }

    function getDeterministicSellQuotes(
        sellToken: string,
        buyToken: string,
        sources: string[],
        sampleAmounts: BigNumber[],
    ): BigNumber[][] {
        const quotes: BigNumber[][] = [];
        for (const source of sources) {
            const sampleOutputs = [];
            for (const amount of sampleAmounts) {
                if (source === 'Kyber' || source === 'Eth2Dai') {
                    sampleOutputs.push(
                        getDeterministicSellQuote(
                            source === 'Kyber' ? KYBER_SALT : ETH2DAI_SALT,
                            sellToken,
                            buyToken,
                            amount,
                        ),
                    );
                } else if (source === 'Uniswap') {
                    sampleOutputs.push(getDeterministicUniswapSellQuote(sellToken, buyToken, amount));
                }
            }
            quotes.push(sampleOutputs);
        }
        return quotes;
    }

    function getDeterministicBuyQuotes(
        sellToken: string,
        buyToken: string,
        sources: string[],
        sampleAmounts: BigNumber[],
    ): BigNumber[][] {
        const quotes: BigNumber[][] = [];
        for (const source of sources) {
            const sampleOutputs = [];
            for (const amount of sampleAmounts) {
                if (source === 'Kyber' || source === 'Eth2Dai') {
                    sampleOutputs.push(
                        getDeterministicBuyQuote(
                            source === 'Kyber' ? KYBER_SALT : ETH2DAI_SALT,
                            sellToken,
                            buyToken,
                            amount,
                        ),
                    );
                } else if (source === 'Uniswap') {
                    sampleOutputs.push(getDeterministicUniswapBuyQuote(sellToken, buyToken, amount));
                }
            }
            quotes.push(sampleOutputs);
        }
        return quotes;
    }

    function getDeterministicUniswapV2SellQuote(path: string[], sellAmount: BigNumber): BigNumber {
        let bought = sellAmount;
        for (let i = 0; i < path.length - 1; ++i) {
            bought = getDeterministicSellQuote(UNISWAP_V2_SALT, path[i], path[i + 1], bought);
        }
        return bought;
    }

    function getDeterministicUniswapV2BuyQuote(path: string[], buyAmount: BigNumber): BigNumber {
        let sold = buyAmount;
        for (let i = path.length - 1; i > 0; --i) {
            sold = getDeterministicBuyQuote(UNISWAP_V2_SALT, path[i - 1], path[i], sold);
        }
        return sold;
    }

    function getDeterministicFillableTakerAssetAmount(order: SignedNativeOrder): BigNumber {
        const hash = getPackedHash(hexUtils.leftPad(order.order.salt));
        return new BigNumber(hash).mod(order.order.takerAmount);
    }

    function getDeterministicFillableMakerAssetAmount(order: SignedNativeOrder): BigNumber {
        const takerAmount = getDeterministicFillableTakerAssetAmount(order);
        return order.order.makerAmount
            .times(takerAmount)
            .div(order.order.takerAmount)
            .integerValue(BigNumber.ROUND_UP);
    }

    function getSampleAmounts(tokenAddress: string, count?: number): BigNumber[] {
        const tokenDecimals = getDeterministicTokenDecimals(tokenAddress);
        const _upperLimit = getRandomPortion(getRandomInteger(1000, 50000).times(10 ** tokenDecimals));
        const _count = count || _.random(1, 16);
        const d = _upperLimit.div(_count);
        return _.times(_count, i => d.times((i + 1) / _count).integerValue());
    }

    function createOrder(makerToken: string, takerToken: string): SignedNativeOrder {
        return {
            order: {
                chainId: 1337,
                verifyingContract: randomAddress(),
                maker: randomAddress(),
                taker: randomAddress(),
                pool: NULL_BYTES,
                sender: NULL_ADDRESS,
                feeRecipient: randomAddress(),
                makerAmount: getRandomInteger(1, 1e18),
                takerAmount: getRandomInteger(1, 1e18),
                takerTokenFeeAmount: getRandomInteger(1, 1e18),
                makerToken,
                takerToken,
                salt: new BigNumber(hexUtils.random()),
                expiry: getRandomInteger(0, 2 ** 32),
            },
            signature: { v: 1, r: NULL_BYTES, s: NULL_BYTES, signatureType: SignatureType.EthSign },
            type: FillQuoteTransformerOrderType.Limit,
        };
    }

    function createOrders(makerToken: string, takerToken: string, count?: number): SignedNativeOrder[] {
        return _.times(count || _.random(1, 16), () => createOrder(makerToken, takerToken));
    }

    async function enableFailTriggerAsync(): Promise<void> {
        await testContract.enableFailTrigger().awaitTransactionSuccessAsync({ value: 1 });
    }

    function expectQuotesWithinRange(
        quotes: BigNumber[],
        expectedQuotes: BigNumber[],
        maxSlippage: BigNumber | number,
    ): void {
        quotes.forEach((_q, i) => {
            // If we're within 1 base unit of a low decimal token
            // then that's as good as we're going to get (and slippage is "high")
            if (
                expectedQuotes[i].isZero() ||
                BigNumber.max(expectedQuotes[i], quotes[i])
                    .minus(BigNumber.min(expectedQuotes[i], quotes[i]))
                    .eq(1)
            ) {
                return;
            }
            const slippage = quotes[i]
                .dividedBy(expectedQuotes[i])
                .minus(1)
                .decimalPlaces(4);
            expect(slippage, `quote[${i}]: ${slippage} ${quotes[i]} ${expectedQuotes[i]}`).to.be.bignumber.gte(0);
            expect(slippage, `quote[${i}] ${slippage} ${quotes[i]} ${expectedQuotes[i]}`).to.be.bignumber.lte(
                new BigNumber(maxSlippage),
            );
        });
    }

    describe('getOrderFillableTakerAssetAmounts()', () => {
        it('returns the expected amount for each order', async () => {
            const orders = createOrders(MAKER_TOKEN, TAKER_TOKEN);
            const expected = orders.map(getDeterministicFillableTakerAssetAmount);
            const actual = await testContract
                .getLimitOrderFillableTakerAssetAmounts(
                    // tslint:disable-next-line:no-unnecessary-type-assertion
                    orders.map(o => o.order as LimitOrderFields),
                    orders.map(o => o.signature),
                    NULL_ADDRESS,
                )
                .callAsync();
            expect(actual).to.deep.eq(expected);
        });

        it('returns empty for no orders', async () => {
            const actual = await testContract.getLimitOrderFillableTakerAssetAmounts([], [], NULL_ADDRESS).callAsync();
            expect(actual).to.deep.eq([]);
        });
    });

    describe('getOrderFillableMakerAssetAmounts()', () => {
        it('returns the expected amount for each order', async () => {
            const orders = createOrders(MAKER_TOKEN, TAKER_TOKEN);
            const expected = orders.map(getDeterministicFillableMakerAssetAmount);
            const actual = await testContract
                .getLimitOrderFillableMakerAssetAmounts(
                    // tslint:disable-next-line:no-unnecessary-type-assertion
                    orders.map(o => o.order as LimitOrderFields),
                    orders.map(o => o.signature),
                    NULL_ADDRESS,
                )
                .callAsync();
            expect(actual).to.deep.eq(expected);
        });

        it('returns empty for no orders', async () => {
            const actual = await testContract.getLimitOrderFillableMakerAssetAmounts([], [], NULL_ADDRESS).callAsync();
            expect(actual).to.deep.eq([]);
        });
    });

    blockchainTests.resets('sampleSellsFromKyberNetwork()', () => {
        let kyberOpts = {
            hintHandler: NULL_ADDRESS,
            networkProxy: NULL_ADDRESS,
            weth: WETH_ADDRESS,
            reserveOffset: KYBER_RESERVE_OFFSET,
            hint: NULL_BYTES,
        };
        before(async () => {
            await testContract.createTokenExchanges([MAKER_TOKEN, TAKER_TOKEN]).awaitTransactionSuccessAsync();
            kyberOpts = {
                ...kyberOpts,
                hintHandler: KYBER_ADDRESS,
                networkProxy: KYBER_ADDRESS,
            };
        });

        it('throws if tokens are the same', async () => {
            const tx = testContract.sampleSellsFromKyberNetwork(kyberOpts, MAKER_TOKEN, MAKER_TOKEN, []).callAsync();
            return expect(tx).to.revertWith(INVALID_TOKEN_PAIR_ERROR);
        });

        it('can return no quotes', async () => {
            const [, , quotes] = await testContract
                .sampleSellsFromKyberNetwork(kyberOpts, TAKER_TOKEN, MAKER_TOKEN, [])
                .callAsync();
            expect(quotes).to.deep.eq([]);
        });

        it('returns zero if token -> token fails', async () => {
            const sampleAmounts = getSampleAmounts(TAKER_TOKEN);
            const expectedQuotes = _.times(sampleAmounts.length, () => constants.ZERO_AMOUNT);
            await enableFailTriggerAsync();
            const [, , quotes] = await testContract
                .sampleSellsFromKyberNetwork(kyberOpts, TAKER_TOKEN, MAKER_TOKEN, sampleAmounts)
                .callAsync();
            expect(quotes).to.deep.eq(expectedQuotes);
        });

        it('can quote token -> ETH', async () => {
            const sampleAmounts = getSampleAmounts(TAKER_TOKEN);
            const [expectedQuotes] = getDeterministicSellQuotes(TAKER_TOKEN, WETH_ADDRESS, ['Kyber'], sampleAmounts);
            const [, , quotes] = await testContract
                .sampleSellsFromKyberNetwork(kyberOpts, TAKER_TOKEN, WETH_ADDRESS, sampleAmounts)
                .callAsync();
            expect(quotes).to.deep.eq(expectedQuotes);
        });

        it('can quote token -> token', async () => {
            const sampleAmounts = getSampleAmounts(TAKER_TOKEN);
            const [expectedQuotes] = getDeterministicSellQuotes(TAKER_TOKEN, MAKER_TOKEN, ['Kyber'], sampleAmounts);
            const [, , quotes] = await testContract
                .sampleSellsFromKyberNetwork(kyberOpts, TAKER_TOKEN, MAKER_TOKEN, sampleAmounts)
                .callAsync();
            expect(quotes).to.deep.eq(expectedQuotes);
        });

        it('returns zero if token -> ETH fails', async () => {
            const sampleAmounts = getSampleAmounts(TAKER_TOKEN);
            const expectedQuotes = _.times(sampleAmounts.length, () => constants.ZERO_AMOUNT);
            await enableFailTriggerAsync();
            const [, , quotes] = await testContract
                .sampleSellsFromKyberNetwork(kyberOpts, TAKER_TOKEN, WETH_ADDRESS, sampleAmounts)
                .callAsync();
            expect(quotes).to.deep.eq(expectedQuotes);
        });

        it('can quote ETH -> token', async () => {
            const sampleAmounts = getSampleAmounts(TAKER_TOKEN);
            const [expectedQuotes] = getDeterministicSellQuotes(WETH_ADDRESS, TAKER_TOKEN, ['Kyber'], sampleAmounts);
            const [, , quotes] = await testContract
                .sampleSellsFromKyberNetwork(kyberOpts, WETH_ADDRESS, TAKER_TOKEN, sampleAmounts)
                .callAsync();
            expect(quotes).to.deep.eq(expectedQuotes);
        });

        it('returns zero if ETH -> token fails', async () => {
            const sampleAmounts = getSampleAmounts(TAKER_TOKEN);
            const expectedQuotes = _.times(sampleAmounts.length, () => constants.ZERO_AMOUNT);
            await enableFailTriggerAsync();
            const [, , quotes] = await testContract
                .sampleSellsFromKyberNetwork(kyberOpts, WETH_ADDRESS, TAKER_TOKEN, sampleAmounts)
                .callAsync();
            expect(quotes).to.deep.eq(expectedQuotes);
        });
    });

    blockchainTests.resets('sampleBuysFromKyberNetwork()', () => {
        let kyberOpts = {
            hintHandler: NULL_ADDRESS,
            networkProxy: NULL_ADDRESS,
            weth: WETH_ADDRESS,
            reserveOffset: KYBER_RESERVE_OFFSET,
            hint: NULL_BYTES,
        };
        const ACCEPTABLE_SLIPPAGE = 0.0005;
        before(async () => {
            await testContract.createTokenExchanges([MAKER_TOKEN, TAKER_TOKEN]).awaitTransactionSuccessAsync();
            kyberOpts = {
                ...kyberOpts,
                hintHandler: KYBER_ADDRESS,
                networkProxy: KYBER_ADDRESS,
            };
        });

        it('throws if tokens are the same', async () => {
            const tx = testContract.sampleBuysFromKyberNetwork(kyberOpts, MAKER_TOKEN, MAKER_TOKEN, []).callAsync();
            return expect(tx).to.revertWith(INVALID_TOKEN_PAIR_ERROR);
        });

        it('can return no quotes', async () => {
            const [, , quotes] = await testContract
                .sampleBuysFromKyberNetwork(kyberOpts, TAKER_TOKEN, MAKER_TOKEN, [])
                .callAsync();
            expect(quotes).to.deep.eq([]);
        });

        it('can quote token -> token', async () => {
            const sampleAmounts = getSampleAmounts(TAKER_TOKEN);
            const [expectedQuotes] = getDeterministicBuyQuotes(TAKER_TOKEN, MAKER_TOKEN, ['Kyber'], sampleAmounts);
            const [, , quotes] = await testContract
                .sampleBuysFromKyberNetwork(kyberOpts, TAKER_TOKEN, MAKER_TOKEN, sampleAmounts)
                .callAsync();
            expectQuotesWithinRange(quotes, expectedQuotes, ACCEPTABLE_SLIPPAGE);
        });

        it('returns zero if token -> token fails', async () => {
            const sampleAmounts = getSampleAmounts(TAKER_TOKEN);
            const expectedQuotes = _.times(sampleAmounts.length, () => constants.ZERO_AMOUNT);
            await enableFailTriggerAsync();
            const [, , quotes] = await testContract
                .sampleBuysFromKyberNetwork(kyberOpts, TAKER_TOKEN, MAKER_TOKEN, sampleAmounts)
                .callAsync();
            expect(quotes).to.deep.eq(expectedQuotes);
        });

        it('can quote token -> ETH', async () => {
            const sampleAmounts = getSampleAmounts(TAKER_TOKEN);
            const [expectedQuotes] = getDeterministicBuyQuotes(TAKER_TOKEN, WETH_ADDRESS, ['Kyber'], sampleAmounts);
            const [, , quotes] = await testContract
                .sampleBuysFromKyberNetwork(kyberOpts, TAKER_TOKEN, WETH_ADDRESS, sampleAmounts)
                .callAsync();
            expectQuotesWithinRange(quotes, expectedQuotes, ACCEPTABLE_SLIPPAGE);
        });

        it('returns zero if token -> ETH fails', async () => {
            const sampleAmounts = getSampleAmounts(TAKER_TOKEN);
            const expectedQuotes = _.times(sampleAmounts.length, () => constants.ZERO_AMOUNT);
            await enableFailTriggerAsync();
            const [, , quotes] = await testContract
                .sampleBuysFromKyberNetwork(kyberOpts, TAKER_TOKEN, WETH_ADDRESS, sampleAmounts)
                .callAsync();
            expect(quotes).to.deep.eq(expectedQuotes);
        });

        it('can quote ETH -> token', async () => {
            const sampleAmounts = getSampleAmounts(TAKER_TOKEN);
            const [expectedQuotes] = getDeterministicBuyQuotes(WETH_ADDRESS, TAKER_TOKEN, ['Kyber'], sampleAmounts);
            const [, , quotes] = await testContract
                .sampleBuysFromKyberNetwork(kyberOpts, WETH_ADDRESS, TAKER_TOKEN, sampleAmounts)
                .callAsync();
            expectQuotesWithinRange(quotes, expectedQuotes, ACCEPTABLE_SLIPPAGE);
        });

        it('returns zero if ETH -> token fails', async () => {
            const sampleAmounts = getSampleAmounts(TAKER_TOKEN);
            const expectedQuotes = _.times(sampleAmounts.length, () => constants.ZERO_AMOUNT);
            await enableFailTriggerAsync();
            const [, , quotes] = await testContract
                .sampleBuysFromKyberNetwork(kyberOpts, WETH_ADDRESS, TAKER_TOKEN, sampleAmounts)
                .callAsync();
            expect(quotes).to.deep.eq(expectedQuotes);
        });
    });

    blockchainTests.resets('sampleSellsFromEth2Dai()', () => {
        before(async () => {
            await testContract.createTokenExchanges([MAKER_TOKEN, TAKER_TOKEN]).awaitTransactionSuccessAsync();
        });

        it('throws if tokens are the same', async () => {
            const tx = testContract.sampleSellsFromEth2Dai(ETH2DAI_ADDRESS, MAKER_TOKEN, MAKER_TOKEN, []).callAsync();
            return expect(tx).to.revertWith(INVALID_TOKEN_PAIR_ERROR);
        });

        it('can return no quotes', async () => {
            const quotes = await testContract
                .sampleSellsFromEth2Dai(ETH2DAI_ADDRESS, TAKER_TOKEN, MAKER_TOKEN, [])
                .callAsync();
            expect(quotes).to.deep.eq([]);
        });

        it('can quote token -> token', async () => {
            const sampleAmounts = getSampleAmounts(TAKER_TOKEN);
            const [expectedQuotes] = getDeterministicSellQuotes(TAKER_TOKEN, MAKER_TOKEN, ['Eth2Dai'], sampleAmounts);
            const quotes = await testContract
                .sampleSellsFromEth2Dai(ETH2DAI_ADDRESS, TAKER_TOKEN, MAKER_TOKEN, sampleAmounts)
                .callAsync();
            expect(quotes).to.deep.eq(expectedQuotes);
        });

        it('returns zero if token -> token fails', async () => {
            const sampleAmounts = getSampleAmounts(TAKER_TOKEN);
            const expectedQuotes = _.times(sampleAmounts.length, () => constants.ZERO_AMOUNT);
            await enableFailTriggerAsync();
            const quotes = await testContract
                .sampleSellsFromEth2Dai(ETH2DAI_ADDRESS, TAKER_TOKEN, MAKER_TOKEN, sampleAmounts)
                .callAsync();
            expect(quotes).to.deep.eq(expectedQuotes);
        });

        it('can quote token -> ETH', async () => {
            const sampleAmounts = getSampleAmounts(TAKER_TOKEN);
            const [expectedQuotes] = getDeterministicSellQuotes(TAKER_TOKEN, WETH_ADDRESS, ['Eth2Dai'], sampleAmounts);
            const quotes = await testContract
                .sampleSellsFromEth2Dai(ETH2DAI_ADDRESS, TAKER_TOKEN, WETH_ADDRESS, sampleAmounts)
                .callAsync();
            expect(quotes).to.deep.eq(expectedQuotes);
        });

        it('returns zero if token -> ETH fails', async () => {
            const sampleAmounts = getSampleAmounts(TAKER_TOKEN);
            const expectedQuotes = _.times(sampleAmounts.length, () => constants.ZERO_AMOUNT);
            await enableFailTriggerAsync();
            const quotes = await testContract
                .sampleSellsFromEth2Dai(ETH2DAI_ADDRESS, TAKER_TOKEN, WETH_ADDRESS, sampleAmounts)
                .callAsync();
            expect(quotes).to.deep.eq(expectedQuotes);
        });

        it('can quote ETH -> token', async () => {
            const sampleAmounts = getSampleAmounts(TAKER_TOKEN);
            const [expectedQuotes] = getDeterministicSellQuotes(WETH_ADDRESS, TAKER_TOKEN, ['Eth2Dai'], sampleAmounts);
            const quotes = await testContract
                .sampleSellsFromEth2Dai(ETH2DAI_ADDRESS, WETH_ADDRESS, TAKER_TOKEN, sampleAmounts)
                .callAsync();
            expect(quotes).to.deep.eq(expectedQuotes);
        });

        it('returns zero if ETH -> token fails', async () => {
            const sampleAmounts = getSampleAmounts(TAKER_TOKEN);
            const expectedQuotes = _.times(sampleAmounts.length, () => constants.ZERO_AMOUNT);
            await enableFailTriggerAsync();
            const quotes = await testContract
                .sampleSellsFromEth2Dai(ETH2DAI_ADDRESS, WETH_ADDRESS, TAKER_TOKEN, sampleAmounts)
                .callAsync();
            expect(quotes).to.deep.eq(expectedQuotes);
        });
    });

    blockchainTests.resets('sampleBuysFromEth2Dai()', () => {
        before(async () => {
            await testContract.createTokenExchanges([MAKER_TOKEN, TAKER_TOKEN]).awaitTransactionSuccessAsync();
        });

        it('throws if tokens are the same', async () => {
            const tx = testContract.sampleBuysFromEth2Dai(ETH2DAI_ADDRESS, MAKER_TOKEN, MAKER_TOKEN, []).callAsync();
            return expect(tx).to.revertWith(INVALID_TOKEN_PAIR_ERROR);
        });

        it('can return no quotes', async () => {
            const quotes = await testContract
                .sampleBuysFromEth2Dai(ETH2DAI_ADDRESS, TAKER_TOKEN, MAKER_TOKEN, [])
                .callAsync();
            expect(quotes).to.deep.eq([]);
        });

        it('can quote token -> token', async () => {
            const sampleAmounts = getSampleAmounts(MAKER_TOKEN);
            const [expectedQuotes] = getDeterministicBuyQuotes(TAKER_TOKEN, MAKER_TOKEN, ['Eth2Dai'], sampleAmounts);
            const quotes = await testContract
                .sampleBuysFromEth2Dai(ETH2DAI_ADDRESS, TAKER_TOKEN, MAKER_TOKEN, sampleAmounts)
                .callAsync();
            expect(quotes).to.deep.eq(expectedQuotes);
        });

        it('returns zero if token -> token fails', async () => {
            const sampleAmounts = getSampleAmounts(MAKER_TOKEN);
            const expectedQuotes = _.times(sampleAmounts.length, () => constants.ZERO_AMOUNT);
            await enableFailTriggerAsync();
            const quotes = await testContract
                .sampleBuysFromEth2Dai(ETH2DAI_ADDRESS, TAKER_TOKEN, MAKER_TOKEN, sampleAmounts)
                .callAsync();
            expect(quotes).to.deep.eq(expectedQuotes);
        });

        it('can quote token -> ETH', async () => {
            const sampleAmounts = getSampleAmounts(MAKER_TOKEN);
            const [expectedQuotes] = getDeterministicBuyQuotes(TAKER_TOKEN, WETH_ADDRESS, ['Eth2Dai'], sampleAmounts);
            const quotes = await testContract
                .sampleBuysFromEth2Dai(ETH2DAI_ADDRESS, TAKER_TOKEN, WETH_ADDRESS, sampleAmounts)
                .callAsync();
            expect(quotes).to.deep.eq(expectedQuotes);
        });

        it('returns zero if token -> ETH fails', async () => {
            const sampleAmounts = getSampleAmounts(MAKER_TOKEN);
            const expectedQuotes = _.times(sampleAmounts.length, () => constants.ZERO_AMOUNT);
            await enableFailTriggerAsync();
            const quotes = await testContract
                .sampleBuysFromEth2Dai(ETH2DAI_ADDRESS, TAKER_TOKEN, WETH_ADDRESS, sampleAmounts)
                .callAsync();
            expect(quotes).to.deep.eq(expectedQuotes);
        });

        it('can quote ETH -> token', async () => {
            const sampleAmounts = getSampleAmounts(MAKER_TOKEN);
            const [expectedQuotes] = getDeterministicBuyQuotes(WETH_ADDRESS, TAKER_TOKEN, ['Eth2Dai'], sampleAmounts);
            const quotes = await testContract
                .sampleBuysFromEth2Dai(ETH2DAI_ADDRESS, WETH_ADDRESS, TAKER_TOKEN, sampleAmounts)
                .callAsync();
            expect(quotes).to.deep.eq(expectedQuotes);
        });

        it('returns zero if ETH -> token fails', async () => {
            const sampleAmounts = getSampleAmounts(MAKER_TOKEN);
            const expectedQuotes = _.times(sampleAmounts.length, () => constants.ZERO_AMOUNT);
            await enableFailTriggerAsync();
            const quotes = await testContract
                .sampleBuysFromEth2Dai(ETH2DAI_ADDRESS, WETH_ADDRESS, TAKER_TOKEN, sampleAmounts)
                .callAsync();
            expect(quotes).to.deep.eq(expectedQuotes);
        });
    });

    describe('liquidity provider', () => {
        const xAsset = randomAddress();
        const yAsset = randomAddress();
        const sampleAmounts = getSampleAmounts(yAsset);
        let liquidityProvider: DummyLiquidityProviderContract;

        before(async () => {
            liquidityProvider = await DummyLiquidityProviderContract.deployFrom0xArtifactAsync(
                artifacts.DummyLiquidityProvider,
                env.provider,
                env.txDefaults,
                {},
            );
        });

        it('should be able to query sells from the liquidity provider', async () => {
            const quotes = await testContract
                .sampleSellsFromLiquidityProvider(liquidityProvider.address, yAsset, xAsset, sampleAmounts)
                .callAsync();
            quotes.forEach((value, idx) => {
                expect(value).is.bignumber.eql(sampleAmounts[idx].minus(1));
            });
        });

        it('should be able to query buys from the liquidity provider', async () => {
            const quotes = await testContract
                .sampleBuysFromLiquidityProvider(liquidityProvider.address, yAsset, xAsset, sampleAmounts)
                .callAsync();
            quotes.forEach((value, idx) => {
                expect(value).is.bignumber.eql(sampleAmounts[idx].plus(1));
            });
        });

        it('should just return zeros if the liquidity provider does not exist', async () => {
            const quotes = await testContract
                .sampleBuysFromLiquidityProvider(randomAddress(), yAsset, xAsset, sampleAmounts)
                .callAsync();
            quotes.forEach(value => {
                expect(value).is.bignumber.eql(constants.ZERO_AMOUNT);
            });
        });
    });

    blockchainTests.resets('sampleSellsFromUniswapV2()', () => {
        function predictSellQuotes(path: string[], sellAmounts: BigNumber[]): BigNumber[] {
            return sellAmounts.map(a => getDeterministicUniswapV2SellQuote(path, a));
        }

        it('can return no quotes', async () => {
            const quotes = await testContract
                .sampleSellsFromUniswapV2(UNISWAP_V2_ROUTER, [TAKER_TOKEN, MAKER_TOKEN], [])
                .callAsync();
            expect(quotes).to.deep.eq([]);
        });

        it('can quote token -> token', async () => {
            const sampleAmounts = getSampleAmounts(TAKER_TOKEN);
            const expectedQuotes = predictSellQuotes([TAKER_TOKEN, MAKER_TOKEN], sampleAmounts);
            const quotes = await testContract
                .sampleSellsFromUniswapV2(UNISWAP_V2_ROUTER, [TAKER_TOKEN, MAKER_TOKEN], sampleAmounts)
                .callAsync();
            expect(quotes).to.deep.eq(expectedQuotes);
        });

        it('returns zero if token -> token fails', async () => {
            const sampleAmounts = getSampleAmounts(TAKER_TOKEN);
            const expectedQuotes = _.times(sampleAmounts.length, () => constants.ZERO_AMOUNT);
            await enableFailTriggerAsync();
            const quotes = await testContract
                .sampleSellsFromUniswapV2(UNISWAP_V2_ROUTER, [TAKER_TOKEN, MAKER_TOKEN], sampleAmounts)
                .callAsync();
            expect(quotes).to.deep.eq(expectedQuotes);
        });

        it('can quote token -> token -> token', async () => {
            const intermediateToken = randomAddress();
            const sampleAmounts = getSampleAmounts(TAKER_TOKEN);
            const expectedQuotes = predictSellQuotes([TAKER_TOKEN, intermediateToken, MAKER_TOKEN], sampleAmounts);
            const quotes = await testContract
                .sampleSellsFromUniswapV2(
                    UNISWAP_V2_ROUTER,
                    [TAKER_TOKEN, intermediateToken, MAKER_TOKEN],
                    sampleAmounts,
                )
                .callAsync();
            expect(quotes).to.deep.eq(expectedQuotes);
        });
    });

    blockchainTests.resets('sampleBuysFromUniswapV2()', () => {
        function predictBuyQuotes(path: string[], buyAmounts: BigNumber[]): BigNumber[] {
            return buyAmounts.map(a => getDeterministicUniswapV2BuyQuote(path, a));
        }

        it('can return no quotes', async () => {
            const quotes = await testContract
                .sampleBuysFromUniswapV2(UNISWAP_V2_ROUTER, [TAKER_TOKEN, MAKER_TOKEN], [])
                .callAsync();
            expect(quotes).to.deep.eq([]);
        });

        it('can quote token -> token', async () => {
            const sampleAmounts = getSampleAmounts(MAKER_TOKEN);
            const expectedQuotes = predictBuyQuotes([TAKER_TOKEN, MAKER_TOKEN], sampleAmounts);
            const quotes = await testContract
                .sampleBuysFromUniswapV2(UNISWAP_V2_ROUTER, [TAKER_TOKEN, MAKER_TOKEN], sampleAmounts)
                .callAsync();
            expect(quotes).to.deep.eq(expectedQuotes);
        });

        it('returns zero if token -> token fails', async () => {
            const sampleAmounts = getSampleAmounts(MAKER_TOKEN);
            const expectedQuotes = _.times(sampleAmounts.length, () => constants.ZERO_AMOUNT);
            await enableFailTriggerAsync();
            const quotes = await testContract
                .sampleBuysFromUniswapV2(UNISWAP_V2_ROUTER, [TAKER_TOKEN, MAKER_TOKEN], sampleAmounts)
                .callAsync();
            expect(quotes).to.deep.eq(expectedQuotes);
        });

        it('can quote token -> token -> token', async () => {
            const intermediateToken = randomAddress();
            const sampleAmounts = getSampleAmounts(MAKER_TOKEN);
            const expectedQuotes = predictBuyQuotes([TAKER_TOKEN, intermediateToken, MAKER_TOKEN], sampleAmounts);
            const quotes = await testContract
                .sampleBuysFromUniswapV2(
                    UNISWAP_V2_ROUTER,
                    [TAKER_TOKEN, intermediateToken, MAKER_TOKEN],
                    sampleAmounts,
                )
                .callAsync();
            expect(quotes).to.deep.eq(expectedQuotes);
        });
    });

    describe('batchCall()', () => {
        it('can call one function', async () => {
            const orders = createOrders(MAKER_TOKEN, TAKER_TOKEN);
            const expected = orders.map(getDeterministicFillableTakerAssetAmount);
            const calls = [
                testContract
                    .getLimitOrderFillableTakerAssetAmounts(
                        // tslint:disable-next-line:no-unnecessary-type-assertion
                        orders.map(o => o.order as LimitOrderFields),
                        orders.map(o => o.signature),
                        NULL_ADDRESS,
                    )
                    .getABIEncodedTransactionData(),
            ];
            const r = await testContract.batchCall(calls).callAsync();
            expect(r).to.be.length(1);
            const actual = testContract.getABIDecodedReturnData<BigNumber[]>(
                'getLimitOrderFillableTakerAssetAmounts',
                r[0].data,
            );
            expect(actual).to.deep.eq(expected);
        });

        it('can call two functions', async () => {
            const numOrders = _.random(1, 10);
            const orders = _.times(2, () => createOrders(MAKER_TOKEN, TAKER_TOKEN, numOrders));
            const expecteds = [
                orders[0].map(getDeterministicFillableTakerAssetAmount),
                orders[1].map(getDeterministicFillableMakerAssetAmount),
            ];
            const calls = [
                testContract
                    .getLimitOrderFillableTakerAssetAmounts(
                        // tslint:disable-next-line:no-unnecessary-type-assertion
                        orders[0].map(o => o.order as LimitOrderFields),
                        orders[0].map(o => o.signature),
                        NULL_ADDRESS,
                    )
                    .getABIEncodedTransactionData(),
                testContract
                    .getLimitOrderFillableMakerAssetAmounts(
                        // tslint:disable-next-line:no-unnecessary-type-assertion
                        orders[1].map(o => o.order as LimitOrderFields),
                        orders[1].map(o => o.signature),
                        NULL_ADDRESS,
                    )
                    .getABIEncodedTransactionData(),
            ];
            const r = await testContract.batchCall(calls).callAsync();
            expect(r).to.be.length(2);
            expect(
                testContract.getABIDecodedReturnData('getLimitOrderFillableTakerAssetAmounts', r[0].data),
            ).to.deep.eq(expecteds[0]);
            expect(
                testContract.getABIDecodedReturnData('getLimitOrderFillableMakerAssetAmounts', r[1].data),
            ).to.deep.eq(expecteds[1]);
        });

        it('can make recursive calls', async () => {
            const numOrders = _.random(1, 10);
            const orders = createOrders(MAKER_TOKEN, TAKER_TOKEN, numOrders);
            const expected = orders.map(getDeterministicFillableTakerAssetAmount);
            let r = await testContract
                .batchCall([
                    testContract
                        .batchCall([
                            testContract
                                .getLimitOrderFillableTakerAssetAmounts(
                                    // tslint:disable-next-line:no-unnecessary-type-assertion
                                    orders.map(o => o.order as LimitOrderFields),
                                    orders.map(o => o.signature),
                                    NULL_ADDRESS,
                                )
                                .getABIEncodedTransactionData(),
                        ])
                        .getABIEncodedTransactionData(),
                ])
                .callAsync();
            expect(r).to.be.length(1);
            r = testContract.getABIDecodedReturnData<SamplerCallResult[]>('batchCall', r[0].data);
            expect(r).to.be.length(1);
            expect(
                testContract.getABIDecodedReturnData('getLimitOrderFillableTakerAssetAmounts', r[0].data),
            ).to.deep.eq(expected);
        });
    });

    blockchainTests.resets('TwoHopSampler', () => {
        before(async () => {
            await testContract
                .createTokenExchanges([MAKER_TOKEN, TAKER_TOKEN, INTERMEDIATE_TOKEN])
                .awaitTransactionSuccessAsync();
        });

        it('sampleTwoHopSell', async () => {
            // tslint:disable-next-line no-unnecessary-type-assertion
            const sellAmount = _.last(getSampleAmounts(TAKER_TOKEN))!;
            const uniswapV2FirstHopPath = [TAKER_TOKEN, INTERMEDIATE_TOKEN];
            const uniswapV2FirstHop = testContract
                .sampleSellsFromUniswapV2(UNISWAP_V2_ROUTER, uniswapV2FirstHopPath, [constants.ZERO_AMOUNT])
                .getABIEncodedTransactionData();

            const uniswapV2SecondHopPath = [INTERMEDIATE_TOKEN, randomAddress(), MAKER_TOKEN];
            const uniswapV2SecondHop = testContract
                .sampleSellsFromUniswapV2(UNISWAP_V2_ROUTER, uniswapV2SecondHopPath, [constants.ZERO_AMOUNT])
                .getABIEncodedTransactionData();

            const eth2DaiFirstHop = testContract
                .sampleSellsFromEth2Dai(ETH2DAI_ADDRESS, TAKER_TOKEN, INTERMEDIATE_TOKEN, [constants.ZERO_AMOUNT])
                .getABIEncodedTransactionData();
            const eth2DaiSecondHop = testContract
                .sampleSellsFromEth2Dai(ETH2DAI_ADDRESS, INTERMEDIATE_TOKEN, MAKER_TOKEN, [constants.ZERO_AMOUNT])
                .getABIEncodedTransactionData();

            const firstHopQuotes = [
                getDeterministicSellQuote(ETH2DAI_SALT, TAKER_TOKEN, INTERMEDIATE_TOKEN, sellAmount),
                getDeterministicUniswapV2SellQuote(uniswapV2FirstHopPath, sellAmount),
            ];
            const expectedIntermediateAssetAmount = BigNumber.max(...firstHopQuotes);
            const secondHopQuotes = [
                getDeterministicSellQuote(
                    ETH2DAI_SALT,
                    INTERMEDIATE_TOKEN,
                    MAKER_TOKEN,
                    expectedIntermediateAssetAmount,
                ),
                getDeterministicUniswapV2SellQuote(uniswapV2SecondHopPath, expectedIntermediateAssetAmount),
            ];
            const expectedBuyAmount = BigNumber.max(...secondHopQuotes);

            const [firstHop, secondHop, buyAmount] = await testContract
                .sampleTwoHopSell(
                    [eth2DaiFirstHop, uniswapV2FirstHop],
                    [eth2DaiSecondHop, uniswapV2SecondHop],
                    sellAmount,
                )
                .callAsync();
            expect(firstHop.sourceIndex, 'First hop source index').to.bignumber.equal(
                firstHopQuotes.findIndex(quote => quote.isEqualTo(expectedIntermediateAssetAmount)),
            );
            expect(secondHop.sourceIndex, 'Second hop source index').to.bignumber.equal(
                secondHopQuotes.findIndex(quote => quote.isEqualTo(expectedBuyAmount)),
            );
            expect(buyAmount, 'Two hop buy amount').to.bignumber.equal(expectedBuyAmount);
        });
        it('sampleTwoHopBuy', async () => {
            // tslint:disable-next-line no-unnecessary-type-assertion
            const buyAmount = _.last(getSampleAmounts(MAKER_TOKEN))!;
            const uniswapV2FirstHopPath = [TAKER_TOKEN, INTERMEDIATE_TOKEN];
            const uniswapV2FirstHop = testContract
                .sampleBuysFromUniswapV2(UNISWAP_V2_ROUTER, uniswapV2FirstHopPath, [constants.ZERO_AMOUNT])
                .getABIEncodedTransactionData();

            const uniswapV2SecondHopPath = [INTERMEDIATE_TOKEN, randomAddress(), MAKER_TOKEN];
            const uniswapV2SecondHop = testContract
                .sampleBuysFromUniswapV2(UNISWAP_V2_ROUTER, uniswapV2SecondHopPath, [constants.ZERO_AMOUNT])
                .getABIEncodedTransactionData();

            const eth2DaiFirstHop = testContract
                .sampleBuysFromEth2Dai(ETH2DAI_ADDRESS, TAKER_TOKEN, INTERMEDIATE_TOKEN, [constants.ZERO_AMOUNT])
                .getABIEncodedTransactionData();
            const eth2DaiSecondHop = testContract
                .sampleBuysFromEth2Dai(ETH2DAI_ADDRESS, INTERMEDIATE_TOKEN, MAKER_TOKEN, [constants.ZERO_AMOUNT])
                .getABIEncodedTransactionData();

            const secondHopQuotes = [
                getDeterministicBuyQuote(ETH2DAI_SALT, INTERMEDIATE_TOKEN, MAKER_TOKEN, buyAmount),
                getDeterministicUniswapV2BuyQuote(uniswapV2SecondHopPath, buyAmount),
            ];
            const expectedIntermediateAssetAmount = BigNumber.min(...secondHopQuotes);

            const firstHopQuotes = [
                getDeterministicBuyQuote(
                    ETH2DAI_SALT,
                    TAKER_TOKEN,
                    INTERMEDIATE_TOKEN,
                    expectedIntermediateAssetAmount,
                ),
                getDeterministicUniswapV2BuyQuote(uniswapV2FirstHopPath, expectedIntermediateAssetAmount),
            ];
            const expectedSellAmount = BigNumber.min(...firstHopQuotes);

            const [firstHop, secondHop, sellAmount] = await testContract
                .sampleTwoHopBuy(
                    [eth2DaiFirstHop, uniswapV2FirstHop],
                    [eth2DaiSecondHop, uniswapV2SecondHop],
                    buyAmount,
                )
                .callAsync();
            expect(firstHop.sourceIndex, 'First hop source index').to.bignumber.equal(
                firstHopQuotes.findIndex(quote => quote.isEqualTo(expectedSellAmount)),
            );
            expect(secondHop.sourceIndex, 'Second hop source index').to.bignumber.equal(
                secondHopQuotes.findIndex(quote => quote.isEqualTo(expectedIntermediateAssetAmount)),
            );
            expect(sellAmount, 'Two hop sell amount').to.bignumber.equal(expectedSellAmount);
        });
    });
});
