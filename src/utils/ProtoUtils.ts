import { BigNumber } from '@0x/utils';
import { BigNumberJs } from '../proto-ts/big_number_js.pb';

/**
 * Converts a BigNumberJs proto to an instance of bignumber.js `BigNumber`.
 * See: https://mikemcl.github.io/bignumber.js/#instance-properties
 */
export function protoToBigNumber(proto: BigNumberJs): BigNumber {
    // Proto uses an `int64` which is generated to a `bigint`, but bignumber.js uses
    // `number`. This probably masks some big problems with bignumber.js, but we'll
    // let that sleeping dog lie.
    const c = proto.c.map((x) => Number(x));
    const result = new BigNumber({
        c,
        e: proto.e ?? null,
        s: proto.s ? 1 : proto.s === false ? -1 : null,
        _isBigNumber: true,
    });
    if (!BigNumber.isBigNumber(result)) {
        throw new Error(`Unable to create BigNumber from proto: ${JSON.stringify(proto)}`);
    }
    return result;
}

/**
 * Converts a bignumber.js to its proto representation.
 * See: https://mikemcl.github.io/bignumber.js/#instance-properties
 */
export function bigNumberToProto(n: BigNumber): BigNumberJs {
    const c = n.c?.map((n) => BigInt(n)) ?? [];
    const s = n.s === 1 ? true : n.s === -1 ? false : null;
    const e = n.e;
    return { c, e, s };
}
