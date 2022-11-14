import * as chai from 'chai';
import * as _ from 'lodash';
import 'mocha';
import { ChainId, IdentityFillAdjustor, MarketOperation } from '../../../../src/asset-swapper';
import { PathOptimizer } from '../../../../src/asset-swapper/utils/market_operation_utils/path_optimizer';
import { ERC20BridgeSource, FeeSchedule } from '../../../../src/asset-swapper/utils/market_operation_utils/types';
import { BigNumber } from '@0x/utils';
import { chaiSetup } from '../chai_setup';
import { PathPenaltyOpts } from '../../../../src/asset-swapper/utils/market_operation_utils/path';
import { ONE_ETHER } from '../../../../src/asset-swapper/utils/market_operation_utils/constants';

chaiSetup.configure();
const expect = chai.expect;

const ZERO = new BigNumber(0);

const NO_OP_FEE_SCHEDULE: FeeSchedule = Object.fromEntries(
    Object.values(ERC20BridgeSource).map((source) => [source, _.constant({ gas: 0, fee: ZERO })]),
);

const NO_OP_PATH_PENALTY_OPTS: PathPenaltyOpts = {
    outputAmountPerEth: ZERO,
    inputAmountPerEth: ZERO,
    exchangeProxyOverhead: () => ZERO,
    gasPrice: ZERO,
};

describe('PathOptimizer', () => {
    // TODO: add more test (e.g. multiplex, native order).

    it('Returns the best single source path', async () => {
        const pathOptimizer = new PathOptimizer({
            side: MarketOperation.Sell,
            chainId: ChainId.Mainnet,
            feeSchedule: NO_OP_FEE_SCHEDULE,
            neonRouterNumSamples: 4,
            fillAdjustor: new IdentityFillAdjustor(),
            pathPenaltyOpts: NO_OP_PATH_PENALTY_OPTS,
            inputAmount: ONE_ETHER.times(4),
        });

        // UniswapV3 is the best path.
        // UniswapV3: 4 -> 8
        // SushiSwap: 4 -> 4
        const path = pathOptimizer.findOptimalPathFromSamples(
            [
                [
                    { source: ERC20BridgeSource.UniswapV3, fillData: {}, input: ONE_ETHER, output: ONE_ETHER.times(2) },
                    {
                        source: ERC20BridgeSource.UniswapV3,
                        fillData: {},
                        input: ONE_ETHER.times(2),
                        output: ONE_ETHER.times(4),
                    },
                    {
                        source: ERC20BridgeSource.UniswapV3,
                        fillData: {},
                        input: ONE_ETHER.times(3),
                        output: ONE_ETHER.times(6),
                    },
                    {
                        source: ERC20BridgeSource.UniswapV3,
                        fillData: {},
                        input: ONE_ETHER.times(4),
                        output: ONE_ETHER.times(8),
                    },
                ],
                [
                    { source: ERC20BridgeSource.SushiSwap, fillData: {}, input: ONE_ETHER, output: ONE_ETHER },
                    {
                        source: ERC20BridgeSource.SushiSwap,
                        fillData: {},
                        input: ONE_ETHER.times(2),
                        output: ONE_ETHER.times(2),
                    },
                    {
                        source: ERC20BridgeSource.SushiSwap,
                        fillData: {},
                        input: ONE_ETHER.times(3),
                        output: ONE_ETHER.times(3),
                    },
                    {
                        source: ERC20BridgeSource.SushiSwap,
                        fillData: {},
                        input: ONE_ETHER.times(4),
                        output: ONE_ETHER.times(4),
                    },
                ],
            ],
            [],
            [],
        );

        expect(path?.fills).lengthOf(1);

        const fill = path?.fills[0];
        expect(fill?.source).eq(ERC20BridgeSource.UniswapV3);
        expect(fill?.input).bignumber.eq(ONE_ETHER.times(4));
        expect(fill?.output).bignumber.eq(ONE_ETHER.times(8));
    });

    it('Returns the multihop path when it is the best path', async () => {
        const pathOptimizer = new PathOptimizer({
            side: MarketOperation.Sell,
            chainId: ChainId.Mainnet,
            feeSchedule: NO_OP_FEE_SCHEDULE,
            neonRouterNumSamples: 4,
            fillAdjustor: new IdentityFillAdjustor(),
            pathPenaltyOpts: NO_OP_PATH_PENALTY_OPTS,
            inputAmount: ONE_ETHER.times(4),
        });

        // Multihop is the best path.
        // UniswapV3: 4 -> 8
        // Multihop: 4 -> 9
        const path = pathOptimizer.findOptimalPathFromSamples(
            [
                [
                    { source: ERC20BridgeSource.UniswapV3, fillData: {}, input: ONE_ETHER, output: ONE_ETHER.times(2) },
                    {
                        source: ERC20BridgeSource.UniswapV3,
                        fillData: {},
                        input: ONE_ETHER.times(2),
                        output: ONE_ETHER.times(4),
                    },
                    {
                        source: ERC20BridgeSource.UniswapV3,
                        fillData: {},
                        input: ONE_ETHER.times(3),
                        output: ONE_ETHER.times(6),
                    },
                    {
                        source: ERC20BridgeSource.UniswapV3,
                        fillData: {},
                        input: ONE_ETHER.times(4),
                        output: ONE_ETHER.times(8),
                    },
                ],
            ],
            [
                {
                    source: ERC20BridgeSource.MultiHop,
                    fillData: {
                        firstHopSource: {
                            source: ERC20BridgeSource.Curve,
                            fillData: {},
                            encodeCall: () => 'fake-encodedCall',
                            handleCallResults: () => [],
                            handleRevert: () => [],
                        },
                        secondHopSource: {
                            source: ERC20BridgeSource.CurveV2,
                            fillData: {},
                            encodeCall: () => 'fake-encodedCall',
                            handleCallResults: () => [],
                            handleRevert: () => [],
                        },
                        intermediateToken: 'fake-intermediate-token',
                    },
                    input: ONE_ETHER.times(4),
                    output: ONE_ETHER.times(9),
                },
            ],
            [],
        );

        expect(path?.fills).lengthOf(1);

        const fill = path?.fills[0];
        expect(fill?.source).eq(ERC20BridgeSource.MultiHop);
        expect(fill?.input).bignumber.eq(ONE_ETHER.times(4));
        expect(fill?.output).bignumber.eq(ONE_ETHER.times(9));
    });
});
