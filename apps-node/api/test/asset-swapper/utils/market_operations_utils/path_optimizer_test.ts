import * as chai from 'chai';
import * as _ from 'lodash';
import 'mocha';
import {
    ChainId,
    FillQuoteTransformerOrderType,
    IdentityFillAdjustor,
    MarketOperation,
    SignatureType,
} from '../../../../src/asset-swapper';
import { PathOptimizer } from '../../../../src/asset-swapper/utils/market_operation_utils/path_optimizer';
import { ERC20BridgeSource, FeeSchedule, FillData } from '../../../../src/asset-swapper/types';
import { DexSample, MultiHopFillData } from '../../../../src/asset-swapper/utils/market_operation_utils/types';
import { BigNumber } from '@0x/utils';
import { chaiSetup } from '../chai_setup';
import { PathPenaltyOpts } from '../../../../src/asset-swapper/utils/market_operation_utils/path';
import { ONE_ETHER } from '../../../../src/asset-swapper/utils/market_operation_utils/constants';
import { NativeOrderWithFillableAmounts } from '../../../../src/asset-swapper/types';

chaiSetup.configure();
const expect = chai.expect;

const ZERO = new BigNumber(0);

const NO_OP_FEE_SCHEDULE: FeeSchedule = Object.fromEntries(
    Object.values(ERC20BridgeSource).map((source) => [source, _.constant({ gas: 0, fee: ZERO })]),
) as unknown as FeeSchedule;

const NO_OP_PATH_PENALTY_OPTS: PathPenaltyOpts = {
    outputAmountPerEth: ZERO,
    inputAmountPerEth: ZERO,
    exchangeProxyOverhead: () => ZERO,
};

