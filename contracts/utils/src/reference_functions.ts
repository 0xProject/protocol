import { BigNumber, LibMathRevertErrors, SafeMathRevertErrors } from '@0x/utils';

const MAX_UINT256 = new BigNumber(2).pow(256).minus(1);

/**
 * Add two `uint256` values. Reverts on overflow.
 */
export function safeAdd(a: BigNumber, b: BigNumber): BigNumber {
    const r = a.plus(b);
    if (r.isGreaterThan(MAX_UINT256)) {
        throw new SafeMathRevertErrors.Uint256BinOpError(SafeMathRevertErrors.BinOpErrorCodes.AdditionOverflow, a, b);
    }
    return r;
}

/**
 * Subract two `uint256` values. Reverts on overflow.
 */
export function safeSub(a: BigNumber, b: BigNumber): BigNumber {
    const r = a.minus(b);
    if (r.isLessThan(0)) {
        throw new SafeMathRevertErrors.Uint256BinOpError(
            SafeMathRevertErrors.BinOpErrorCodes.SubtractionUnderflow,
            a,
            b,
        );
    }
    return r;
}

/**
 * Multiplies two `uint256` values. Reverts on overflow.
 */
export function safeMul(a: BigNumber, b: BigNumber): BigNumber {
    const r = a.times(b);
    if (r.isGreaterThan(MAX_UINT256)) {
        throw new SafeMathRevertErrors.Uint256BinOpError(
            SafeMathRevertErrors.BinOpErrorCodes.MultiplicationOverflow,
            a,
            b,
        );
    }
    return r;
}

/**
 * Divides two `uint256` values. Reverts on division by zero.
 */
export function safeDiv(a: BigNumber, b: BigNumber): BigNumber {
    if (b.isEqualTo(0)) {
        throw new SafeMathRevertErrors.Uint256BinOpError(SafeMathRevertErrors.BinOpErrorCodes.DivisionByZero, a, b);
    }
    return a.dividedToIntegerBy(b);
}

// LibMath

/**
 * Checks if rounding error >= 0.1% when rounding down.
 */
export function isRoundingErrorFloor(numerator: BigNumber, denominator: BigNumber, target: BigNumber): boolean {
    if (denominator.eq(0)) {
        throw new LibMathRevertErrors.DivisionByZeroError();
    }
    if (numerator.eq(0) || target.eq(0)) {
        return false;
    }
    const remainder = numerator.times(target).mod(denominator);
    // Need to do this separately because solidity evaluates RHS of the comparison expression first.
    const rhs = safeMul(numerator, target);
    const lhs = safeMul(remainder, new BigNumber(1000));
    return lhs.gte(rhs);
}

/**
 * Checks if rounding error >= 0.1% when rounding up.
 */
export function isRoundingErrorCeil(numerator: BigNumber, denominator: BigNumber, target: BigNumber): boolean {
    if (denominator.eq(0)) {
        throw new LibMathRevertErrors.DivisionByZeroError();
    }
    if (numerator.eq(0) || target.eq(0)) {
        return false;
    }
    let remainder = numerator.times(target).mod(denominator);
    remainder = safeSub(denominator, remainder).mod(denominator);
    // Need to do this separately because solidity evaluates RHS of the comparison expression first.
    const rhs = safeMul(numerator, target);
    const lhs = safeMul(remainder, new BigNumber(1000));
    return lhs.gte(rhs);
}

/**
 * Calculates partial value given a numerator and denominator rounded down.
 *      Reverts if rounding error is >= 0.1%
 */
export function safeGetPartialAmountFloor(numerator: BigNumber, denominator: BigNumber, target: BigNumber): BigNumber {
    if (isRoundingErrorFloor(numerator, denominator, target)) {
        throw new LibMathRevertErrors.RoundingError(numerator, denominator, target);
    }
    return safeDiv(safeMul(numerator, target), denominator);
}

/**
 * Calculates partial value given a numerator and denominator rounded down.
 *      Reverts if rounding error is >= 0.1%
 */
export function safeGetPartialAmountCeil(numerator: BigNumber, denominator: BigNumber, target: BigNumber): BigNumber {
    if (isRoundingErrorCeil(numerator, denominator, target)) {
        throw new LibMathRevertErrors.RoundingError(numerator, denominator, target);
    }
    return safeDiv(safeAdd(safeMul(numerator, target), safeSub(denominator, new BigNumber(1))), denominator);
}

/**
 * Calculates partial value given a numerator and denominator rounded down.
 */
export function getPartialAmountFloor(numerator: BigNumber, denominator: BigNumber, target: BigNumber): BigNumber {
    return safeDiv(safeMul(numerator, target), denominator);
}

/**
 * Calculates partial value given a numerator and denominator rounded down.
 */
export function getPartialAmountCeil(numerator: BigNumber, denominator: BigNumber, target: BigNumber): BigNumber {
    const sub = safeSub(denominator, new BigNumber(1)); // This is computed first to simulate Solidity's order of operations
    return safeDiv(safeAdd(safeMul(numerator, target), sub), denominator);
}
