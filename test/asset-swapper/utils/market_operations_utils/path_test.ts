import * as chai from 'chai';
import 'mocha';
import {
    BigNumber,
    ERC20BridgeSource,
    Fill,
    FillQuoteTransformerOrderType,
    MarketOperation,
} from '../../../../src/asset-swapper';
import { ONE_ETHER } from '../../../../src/asset-swapper/utils/market_operation_utils/constants';
import { Path } from '../../../../src/asset-swapper/utils/market_operation_utils/path';
import { chaiSetup } from '../chai_setup';

chaiSetup.configure();
const expect = chai.expect;

describe('Path', () => {
    describe('adjustedRate()', () => {
        it('Returns the adjusted rate based on adjustedOutput and exchange proxy overhead', () => {
            const path = Path.create(
                MarketOperation.Sell,
                [createFakeFill({ input: ONE_ETHER, adjustedOutput: ONE_ETHER.times(990) })],
                ONE_ETHER,
                {
                    inputAmountPerEth: new BigNumber(1),
                    outputAmountPerEth: new BigNumber(1000),
                    exchangeProxyOverhead: () => ONE_ETHER.times(0.01), // 10 * 10e18 output amount
                },
            );

            // 990 (adjusted output) - 10 (overhead)
            expect(path.adjustedRate()).bignumber.eq(new BigNumber(990 - 10));
        });

        it('Returns the adjusted rate without interpolating penalty when sum of the input amounts is greater than the target input amount', () => {
            const path = Path.create(
                MarketOperation.Sell,
                [
                    createFakeFill({
                        input: ONE_ETHER,
                        adjustedOutput: ONE_ETHER.times(990),
                    }),
                    createFakeFill({
                        input: ONE_ETHER,
                        output: ONE_ETHER.times(1000),
                        adjustedOutput: ONE_ETHER.times(990),
                    }),
                ],
                ONE_ETHER.times(1.5),
                {
                    inputAmountPerEth: new BigNumber(1),
                    outputAmountPerEth: new BigNumber(1000),
                    exchangeProxyOverhead: () => ONE_ETHER.times(0.01), // 10 * 10e18 output amount
                },
            );

            // 990 (adjusted output) + 1000 (output) /2 - 10 (penalty) - 10 (overhead)
            expect(path.adjustedRate()).bignumber.eq(new BigNumber(990 + 1000 / 2 - 10 - 10).div(1.5));
        });
    });
});

function createFakeFill(params: { input: BigNumber; output?: BigNumber; adjustedOutput: BigNumber }): Fill {
    const { input, output, adjustedOutput } = params;
    return {
        input,
        output: output || new BigNumber(0),
        adjustedOutput,
        gas: 42,
        source: ERC20BridgeSource.UniswapV3,
        type: FillQuoteTransformerOrderType.Bridge,
        fillData: {},
        sourcePathId: 'fake-path-id',
        flags: BigInt(0),
    };
}
