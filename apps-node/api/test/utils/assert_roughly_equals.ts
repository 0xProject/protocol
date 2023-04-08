import { BigNumber } from '@0x/utils';
import { expect } from 'chai';

/**
 * See https://github.com/0xProject/protocol/blob/3333cfc77291548ab381f1acc8485cf0ad9b9b0f/contracts/test-utils/src/number_utils.ts#L83-L88
 */
export function assertRoughlyEquals(
    actual: BigNumber | string | number,
    expected: BigNumber | string | number,
    precision = 18,
): void {
    const _a = new BigNumber(actual);
    const _b = new BigNumber(expected);
    const maxIntegerDigits = Math.max(
        _a.integerValue(BigNumber.ROUND_DOWN).sd(true),
        _b.integerValue(BigNumber.ROUND_DOWN).sd(true),
    );
    const _toInteger = (n: BigNumber) => {
        const base = 10 ** (precision - maxIntegerDigits);
        return n.times(base).integerValue(BigNumber.ROUND_DOWN);
    };
    const numbericalDivergence = _toInteger(_a).minus(_toInteger(_b)).abs().toNumber();

    if (numbericalDivergence <= 1) {
        return;
    }
    expect(actual).to.bignumber.eq(expected);
}

/**
 * Asserts that two numbers are equal with up to `maxError` difference between them.
 */
export function assertIntegerRoughlyEquals(
    actual: BigNumber | string | number,
    expected: BigNumber | string | number,
    maxError = 1,
): void {
    const diff = new BigNumber(actual).minus(expected).abs().toNumber();
    if (diff <= maxError) {
        return;
    }
    expect(actual).to.bignumber.eq(expected);
}