describe('PathOptimizer', () => {
    describe('Single source type (DEX, MultiHop, Native) routing', () => {
        it('Returns the best single DEX source path', async () => {
            const pathOptimizer = new PathOptimizer({
                pathContext: {
                    side: MarketOperation.Sell,
                    inputToken: 'fake-input-token',
                    outputToken: 'fake-output-token',
                },
                chainId: ChainId.Mainnet,
                feeSchedule: NO_OP_FEE_SCHEDULE,
                neonRouterNumSamples: 5,
                fillAdjustor: new IdentityFillAdjustor(),
                pathPenaltyOpts: NO_OP_PATH_PENALTY_OPTS,
                inputAmount: ONE_ETHER.times(4),
            });

            // UniswapV2 is the best path.
            const path = pathOptimizer.findOptimalPathFromSamples(
                [
                    createDexSamples({
                        source: ERC20BridgeSource.UniswapV2,
                        inputsInEther: [1, 2, 3, 4],
                        outputsInEther: [2, 4, 6, 8],
                    }),
                    createDexSamples({
                        source: ERC20BridgeSource.SushiSwap,
                        inputsInEther: [1, 2, 3, 4],
                        outputsInEther: [1, 2, 3, 4],
                    }),
                ],
                [],
                [],
            );

            if (path === undefined) {
                expect(path).to.be.not.undefined();
                return;
            }

            expect(path.fills).lengthOf(1);

            const fill = path?.fills[0];
            expect(fill.source).eq(ERC20BridgeSource.UniswapV2);
            expect(fill.input).bignumber.eq(ONE_ETHER.times(4));
            expect(fill.output).bignumber.eq(ONE_ETHER.times(8));
        });

        it('Returns the multihop path', async () => {
            const pathOptimizer = new PathOptimizer({
                pathContext: {
                    side: MarketOperation.Sell,
                    inputToken: 'fake-input-token',
                    outputToken: 'fake-output-token',
                },
                chainId: ChainId.Mainnet,
                feeSchedule: NO_OP_FEE_SCHEDULE,
                neonRouterNumSamples: 5,
                fillAdjustor: new IdentityFillAdjustor(),
                pathPenaltyOpts: NO_OP_PATH_PENALTY_OPTS,
                inputAmount: ONE_ETHER.times(4),
            });

            // Multihop is the best path.
            const path = pathOptimizer.findOptimalPathFromSamples(
                [
                    createDexSamples({
                        source: ERC20BridgeSource.UniswapV2,
                        inputsInEther: [1, 2, 3, 4],
                        outputsInEther: [2, 4, 6, 8],
                    }),
                ],
                [
                    createMultihopSamples({
                        firstHopSource: ERC20BridgeSource.Curve,
                        secondHopSource: ERC20BridgeSource.CurveV2,
                        inputsInEther: [2, 4],
                        outputsInEther: [4, 9],
                    }),
                ],
                [],
            );

            if (path === undefined) {
                expect(path).to.be.not.undefined();
                return;
            }

            expect(path.fills).lengthOf(1);

            const fill = path?.fills[0];
            expect(fill.source).eq(ERC20BridgeSource.MultiHop);
            expect(fill.input).bignumber.eq(ONE_ETHER.times(4));
            expect(fill.output).bignumber.eq(ONE_ETHER.times(9));
        });

        it('Returns the native source path', async () => {
            const pathOptimizer = new PathOptimizer({
                pathContext: {
                    side: MarketOperation.Sell,
                    inputToken: 'fake-input-token',
                    outputToken: 'fake-output-token',
                },
                chainId: ChainId.Mainnet,
                feeSchedule: NO_OP_FEE_SCHEDULE,
                neonRouterNumSamples: 5,
                fillAdjustor: new IdentityFillAdjustor(),
                pathPenaltyOpts: NO_OP_PATH_PENALTY_OPTS,
                inputAmount: ONE_ETHER.times(4),
            });

            // Native order is the best route.
            const path = pathOptimizer.findOptimalPathFromSamples(
                [
                    createDexSamples({
                        source: ERC20BridgeSource.UniswapV3,
                        inputsInEther: [1, 2, 3, 4],
                        outputsInEther: [1, 2, 3, 4],
                    }),
                ],
                [
                    createMultihopSamples({
                        firstHopSource: ERC20BridgeSource.Curve,
                        secondHopSource: ERC20BridgeSource.CurveV2,
                        inputsInEther: [4],
                        outputsInEther: [4],
                    }),
                ],
                [
                    createOtcOrder({
                        inputInEther: 4,
                        outputInEther: 5,
                    }),
                ],
            );

            if (path === undefined) {
                expect(path).to.be.not.undefined();
                return;
            }

            expect(path.fills).lengthOf(1);

            const fill = path?.fills[0];
            expect(fill.source).eq(ERC20BridgeSource.Native);
            expect(fill.input).bignumber.eq(ONE_ETHER.times(4));
            expect(fill.output).bignumber.eq(ONE_ETHER.times(5));
        });
    });

    describe('Multiplex routing', () => {
        it('Returns the best multiplex path (two DEX samples)', async () => {
            const pathOptimizer = new PathOptimizer({
                pathContext: {
                    side: MarketOperation.Sell,
                    inputToken: 'fake-input-token',
                    outputToken: 'fake-output-token',
                },
                chainId: ChainId.Mainnet,
                feeSchedule: NO_OP_FEE_SCHEDULE,
                neonRouterNumSamples: 5,
                fillAdjustor: new IdentityFillAdjustor(),
                pathPenaltyOpts: NO_OP_PATH_PENALTY_OPTS,
                inputAmount: ONE_ETHER.times(4),
            });

            // The best route involves utilizing both.
            const path = pathOptimizer.findOptimalPathFromSamples(
                [
                    createDexSamples({
                        source: ERC20BridgeSource.UniswapV2,
                        inputsInEther: [1, 2, 3, 4],
                        outputsInEther: [2, 4, 6, 7],
                    }),
                    createDexSamples({
                        source: ERC20BridgeSource.SushiSwap,
                        inputsInEther: [1, 2, 3, 4],
                        outputsInEther: [2, 3, 4, 5],
                    }),
                ],
                [],
                [],
            );

            if (path === undefined) {
                expect(path).to.be.not.undefined();
                return;
            }

            expect(path.fills).lengthOf(2);
            const fill0 = path.fills[0];
            const fill1 = path.fills[1];
            expect(fill0.source).eq(ERC20BridgeSource.UniswapV2);
            expect(fill1.source).eq(ERC20BridgeSource.SushiSwap);

            const inputTotal = fill0.input.plus(fill1.input);
            const outputTotal = fill0.output.plus(fill1.output);

            expect(inputTotal).bignumber.eq(ONE_ETHER.times(4));
            expect(outputTotal).bignumber.eq(ONE_ETHER.times(8));
        });

        it('Returns the best multiplex path (two native orders)', async () => {
            const pathOptimizer = new PathOptimizer({
                pathContext: {
                    side: MarketOperation.Sell,
                    inputToken: 'fake-input-token',
                    outputToken: 'fake-output-token',
                },
                chainId: ChainId.Mainnet,
                feeSchedule: NO_OP_FEE_SCHEDULE,
                neonRouterNumSamples: 5,
                fillAdjustor: new IdentityFillAdjustor(),
                pathPenaltyOpts: NO_OP_PATH_PENALTY_OPTS,
                inputAmount: ONE_ETHER.times(4),
            });

            // The best route involves utilizing two and native orders.
            const path = pathOptimizer.findOptimalPathFromSamples(
                [
                    createDexSamples({
                        source: ERC20BridgeSource.UniswapV3,
                        inputsInEther: [1, 2, 3, 4],
                        outputsInEther: [1, 2, 3, 4],
                    }),
                ],
                [],
                [
                    createOtcOrder({
                        inputInEther: 2,
                        outputInEther: 4,
                    }),

                    createOtcOrder({
                        inputInEther: 2,
                        outputInEther: 4,
                    }),
                ],
            );

            if (path === undefined) {
                expect(path).to.be.not.undefined();
                return;
            }

            expect(path.fills).lengthOf(2);
            const fill0 = path.fills[0];
            const fill1 = path.fills[1];
            expect(fill0.source).eq(ERC20BridgeSource.Native);
            expect(fill1.source).eq(ERC20BridgeSource.Native);

            const inputTotal = fill0.input.plus(fill1.input);
            const outputTotal = fill0.output.plus(fill1.output);

            expect(inputTotal).bignumber.eq(ONE_ETHER.times(4));
            expect(outputTotal).bignumber.eq(ONE_ETHER.times(8));
        });

        it('Returns the best multiplex path (DEX + native order)', async () => {
            const pathOptimizer = new PathOptimizer({
                pathContext: {
                    side: MarketOperation.Sell,
                    inputToken: 'fake-input-token',
                    outputToken: 'fake-output-token',
                },
                chainId: ChainId.Mainnet,
                feeSchedule: NO_OP_FEE_SCHEDULE,
                neonRouterNumSamples: 5,
                fillAdjustor: new IdentityFillAdjustor(),
                pathPenaltyOpts: NO_OP_PATH_PENALTY_OPTS,
                inputAmount: ONE_ETHER.times(4),
            });

            // The best route involves utilizing both Uniswap V2 and NativeOrder
            const path = pathOptimizer.findOptimalPathFromSamples(
                [
                    createDexSamples({
                        source: ERC20BridgeSource.UniswapV2,
                        inputsInEther: [1, 2, 3, 4],
                        outputsInEther: [2, 4, 5, 7],
                    }),
                ],
                [],
                [
                    createOtcOrder({
                        inputInEther: 2,
                        outputInEther: 4,
                    }),
                ],
            );

            if (path === undefined) {
                expect(path).to.be.not.undefined();
                return;
            }

            expect(path.fills).lengthOf(2);
            const fill0 = path.fills[0];
            const fill1 = path.fills[1];
            expect(fill0.source).eq(ERC20BridgeSource.UniswapV2);
            expect(fill1.source).eq(ERC20BridgeSource.Native);

            const inputTotal = fill0.input.plus(fill1.input);
            const outputTotal = fill0.output.plus(fill1.output);

            expect(inputTotal).bignumber.eq(ONE_ETHER.times(4));
            expect(outputTotal).bignumber.eq(ONE_ETHER.times(8));
        });

        it('Returns the best multiplex path (DEX + multihop)', async () => {
            const pathOptimizer = new PathOptimizer({
                pathContext: {
                    side: MarketOperation.Sell,
                    inputToken: 'fake-input-token',
                    outputToken: 'fake-output-token',
                },
                chainId: ChainId.Mainnet,
                feeSchedule: NO_OP_FEE_SCHEDULE,
                neonRouterNumSamples: 5,
                fillAdjustor: new IdentityFillAdjustor(),
                pathPenaltyOpts: NO_OP_PATH_PENALTY_OPTS,
                inputAmount: ONE_ETHER.times(4),
            });

            // The best route involves utilizing both Uniswap V2 and MultiHop.
            const path = pathOptimizer.findOptimalPathFromSamples(
                [
                    createDexSamples({
                        source: ERC20BridgeSource.UniswapV2,
                        inputsInEther: [1, 2, 3, 4],
                        outputsInEther: [2, 4, 5, 7],
                    }),
                ],
                [
                    createMultihopSamples({
                        firstHopSource: ERC20BridgeSource.Curve,
                        secondHopSource: ERC20BridgeSource.CurveV2,
                        inputsInEther: [2, 4],
                        outputsInEther: [4, 7],
                    }),
                ],
                [],
            );

            if (path === undefined) {
                expect(path).to.be.not.undefined();
                return;
            }

            expect(path.fills).lengthOf(2);
            const fill0 = path.fills[0];
            const fill1 = path.fills[1];
            expect(fill0.source).eq(ERC20BridgeSource.UniswapV2);
            expect(fill1.source).eq(ERC20BridgeSource.MultiHop);

            const inputTotal = fill0.input.plus(fill1.input);
            const outputTotal = fill0.output.plus(fill1.output);

            expect(inputTotal).bignumber.eq(ONE_ETHER.times(4));
            expect(outputTotal).bignumber.eq(ONE_ETHER.times(8));
        });
    });
});

