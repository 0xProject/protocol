import { expect } from '@0x/contracts-test-utils';
import { BigNumber } from '@0x/utils';

import { MarketOperation } from '../src/types';
import { Path } from '../src/utils/market_operation_utils/path';
import { ERC20BridgeSource, Fill } from '../src/utils/market_operation_utils/types';

const createFill = (
    source: ERC20BridgeSource,
    index: number = 0,
    input: BigNumber = new BigNumber(100),
    output: BigNumber = new BigNumber(100),
): Fill =>
    // tslint:disable-next-line: no-object-literal-type-assertion
    ({
        source,
        input,
        output,
        adjustedOutput: output,
        flags: BigInt(0),
        sourcePathId: source,
        index,
    } as Fill);

describe('Path', () => {
    it('Adds a fallback', () => {
        const targetInput = new BigNumber(100);
        const path = Path.create(
            MarketOperation.Sell,
            [createFill(ERC20BridgeSource.Native), createFill(ERC20BridgeSource.Native)],
            targetInput,
        );
        const fallback = Path.create(MarketOperation.Sell, [createFill(ERC20BridgeSource.Uniswap)], targetInput);
        path.addFallback(fallback);
        const sources = path.fills.map(f => f.source);
        expect(sources).to.deep.eq([ERC20BridgeSource.Native, ERC20BridgeSource.Native, ERC20BridgeSource.Uniswap]);
    });

    it('Adds a fallback with LiquidityProvider', () => {
        const targetInput = new BigNumber(100);
        const path = Path.create(
            MarketOperation.Sell,
            [createFill(ERC20BridgeSource.Native), createFill(ERC20BridgeSource.LiquidityProvider)],
            targetInput,
        );
        const fallback = Path.create(MarketOperation.Sell, [createFill(ERC20BridgeSource.Uniswap)], targetInput);
        path.addFallback(fallback);
        const sources = path.fills.map(f => f.source);
        expect(sources).to.deep.eq([
            ERC20BridgeSource.Native,
            ERC20BridgeSource.LiquidityProvider,
            ERC20BridgeSource.Uniswap,
        ]);
    });

    it('Handles duplicates', () => {
        const targetInput = new BigNumber(100);
        const path = Path.create(
            MarketOperation.Sell,
            [createFill(ERC20BridgeSource.Uniswap), createFill(ERC20BridgeSource.LiquidityProvider)],
            targetInput,
        );
        const fallback = Path.create(MarketOperation.Sell, [createFill(ERC20BridgeSource.Uniswap)], targetInput);
        path.addFallback(fallback);
        const sources = path.fills.map(f => f.source);
        expect(sources).to.deep.eq([ERC20BridgeSource.Uniswap, ERC20BridgeSource.LiquidityProvider]);
    });
    it('Moves Native orders to the front and appends with unused fills', () => {
        const targetInput = new BigNumber(100);
        const path = Path.create(
            MarketOperation.Sell,
            [
                createFill(ERC20BridgeSource.Uniswap, 0, new BigNumber(50)),
                createFill(ERC20BridgeSource.Native, 0, new BigNumber(50)),
            ],
            targetInput,
        );
        const fallback = Path.create(
            MarketOperation.Sell,
            [
                createFill(ERC20BridgeSource.Uniswap, 0, new BigNumber(50)),
                createFill(ERC20BridgeSource.Uniswap, 1, new BigNumber(50)),
            ],
            targetInput,
        );
        path.addFallback(fallback);
        const sources = path.fills.map(f => f.source);
        expect(sources).to.deep.eq([ERC20BridgeSource.Native, ERC20BridgeSource.Uniswap, ERC20BridgeSource.Uniswap]);
    });
});
