import { constants, expect, getRandomInteger, randomAddress } from '@0x/contracts-test-utils';
import { FillQuoteTransformerOrderType, SignatureType } from '@0x/protocol-utils';
import { BigNumber, hexUtils, NULL_BYTES } from '@0x/utils';
import * as _ from 'lodash';

import { MarketOperation } from '../../src/asset-swapper/types';
import {
    ERC20BridgeSource,
    Fill,
    NativeLimitOrderFillData,
    OptimizedMarketOrder,
    OptimizedMarketOrderBase,
} from '../../src/asset-swapper/utils/market_operation_utils/types';
import {
    fillQuoteOrders,
    QuoteFillOrderCall,
    simulateBestCaseFill,
    simulateWorstCaseFill,
} from '../../src/asset-swapper/utils/quote_simulation';

describe('quote_simulation tests', async () => {
    const { NULL_ADDRESS } = constants;
    const ZERO = new BigNumber(0);
    const ONE = new BigNumber(1);
    const MAKER_TOKEN = randomAddress();
    const TAKER_TOKEN = randomAddress();
    const GAS_SCHEDULE = { [ERC20BridgeSource.Uniswap]: _.constant(1), [ERC20BridgeSource.Native]: _.constant(1) };

    // Check if two numbers are within `maxError` error rate within each other.
    function assertRoughlyEquals(n1: BigNumber, n2: BigNumber, maxError: BigNumber | number = 1e-10): void {
        // |n2-n1| / max(|n1|, |n2|)
        const err = n2.minus(n1).abs().div(BigNumber.max(n1.abs(), n2.abs()));
        expect(err).to.bignumber.lt(maxError);
    }

    function createQuoteFillOrders(
        opts: Partial<{
            fillableInput: BigNumber;
            fillableOutput: BigNumber;
            inputFeeRate: number;
            outputFeeRate: number;
            count: number;
            side: MarketOperation;
            type?: FillQuoteTransformerOrderType;
        }> = {},
    ): QuoteFillOrderCall[] {
        const { fillableInput, fillableOutput, inputFeeRate, outputFeeRate, count, side, type } = {
            fillableInput: getRandomOrderSize(),
            fillableOutput: getRandomOrderSize(),
            inputFeeRate: 0,
            outputFeeRate: 0,
            count: 3,
            side: MarketOperation.Sell,
            ...opts,
        };
        const _inputFeeRate = side === MarketOperation.Sell ? inputFeeRate : -inputFeeRate;
        const _outputFeeRate = side === MarketOperation.Sell ? -outputFeeRate : outputFeeRate;

        const fillableInputs = subdivideAmount(fillableInput, count);
        const fillableOutputs = subdivideAmount(fillableOutput, count);
        const filledInputs = subdivideAmount(fillableInput.times(0.5), count);
        const filledOutputs: BigNumber[] = [];
        const totalInputs: BigNumber[] = [];
        const totalOutputs: BigNumber[] = [];
        const inputFees: BigNumber[] = [];
        const outputFees: BigNumber[] = [];
        _.times(count).forEach((i) => {
            const f = filledInputs[i].div(fillableInputs[i]);
            filledOutputs.push(fillableOutputs[i].times(f).integerValue(BigNumber.ROUND_DOWN));
            totalInputs.push(fillableInputs[i].plus(filledInputs[i]));
            totalOutputs.push(fillableOutputs[i].plus(filledOutputs[i]));
            inputFees.push(totalInputs[i].times(_inputFeeRate).integerValue());
            outputFees.push(totalOutputs[i].times(_outputFeeRate).integerValue());
        });
        return _.times(count, (i) => {
            return {
                order: createQuoteFillOrderOrder(totalInputs[i], totalOutputs[i], {
                    side,
                    filledInput: filledInputs[i],
                    takerInputFee: inputFees[i].abs(),
                    takerOutputFee: outputFees[i].abs(),
                    type,
                }),
                totalOrderInput: totalInputs[i],
                totalOrderOutput: totalOutputs[i],
                totalOrderInputFee: inputFees[i],
                totalOrderOutputFee: outputFees[i],
            };
        });
    }

    function createQuoteFillOrderOrder(
        input: BigNumber,
        output: BigNumber,
        opts: Partial<{
            filledInput: BigNumber;
            side: MarketOperation;
            takerInputFee: BigNumber;
            takerOutputFee: BigNumber;
            type: FillQuoteTransformerOrderType;
        }> = {},
    ): OptimizedMarketOrderBase<NativeLimitOrderFillData> {
        const { filledInput, side, takerInputFee, takerOutputFee, type } = _.merge(
            {},
            {
                side: MarketOperation.Sell,
                filledInput: ZERO,
                takerInputFee: ZERO,
                takerOutputFee: ZERO,
                type: FillQuoteTransformerOrderType.Limit,
            },
            opts,
        );
        const filledOutput = filledInput.div(input).times(output).integerValue(BigNumber.ROUND_DOWN);
        const fillableInput = input.minus(filledInput);
        const fillableOutput = output.minus(filledOutput);
        const makerAmount = side === MarketOperation.Sell ? output : input;
        const takerAmount = side === MarketOperation.Sell ? input : output;
        const fillableMakerAmount = side === MarketOperation.Sell ? fillableOutput : fillableInput;
        const fillableTakerAmount = side === MarketOperation.Sell ? fillableInput : fillableOutput;
        const takerFee = BigNumber.max(takerInputFee, takerOutputFee);

        const order: OptimizedMarketOrderBase<NativeLimitOrderFillData> = {
            source: ERC20BridgeSource.Native,
            makerToken: MAKER_TOKEN,
            takerToken: TAKER_TOKEN,
            makerAmount: fillableMakerAmount,
            takerAmount: fillableTakerAmount,
            fillData: {
                order: {
                    makerToken: MAKER_TOKEN,
                    makerAmount,
                    takerToken: TAKER_TOKEN,
                    takerAmount,
                    maker: NULL_ADDRESS,
                    taker: NULL_ADDRESS,
                    sender: NULL_ADDRESS,
                    salt: ZERO,
                    chainId: 1,
                    pool: NULL_BYTES,
                    verifyingContract: NULL_ADDRESS,
                    expiry: ZERO,
                    feeRecipient: NULL_ADDRESS,
                    takerTokenFeeAmount: takerFee,
                },
                signature: { v: 1, r: NULL_BYTES, s: NULL_BYTES, signatureType: SignatureType.EthSign },
                maxTakerTokenFillAmount: fillableTakerAmount,
            },
            type,
            fill: createOrderFill(fillableInput, fillableOutput),
        };
        return order;
    }
    const nativeSourcePathId = hexUtils.random();
    function createOrderFill(input: BigNumber, output: BigNumber): Fill {
        return {
            type: FillQuoteTransformerOrderType.Bridge,
            sourcePathId: nativeSourcePathId,
            source: ERC20BridgeSource.Uniswap,
            fillData: {},
            input,
            output,
            flags: BigInt(0),
            adjustedOutput: output,
            gas: 1,
        };
    }

    function randomSide(): MarketOperation {
        return _.sampleSize(Object.values(MarketOperation), 1)[0];
    }

    function getRandomOrderSize(): BigNumber {
        return getRandomInteger('100e18', '1000e18');
    }

    function getRandomFeeRate(): number {
        return _.random(0.01, 0.25, true);
    }

    function assertEqualRates(actual: number | BigNumber, expected: number | BigNumber): void {
        expect(new BigNumber(actual).times(1e4).integerValue()).to.bignumber.eq(
            new BigNumber(expected).times(1e4).integerValue(),
        );
    }

    function subdivideAmount(amount: BigNumber, count: number): BigNumber[] {
        const amounts = [];
        for (let i = 0; i < count; ++i) {
            const remaining = amount.minus(BigNumber.sum(0, ...amounts));
            if (i !== count - 1) {
                amounts.push(remaining.times(Math.random()).integerValue());
            } else {
                amounts.push(remaining.integerValue());
            }
        }
        return amounts;
    }

    describe('fillQuoteOrders()', () => {
        describe('single order', () => {
            it('can exactly fill one order', () => {
                const side = randomSide();
                const fillableInput = getRandomOrderSize();
                const fillableOutput = getRandomOrderSize();
                const fillOrders = createQuoteFillOrders({
                    fillableInput,
                    fillableOutput,
                    side,
                    count: 1,
                });
                const result = fillQuoteOrders(fillOrders, fillableInput, ONE, GAS_SCHEDULE);
                const totalFilledInput = result.input.plus(result.inputFee);
                const totalFilledOutput = result.output.plus(result.outputFee);
                expect(totalFilledInput).to.bignumber.eq(fillableInput);
                assertRoughlyEquals(totalFilledOutput, fillableOutput);
                expect(result.protocolFee).to.bignumber.eq(1);
            });

            it('can partially fill one simple order', () => {
                const side = randomSide();
                const fillableInput = getRandomOrderSize();
                const fillableOutput = getRandomOrderSize();
                const fillOrders = createQuoteFillOrders({
                    fillableInput,
                    fillableOutput,
                    side,
                    count: 1,
                });
                const inputFillAmount = fillableInput.times(2 / 3).integerValue();
                const result = fillQuoteOrders(fillOrders, inputFillAmount, ONE, GAS_SCHEDULE);
                const totalFilledInput = result.input.plus(result.inputFee);
                const totalFilledOutput = result.output.plus(result.outputFee);
                expect(totalFilledInput).to.bignumber.eq(inputFillAmount);
                const expectedOutputFilledAmount = inputFillAmount
                    .div(fillableInput)
                    .times(fillableOutput)
                    .integerValue();
                assertRoughlyEquals(totalFilledOutput, expectedOutputFilledAmount);
                expect(result.protocolFee).to.bignumber.eq(1);
            });

            it('can partially fill one batched order', () => {
                const side = randomSide();
                const fillableInput = getRandomOrderSize();
                const fillableOutput = getRandomOrderSize();
                const fillOrders = createQuoteFillOrders({
                    fillableInput,
                    fillableOutput,
                    side,
                    count: 1,
                });
                const inputFillAmount = fillableInput.times(2 / 3).integerValue();
                const result = fillQuoteOrders(fillOrders, inputFillAmount, ONE, GAS_SCHEDULE);
                const totalFilledInput = result.input.plus(result.inputFee);
                const totalFilledOutput = result.output.plus(result.outputFee);
                expect(totalFilledInput).to.bignumber.eq(inputFillAmount);
                expect(totalFilledOutput).to.bignumber.lt(fillableOutput);
                expect(result.protocolFee).to.bignumber.eq(1);
            });

            it('does not over fill one order', () => {
                const side = randomSide();
                const fillableInput = getRandomOrderSize();
                const fillableOutput = getRandomOrderSize();
                const fillOrders = createQuoteFillOrders({
                    fillableInput,
                    fillableOutput,
                    side,
                    count: 1,
                });
                const inputFillAmount = fillableInput.times(3 / 2).integerValue();
                const result = fillQuoteOrders(fillOrders, inputFillAmount, ONE, GAS_SCHEDULE);
                const totalFilledInput = result.input.plus(result.inputFee);
                const totalFilledOutput = result.output.plus(result.outputFee);
                expect(totalFilledInput).to.bignumber.eq(fillableInput);
                assertRoughlyEquals(totalFilledOutput, fillableOutput);
                expect(result.protocolFee).to.bignumber.eq(1);
            });

            it('can exactly fill one order with input fees', () => {
                const side = randomSide();
                const fillableInput = getRandomOrderSize();
                const fillableOutput = getRandomOrderSize();
                const inputFeeRate = getRandomFeeRate();
                const fillOrders = createQuoteFillOrders({
                    fillableInput,
                    fillableOutput,
                    inputFeeRate,
                    side,
                    count: 1,
                });
                const signedInputFeeRate = side === MarketOperation.Sell ? inputFeeRate : -inputFeeRate;
                const totalFillableInput = fillableInput.times(signedInputFeeRate + 1).integerValue();
                const result = fillQuoteOrders(fillOrders, totalFillableInput, ONE, GAS_SCHEDULE);
                const totalFilledInput = result.input.plus(result.inputFee);
                const totalFilledOutput = result.output.plus(result.outputFee);
                assertRoughlyEquals(totalFilledInput, totalFillableInput);
                assertRoughlyEquals(totalFilledOutput, fillableOutput);
                assertEqualRates(result.inputFee.div(result.input), signedInputFeeRate);
                expect(result.protocolFee).to.bignumber.eq(1);
            });

            it('can partially fill one order with input fees', () => {
                const side = randomSide();
                const fillableInput = getRandomOrderSize();
                const fillableOutput = getRandomOrderSize();
                const inputFeeRate = getRandomFeeRate();
                const fillOrders = createQuoteFillOrders({
                    fillableInput,
                    fillableOutput,
                    inputFeeRate,
                    side,
                    count: 1,
                });
                const signedInputFeeRate = side === MarketOperation.Sell ? inputFeeRate : -inputFeeRate;
                const totalFillableInput = fillableInput.times(signedInputFeeRate + 1).integerValue();
                const inputFillAmount = totalFillableInput.times(2 / 3).integerValue();
                const result = fillQuoteOrders(fillOrders, inputFillAmount, ONE, GAS_SCHEDULE);
                const totalFilledInput = result.input.plus(result.inputFee);
                const totalFilledOutput = result.output.plus(result.outputFee);
                assertRoughlyEquals(totalFilledInput, inputFillAmount);
                expect(totalFilledOutput).to.bignumber.lt(fillableOutput);
                assertEqualRates(result.inputFee.div(result.input), signedInputFeeRate);
                expect(result.protocolFee).to.bignumber.eq(1);
            });

            it('does not over fill one order with input fees', () => {
                const side = randomSide();
                const fillableInput = getRandomOrderSize();
                const fillableOutput = getRandomOrderSize();
                const inputFeeRate = getRandomFeeRate();
                const fillOrders = createQuoteFillOrders({
                    fillableInput,
                    fillableOutput,
                    inputFeeRate,
                    side,
                    count: 1,
                });
                const signedInputFeeRate = side === MarketOperation.Sell ? inputFeeRate : -inputFeeRate;
                const totalFillableInput = fillableInput.times(signedInputFeeRate + 1).integerValue();
                const inputFillAmount = totalFillableInput.times(3 / 2).integerValue();
                const result = fillQuoteOrders(fillOrders, inputFillAmount, ONE, GAS_SCHEDULE);
                const totalFilledInput = result.input.plus(result.inputFee);
                const totalFilledOutput = result.output.plus(result.outputFee);
                assertRoughlyEquals(totalFilledInput, totalFillableInput);
                assertRoughlyEquals(totalFilledOutput, fillableOutput);
                assertEqualRates(result.inputFee.div(result.input), signedInputFeeRate);
                expect(result.protocolFee).to.bignumber.eq(1);
            });

            it('can exactly fill one order with output fees', () => {
                const side = randomSide();
                const fillableInput = getRandomOrderSize();
                const fillableOutput = getRandomOrderSize();
                const outputFeeRate = getRandomFeeRate();
                const fillOrders = createQuoteFillOrders({
                    fillableInput,
                    fillableOutput,
                    outputFeeRate,
                    side,
                    count: 1,
                });
                const signedOutputFeeRate = side === MarketOperation.Sell ? -outputFeeRate : outputFeeRate;
                const totalFillableOutput = fillableOutput.times(signedOutputFeeRate + 1).integerValue();
                const result = fillQuoteOrders(fillOrders, fillableInput, ONE, GAS_SCHEDULE);
                const totalFilledInput = result.input.plus(result.inputFee);
                const totalFilledOutput = result.output.plus(result.outputFee);
                assertRoughlyEquals(totalFilledInput, fillableInput);
                assertRoughlyEquals(totalFilledOutput, totalFillableOutput);
                assertEqualRates(result.outputFee.div(result.output), signedOutputFeeRate);
                expect(result.protocolFee).to.bignumber.eq(1);
            });

            it('can partial fill one order with output fees', () => {
                const side = randomSide();
                const fillableInput = getRandomOrderSize();
                const fillableOutput = getRandomOrderSize();
                const outputFeeRate = getRandomFeeRate();
                const fillOrders = createQuoteFillOrders({
                    fillableInput,
                    fillableOutput,
                    outputFeeRate,
                    side,
                    count: 1,
                });
                const signedOutputFeeRate = side === MarketOperation.Sell ? -outputFeeRate : outputFeeRate;
                const totalFillableOutput = fillableOutput.times(signedOutputFeeRate + 1).integerValue();
                const inputFillAmount = fillableInput.times(2 / 3).integerValue();
                const result = fillQuoteOrders(fillOrders, inputFillAmount, ONE, GAS_SCHEDULE);
                const totalFilledInput = result.input.plus(result.inputFee);
                const totalFilledOutput = result.output.plus(result.outputFee);
                assertRoughlyEquals(totalFilledInput, inputFillAmount);
                expect(totalFilledOutput).to.bignumber.lt(totalFillableOutput);
                assertEqualRates(result.outputFee.div(result.output), signedOutputFeeRate);
                expect(result.protocolFee).to.bignumber.eq(1);
            });

            it('does not over fill one order with output fees', () => {
                const side = randomSide();
                const fillableInput = getRandomOrderSize();
                const fillableOutput = getRandomOrderSize();
                const outputFeeRate = getRandomFeeRate();
                const fillOrders = createQuoteFillOrders({
                    fillableInput,
                    fillableOutput,
                    outputFeeRate,
                    side,
                    count: 1,
                });
                const signedOutputFeeRate = side === MarketOperation.Sell ? -outputFeeRate : outputFeeRate;
                const totalFillableOutput = fillableOutput.times(signedOutputFeeRate + 1).integerValue();
                const inputFillAmount = fillableInput.times(3 / 2).integerValue();
                const result = fillQuoteOrders(fillOrders, inputFillAmount, ONE, GAS_SCHEDULE);
                const totalFilledInput = result.input.plus(result.inputFee);
                const totalFilledOutput = result.output.plus(result.outputFee);
                assertRoughlyEquals(totalFilledInput, fillableInput);
                assertRoughlyEquals(totalFilledOutput, totalFillableOutput);
                assertEqualRates(result.outputFee.div(result.output), signedOutputFeeRate);
                expect(result.protocolFee).to.bignumber.eq(1);
            });

            it('does not charge a protocol fee for rfq orders', () => {
                const side = randomSide();
                const fillableInput = getRandomOrderSize();
                const fillableOutput = getRandomOrderSize();
                const fillOrders = createQuoteFillOrders({
                    fillableInput,
                    fillableOutput,
                    side,
                    count: 1,
                    type: FillQuoteTransformerOrderType.Rfq,
                });
                const result = fillQuoteOrders(fillOrders, fillableInput, ONE, GAS_SCHEDULE);
                const totalFilledInput = result.input.plus(result.inputFee);
                const totalFilledOutput = result.output.plus(result.outputFee);
                expect(totalFilledInput).to.bignumber.eq(fillableInput);
                assertRoughlyEquals(totalFilledOutput, fillableOutput);
                expect(result.protocolFee).to.bignumber.eq(0);
            });
        });

        describe('multiple orders', () => {
            it('can exactly fill orders', () => {
                const side = randomSide();
                const fillableInput = getRandomOrderSize();
                const fillableOutput = getRandomOrderSize();
                const fillOrders = createQuoteFillOrders({ fillableInput, fillableOutput, side });
                const result = fillQuoteOrders(fillOrders, fillableInput, ONE, GAS_SCHEDULE);
                const totalFilledInput = result.input.plus(result.inputFee);
                const totalFilledOutput = result.output.plus(result.outputFee);
                expect(totalFilledInput).to.bignumber.eq(fillableInput);
                expect(totalFilledOutput).to.bignumber.eq(fillableOutput);
                expect(result.protocolFee).to.bignumber.eq(fillOrders.length);
            });

            it('can partial fill orders', () => {
                const side = randomSide();
                const fillableInput = getRandomOrderSize();
                const fillableOutput = getRandomOrderSize();
                const inputFillAmount = fillableInput.times(2 / 3).integerValue();
                const fillOrders = createQuoteFillOrders({ fillableInput, fillableOutput, side });
                const result = fillQuoteOrders(fillOrders, inputFillAmount, ONE, GAS_SCHEDULE);
                const totalFilledInput = result.input.plus(result.inputFee);
                const totalFilledOutput = result.output.plus(result.outputFee);
                expect(totalFilledInput).to.bignumber.eq(inputFillAmount);
                expect(totalFilledOutput).to.bignumber.lt(fillableOutput);
                expect(result.protocolFee).to.bignumber.gte(1);
            });

            it('does not over fill orders', () => {
                const side = randomSide();
                const fillableInput = getRandomOrderSize();
                const fillableOutput = getRandomOrderSize();
                const inputFillAmount = fillableInput.times(3 / 2).integerValue();
                const fillOrders = createQuoteFillOrders({ fillableInput, fillableOutput, side });
                const result = fillQuoteOrders(fillOrders, inputFillAmount, ONE, GAS_SCHEDULE);
                const totalFilledInput = result.input.plus(result.inputFee);
                const totalFilledOutput = result.output.plus(result.outputFee);
                expect(totalFilledInput).to.bignumber.eq(fillableInput);
                expect(totalFilledOutput).to.bignumber.eq(fillableOutput);
                expect(result.protocolFee).to.bignumber.eq(fillOrders.length);
            });

            it('can exactly fill orders with input fees', () => {
                const side = randomSide();
                const fillableInput = getRandomOrderSize();
                const fillableOutput = getRandomOrderSize();
                const inputFeeRate = getRandomFeeRate();
                const fillOrders = createQuoteFillOrders({
                    fillableInput,
                    fillableOutput,
                    inputFeeRate,
                    side,
                });
                const signedInputFeeRate = side === MarketOperation.Sell ? inputFeeRate : -inputFeeRate;
                const totalFillableInput = fillableInput.times(signedInputFeeRate + 1).integerValue();
                const result = fillQuoteOrders(fillOrders, totalFillableInput, ONE, GAS_SCHEDULE);
                const totalFilledInput = result.input.plus(result.inputFee);
                const totalFilledOutput = result.output.plus(result.outputFee);
                assertRoughlyEquals(totalFilledInput, totalFillableInput);
                assertRoughlyEquals(totalFilledOutput, fillableOutput);
                assertEqualRates(result.inputFee.div(result.input), signedInputFeeRate);
                expect(result.protocolFee).to.bignumber.eq(fillOrders.length);
            });

            it('can partial fill orders with input fees', () => {
                const side = randomSide();
                const fillableInput = getRandomOrderSize();
                const fillableOutput = getRandomOrderSize();
                const inputFeeRate = getRandomFeeRate();
                const fillOrders = createQuoteFillOrders({
                    fillableInput,
                    fillableOutput,
                    inputFeeRate,
                    side,
                });
                const signedInputFeeRate = side === MarketOperation.Sell ? inputFeeRate : -inputFeeRate;
                const totalFillableInput = fillableInput.times(signedInputFeeRate + 1).integerValue();
                const inputFillAmount = totalFillableInput.times(2 / 3).integerValue();
                const result = fillQuoteOrders(fillOrders, inputFillAmount, ONE, GAS_SCHEDULE);
                const totalFilledInput = result.input.plus(result.inputFee);
                const totalFilledOutput = result.output.plus(result.outputFee);
                assertRoughlyEquals(totalFilledInput, inputFillAmount);
                expect(totalFilledOutput).to.bignumber.lt(fillableOutput);
                assertEqualRates(result.inputFee.div(result.input), signedInputFeeRate);
                expect(result.protocolFee).to.bignumber.lte(fillOrders.length);
            });

            it('does not over fill orders with input fees', () => {
                const side = randomSide();
                const fillableInput = getRandomOrderSize();
                const fillableOutput = getRandomOrderSize();
                const inputFeeRate = getRandomFeeRate();
                const fillOrders = createQuoteFillOrders({
                    fillableInput,
                    fillableOutput,
                    inputFeeRate,
                    side,
                });
                const signedInputFeeRate = side === MarketOperation.Sell ? inputFeeRate : -inputFeeRate;
                const totalFillableInput = fillableInput.times(signedInputFeeRate + 1).integerValue();
                const inputFillAmount = totalFillableInput.times(3 / 2).integerValue();
                const result = fillQuoteOrders(fillOrders, inputFillAmount, ONE, GAS_SCHEDULE);
                const totalFilledInput = result.input.plus(result.inputFee);
                const totalFilledOutput = result.output.plus(result.outputFee);
                assertRoughlyEquals(totalFilledInput, totalFillableInput);
                assertRoughlyEquals(totalFilledOutput, fillableOutput);
                assertEqualRates(result.inputFee.div(result.input), signedInputFeeRate);
                expect(result.protocolFee).to.bignumber.eq(fillOrders.length);
            });

            it('can exactly fill orders with output fees', () => {
                const side = randomSide();
                const fillableInput = getRandomOrderSize();
                const fillableOutput = getRandomOrderSize();
                const outputFeeRate = getRandomFeeRate();
                const fillOrders = createQuoteFillOrders({
                    fillableInput,
                    fillableOutput,
                    outputFeeRate,
                    side,
                });
                const signedOutputFeeRate = side === MarketOperation.Sell ? -outputFeeRate : outputFeeRate;
                const totalFillableOutput = fillableOutput.times(signedOutputFeeRate + 1).integerValue();
                const result = fillQuoteOrders(fillOrders, fillableInput, ONE, GAS_SCHEDULE);
                const totalFilledInput = result.input.plus(result.inputFee);
                const totalFilledOutput = result.output.plus(result.outputFee);
                assertRoughlyEquals(totalFilledInput, fillableInput);
                assertRoughlyEquals(totalFilledOutput, totalFillableOutput);
                assertEqualRates(result.outputFee.div(result.output), signedOutputFeeRate);
                expect(result.protocolFee).to.bignumber.eq(fillOrders.length);
            });

            it('can partial fill orders with output fees', () => {
                const side = randomSide();
                const fillableInput = getRandomOrderSize();
                const fillableOutput = getRandomOrderSize();
                const outputFeeRate = getRandomFeeRate();
                const fillOrders = createQuoteFillOrders({
                    fillableInput,
                    fillableOutput,
                    outputFeeRate,
                    side,
                });
                const signedOutputFeeRate = side === MarketOperation.Sell ? -outputFeeRate : outputFeeRate;
                const totalFillableOutput = fillableOutput.times(signedOutputFeeRate + 1).integerValue();
                const inputFillAmount = fillableInput.times(2 / 3).integerValue();
                const result = fillQuoteOrders(fillOrders, inputFillAmount, ONE, GAS_SCHEDULE);
                const totalFilledInput = result.input.plus(result.inputFee);
                const totalFilledOutput = result.output.plus(result.outputFee);
                assertRoughlyEquals(totalFilledInput, inputFillAmount);
                expect(totalFilledOutput).to.bignumber.lt(totalFillableOutput);
                assertEqualRates(result.outputFee.div(result.output), signedOutputFeeRate);
                expect(result.protocolFee).to.bignumber.lte(fillOrders.length);
            });

            it('does not over fill orders with output fees', () => {
                const side = randomSide();
                const fillableInput = getRandomOrderSize();
                const fillableOutput = getRandomOrderSize();
                const outputFeeRate = getRandomFeeRate();
                const fillOrders = createQuoteFillOrders({
                    fillableInput,
                    fillableOutput,
                    outputFeeRate,
                    side,
                });
                const signedOutputFeeRate = side === MarketOperation.Sell ? -outputFeeRate : outputFeeRate;
                const totalFillableOutput = fillableOutput.times(signedOutputFeeRate + 1).integerValue();
                const inputFillAmount = fillableInput.times(3 / 2).integerValue();
                const result = fillQuoteOrders(fillOrders, inputFillAmount, ONE, GAS_SCHEDULE);
                const totalFilledInput = result.input.plus(result.inputFee);
                const totalFilledOutput = result.output.plus(result.outputFee);
                assertRoughlyEquals(totalFilledInput, fillableInput);
                assertRoughlyEquals(totalFilledOutput, totalFillableOutput);
                assertEqualRates(result.outputFee.div(result.output), signedOutputFeeRate);
                expect(result.protocolFee).to.bignumber.eq(fillOrders.length);
            });
        });
    });

    function slipOrder(
        order: OptimizedMarketOrderBase<NativeLimitOrderFillData>,
        orderSlippage: number,
        side: MarketOperation,
    ): OptimizedMarketOrder {
        const makerScaling = side === MarketOperation.Sell ? 1 - orderSlippage : 1;
        const takerScaling = side === MarketOperation.Sell ? 1 : orderSlippage + 1;

        const nativeFillData = order.fillData!;
        const slippedFillData = {
            order: {
                ...nativeFillData.order,
                takerAmount: nativeFillData.order.takerAmount.times(takerScaling),
                makerAmount: nativeFillData.order.makerAmount.times(makerScaling),
            },
            signature: nativeFillData.signature,
            maxTakerTokenFillAmount: nativeFillData.maxTakerTokenFillAmount.times(takerScaling),
        };
        return {
            ...order,
            makerAmount: order.makerAmount.times(makerScaling),
            takerAmount: order.takerAmount.times(takerScaling),
            fillData: slippedFillData,
        };
    }

    describe('simulateBestCaseFill()', () => {
        it('ignores order slippage', async () => {
            const side = randomSide();
            const fillableInput = getRandomOrderSize();
            const fillableOutput = getRandomOrderSize();
            const orderSlippage = getRandomFeeRate();
            const fillOrders = createQuoteFillOrders({
                fillableInput,
                fillableOutput,
                side,
            });
            const orders = fillOrders.map((fo) =>
                slipOrder(fo.order as OptimizedMarketOrderBase<NativeLimitOrderFillData>, orderSlippage, side),
            );
            const result = simulateBestCaseFill({
                orders,
                side,
                fillAmount: fillableInput,
                gasPrice: ONE,
                opts: { gasSchedule: GAS_SCHEDULE, protocolFeeMultiplier: ONE },
            });
            if (side === MarketOperation.Sell) {
                expect(result.totalMakerAssetAmount).to.be.bignumber.eq(fillableOutput);
                expect(result.totalTakerAssetAmount).to.be.bignumber.eq(fillableInput);
            } else {
                expect(result.totalMakerAssetAmount).to.be.bignumber.eq(fillableInput);
                expect(result.totalTakerAssetAmount).to.be.bignumber.eq(fillableOutput);
            }
        });

        it('can fully fill orders', async () => {
            const side = randomSide();
            const fillableInput = getRandomOrderSize();
            const fillableOutput = getRandomOrderSize();
            const orders = createQuoteFillOrders({
                fillableInput,
                fillableOutput,
                side,
            }).map((fo) => fo.order);
            const result = simulateBestCaseFill({
                orders,
                side,
                fillAmount: fillableInput,
                gasPrice: ONE,
                opts: { gasSchedule: GAS_SCHEDULE, protocolFeeMultiplier: ONE },
            });
            expect(result.protocolFeeAmount).to.bignumber.eq(orders.length);
            expect(result.takerFeeTakerAssetAmount).to.bignumber.eq(0);
            expect(result.takerFeeMakerAssetAmount).to.bignumber.eq(0);
            expect(result.makerAssetAmount).to.bignumber.eq(result.totalMakerAssetAmount);
            expect(result.takerAssetAmount).to.bignumber.eq(result.totalTakerAssetAmount);
            if (side === MarketOperation.Sell) {
                expect(result.totalMakerAssetAmount).to.be.bignumber.eq(fillableOutput);
                expect(result.totalTakerAssetAmount).to.be.bignumber.eq(fillableInput);
            } else {
                expect(result.totalMakerAssetAmount).to.be.bignumber.eq(fillableInput);
                expect(result.totalTakerAssetAmount).to.be.bignumber.eq(fillableOutput);
            }
        });

        it('can partial fill orders', async () => {
            const side = randomSide();
            const fillableInput = getRandomOrderSize();
            const fillableOutput = getRandomOrderSize();
            const orders = createQuoteFillOrders({
                fillableInput,
                fillableOutput,
                side,
            }).map((fo) => fo.order);
            const inputFillAmount = fillableInput.times(Math.random()).integerValue();
            const result = simulateBestCaseFill({
                orders,
                side,
                fillAmount: inputFillAmount,
                gasPrice: ONE,
                opts: { gasSchedule: GAS_SCHEDULE, protocolFeeMultiplier: ONE },
            });
            expect(result.gas).to.gt(0);
            expect(result.protocolFeeAmount).to.bignumber.gt(0);
            expect(result.takerFeeTakerAssetAmount).to.bignumber.eq(0);
            expect(result.takerFeeMakerAssetAmount).to.bignumber.eq(0);
            expect(result.makerAssetAmount).to.bignumber.eq(result.totalMakerAssetAmount);
            expect(result.takerAssetAmount).to.bignumber.eq(result.totalTakerAssetAmount);
            if (side === MarketOperation.Sell) {
                expect(result.totalMakerAssetAmount).to.be.bignumber.lt(fillableOutput);
                expect(result.totalTakerAssetAmount).to.be.bignumber.eq(inputFillAmount);
            } else {
                expect(result.totalMakerAssetAmount).to.be.bignumber.eq(inputFillAmount);
                expect(result.totalTakerAssetAmount).to.be.bignumber.lt(fillableOutput);
            }
        });

        it('can fully fill sell orders with "input" fees', async () => {
            const side = MarketOperation.Sell;
            const fillableInput = getRandomOrderSize();
            const fillableOutput = getRandomOrderSize();
            const inputFeeRate = getRandomFeeRate();
            const orders = createQuoteFillOrders({
                fillableInput,
                fillableOutput,
                inputFeeRate,
            }).map((fo) => fo.order);
            const signedInputFeeRate = inputFeeRate;
            const totalFillableInput = fillableInput.times(signedInputFeeRate + 1).integerValue();
            const result = simulateBestCaseFill({
                orders,
                side,
                fillAmount: totalFillableInput,
                gasPrice: ONE,
                opts: { gasSchedule: GAS_SCHEDULE, protocolFeeMultiplier: ONE },
            });

            assertRoughlyEquals(result.takerAssetAmount, fillableInput);
            assertRoughlyEquals(result.totalTakerAssetAmount, totalFillableInput);
            assertRoughlyEquals(result.makerAssetAmount, fillableOutput);
            assertRoughlyEquals(result.totalMakerAssetAmount, fillableOutput);
            expect(result.makerAssetAmount).to.bignumber.eq(result.totalMakerAssetAmount);
            expect(result.takerFeeMakerAssetAmount).to.bignumber.eq(0);
        });

        it('can partially fill sell orders with "input" fees', async () => {
            const side = MarketOperation.Sell;
            const fillableInput = getRandomOrderSize();
            const fillableOutput = getRandomOrderSize();
            const inputFeeRate = getRandomFeeRate();
            const orders = createQuoteFillOrders({
                fillableInput,
                fillableOutput,
                inputFeeRate,
                side,
            }).map((fo) => fo.order);
            const signedInputFeeRate = inputFeeRate;
            const totalFillableInput = fillableInput.times(signedInputFeeRate + 1).integerValue();
            const inputFillAmount = totalFillableInput.times(2 / 3).integerValue();
            const result = simulateBestCaseFill({
                orders,
                side,
                fillAmount: inputFillAmount,
                gasPrice: ONE,
                opts: { gasSchedule: GAS_SCHEDULE, protocolFeeMultiplier: ONE },
            });
            expect(result.gas).to.gt(0);
            expect(result.protocolFeeAmount).to.bignumber.gt(0);
            assertRoughlyEquals(result.totalTakerAssetAmount, inputFillAmount);
            expect(result.makerAssetAmount).to.bignumber.lt(fillableOutput);
            expect(result.makerAssetAmount).to.bignumber.eq(result.totalMakerAssetAmount);
            expect(result.takerFeeMakerAssetAmount).to.bignumber.eq(0);
        });

        it('can fully fill buy orders with "output" fees', async () => {
            const side = MarketOperation.Buy;
            const fillableInput = getRandomOrderSize();
            const fillableOutput = getRandomOrderSize();
            const outputFeeRate = getRandomFeeRate();
            const orders = createQuoteFillOrders({
                fillableInput,
                fillableOutput,
                outputFeeRate,
                side,
            }).map((fo) => fo.order);
            const signedOutputFeeRate = outputFeeRate;
            const totalFillableOutput = fillableOutput.times(signedOutputFeeRate + 1).integerValue();
            const result = simulateBestCaseFill({
                orders,
                side,
                fillAmount: fillableInput,
                gasPrice: ONE,
                opts: { gasSchedule: GAS_SCHEDULE, protocolFeeMultiplier: ONE },
            });
            expect(result.protocolFeeAmount).to.bignumber.eq(orders.length);

            assertRoughlyEquals(result.makerAssetAmount, fillableInput);
            assertRoughlyEquals(result.totalMakerAssetAmount, fillableInput);
            assertRoughlyEquals(result.takerAssetAmount, fillableOutput);
            assertRoughlyEquals(result.totalTakerAssetAmount, totalFillableOutput);
            expect(result.makerAssetAmount).to.bignumber.eq(result.totalMakerAssetAmount);
            expect(result.takerFeeMakerAssetAmount).to.bignumber.eq(0);
        });

        it('can partially fill buy orders with "output" fees', async () => {
            const side = MarketOperation.Buy;
            const fillableInput = getRandomOrderSize();
            const fillableOutput = getRandomOrderSize();
            const outputFeeRate = getRandomFeeRate();
            const orders = createQuoteFillOrders({
                fillableInput,
                fillableOutput,
                outputFeeRate,
                side,
            }).map((fo) => fo.order);
            const inputFillAmount = fillableInput.times(2 / 3).integerValue();
            const result = simulateBestCaseFill({
                orders,
                side,
                fillAmount: inputFillAmount,
                gasPrice: ONE,
                opts: { gasSchedule: GAS_SCHEDULE, protocolFeeMultiplier: ONE },
            });
            expect(result.gas).to.gt(0);
            expect(result.protocolFeeAmount).to.bignumber.gt(0);
            assertRoughlyEquals(result.totalMakerAssetAmount, inputFillAmount);
            expect(result.takerAssetAmount).to.bignumber.lt(fillableOutput);
            expect(result.makerAssetAmount).to.bignumber.eq(result.totalMakerAssetAmount);
            expect(result.takerFeeMakerAssetAmount).to.bignumber.eq(0);
        });
    });

    describe('simulateWorstCaseFill()', () => {
        it('includes order slippage', async () => {
            const side = randomSide();
            const fillableInput = getRandomOrderSize();
            const fillableOutput = getRandomOrderSize();
            const slippage = getRandomFeeRate();
            const orders = createQuoteFillOrders({
                fillableInput,
                fillableOutput,
                side,
            }).map((fo) => fo.order);

            const result = simulateWorstCaseFill({
                orders,
                side,
                fillAmount: fillableInput,
                gasPrice: ONE,
                opts: { gasSchedule: GAS_SCHEDULE, protocolFeeMultiplier: ONE, slippage },
            });
            if (side === MarketOperation.Sell) {
                const slippedOutput = fillableOutput.times(1 - slippage).integerValue();
                assertRoughlyEquals(result.totalMakerAssetAmount, slippedOutput);
                assertRoughlyEquals(result.totalTakerAssetAmount, fillableInput);
            } else {
                const slippedOutput = fillableOutput.times(slippage + 1).integerValue();
                assertRoughlyEquals(result.totalMakerAssetAmount, fillableInput);
                assertRoughlyEquals(result.totalTakerAssetAmount, slippedOutput);
            }
        });

        it('expects worse price than the best case, even if orders are unsorted', async () => {
            const side = randomSide();
            const fillableInput = getRandomOrderSize();
            const fillableOutput = getRandomOrderSize();
            const orderSlippage = getRandomFeeRate();
            let orders = createQuoteFillOrders({
                fillableInput,
                fillableOutput,
                side,
            }).map((fo) =>
                slipOrder(fo.order as OptimizedMarketOrderBase<NativeLimitOrderFillData>, orderSlippage, side),
            );
            orders = [...orders.slice(1), orders[0]];
            const bestCase = simulateBestCaseFill({
                orders,
                side,
                fillAmount: fillableInput,
                gasPrice: ONE,
                opts: { gasSchedule: GAS_SCHEDULE, protocolFeeMultiplier: ONE },
            });
            const worstCase = simulateWorstCaseFill({
                orders,
                side,
                fillAmount: fillableInput,
                gasPrice: ONE,
                opts: { gasSchedule: GAS_SCHEDULE, slippage: orderSlippage },
            });
            const bestPrice = bestCase.makerAssetAmount.div(bestCase.totalTakerAssetAmount);
            const worstPrice = worstCase.makerAssetAmount.div(worstCase.totalTakerAssetAmount);
            expect(worstPrice).to.be.bignumber.lt(bestPrice);
        });
    });
});