function createDexSample(source: ERC20BridgeSource, inputInEther: number, outputInEther: number): DexSample<FillData> {
    return {
        source,
        input: ONE_ETHER.times(inputInEther),
        output: ONE_ETHER.times(outputInEther),
        fillData: {},
    };
}

function createDexSamples(params: {
    source: ERC20BridgeSource;
    inputsInEther: number[];
    outputsInEther: number[];
}): DexSample<FillData>[] {
    const { source, inputsInEther, outputsInEther } = params;
    return inputsInEther.map((inputInEther, i) => createDexSample(source, inputInEther, outputsInEther[i]));
}

function createMultihopSamples(params: {
    firstHopSource: ERC20BridgeSource;
    secondHopSource: ERC20BridgeSource;
    inputsInEther: number[];
    outputsInEther: number[];
}): DexSample<MultiHopFillData>[] {
    return params.inputsInEther.map((inputInEther, i) => {
        return {
            source: ERC20BridgeSource.MultiHop,
            fillData: {
                firstHopSource: {
                    source: params.firstHopSource,
                    fillData: {},
                },
                secondHopSource: {
                    source: params.secondHopSource,
                    fillData: {},
                },
                intermediateToken: 'fake-intermediate-token',
            },
            input: ONE_ETHER.times(inputInEther),
            output: ONE_ETHER.times(params.outputsInEther[i]),
        };
    });
}

function createOtcOrder(params: { inputInEther: number; outputInEther: number }): NativeOrderWithFillableAmounts {
    const { inputInEther, outputInEther } = params;
    return {
        type: FillQuoteTransformerOrderType.Otc,
        order: {
            txOrigin: '',
            expiryAndNonce: new BigNumber(42),
            makerToken: 'fake-maker-token',
            takerToken: 'fake-taker-token',
            makerAmount: ONE_ETHER.times(outputInEther),
            takerAmount: ONE_ETHER.times(inputInEther),
            maker: 'maker',
            taker: 'taker',
            chainId: 42,
            verifyingContract: 'fake-verifying contract',
        },
        signature: {
            signatureType: SignatureType.EIP712,
            r: 'r',
            s: 's',
            v: 42,
        },
        fillableMakerAmount: ONE_ETHER.times(outputInEther),
        fillableTakerAmount: ONE_ETHER.times(inputInEther),
        fillableTakerFeeAmount: new BigNumber(0),
    };
}
