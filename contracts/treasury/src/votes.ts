import { ZeroExSignedVote } from '@0x/contracts-test-utils/src/types';
import {
    eip712SignHashWithKey,
    getTypeHash,
    ZERO,
} from '@0x/protocol-utils';
import { BigNumber, hexUtils, NULL_ADDRESS, Numberish } from '@0x/utils';
import * as ethUtil from 'ethereumjs-util';

const VOTE_DEFAULT_VALUES = {
    proposalId: ZERO,
    support: false,
    operatedPoolIds: [] as string[],
    chainId: 1,
    version: '1.0.0',
    verifyingContract: NULL_ADDRESS,
};

export type VoteFields = typeof VOTE_DEFAULT_VALUES;

export class Vote {
    public static readonly CONTRACT_NAME = 'Zrx Treasury';

    public static readonly MESSAGE_STRUCT_NAME = 'Vote';
    public static readonly MESSAGE_STRUCT_ABI = [
        { type: 'uint256', name: 'proposalId' },
        { type: 'bool', name: 'support' },
        { type: 'bytes32[]', name: 'operatedPoolIds' },
    ];
    public static readonly MESSAGE_TYPE_HASH = getTypeHash(
        Vote.MESSAGE_STRUCT_NAME, Vote.MESSAGE_STRUCT_ABI,
    );

    public static readonly DOMAIN_STRUCT_NAME = 'EIP712Domain';
    public static readonly DOMAIN_STRUCT_ABI = [
        { type: 'string', name: 'name' },
        { type: 'uint256', name: 'chainId' },
        { type: 'string', name: 'version' },
        { type: 'address', name: 'verifyingContract' },
    ];
    public static readonly DOMAIN_TYPE_HASH = getTypeHash(
        Vote.DOMAIN_STRUCT_NAME, Vote.DOMAIN_STRUCT_ABI,
    );

    public proposalId: BigNumber;
    public support: boolean;
    public operatedPoolIds: string[];
    public chainId: number;
    public version: string;
    public verifyingContract: string;

    constructor(fields: Partial<VoteFields> = {}) {
        const _fields = { ...VOTE_DEFAULT_VALUES, ...fields };
        this.proposalId = _fields.proposalId;
        this.support = _fields.support;
        this.operatedPoolIds = _fields.operatedPoolIds;
        this.chainId = _fields.chainId;
        this.version = _fields.version;
        this.verifyingContract = _fields.verifyingContract;
    }

    public getDomainHash(): string {
        return hexUtils.hash(
            hexUtils.concat(
                hexUtils.leftPad(Vote.DOMAIN_TYPE_HASH),
                hexUtils.hash(
                    hexUtils.toHex(Buffer.from(Vote.CONTRACT_NAME)),
                ),
                hexUtils.leftPad(this.chainId),
                hexUtils.hash(
                    hexUtils.toHex(Buffer.from(this.version)),
                ),
                hexUtils.leftPad(this.verifyingContract),
            ),
        );
    }

    public getStructHash(): string {
        return hash(
            hexUtils.concat(
                hexUtils.leftPad(Vote.MESSAGE_TYPE_HASH),
                hexUtils.leftPad(this.proposalId),
                hexUtils.leftPad(this.support ? 1 : 0),
                // hexUtils.hash(
                //     hexUtils.toHex(Buffer.from(hexUtils.concat(...this.operatedPoolIds))),
                // ),
                hash(ethUtil.toBuffer(hexUtils.concat(...this.operatedPoolIds))),
            ),
        );
    }

    public getEIP712Hash(): string {
        return hexUtils.hash(
            hexUtils.toHex(
                hexUtils.concat(
                    '0x1901',
                    this.getDomainHash(),
                    this.getStructHash()),
            ),
        );
    }

    public getSignatureWithKey(privateKey: string): ZeroExSignedVote {
        const signature = eip712SignHashWithKey(this.getEIP712Hash(), privateKey);
        return {
            ...this,
            ...signature,
        };
    }
}

// TODO(Cece): remove debug code
// the code below are all temp, waiting for https://github.com/0xProject/tools/pull/42 to be merged
export function hash(n: Numberish | Buffer): string {
    return ethUtil.bufferToHex(ethUtil.keccak256(ethUtil.toBuffer(toHex(n))));
}

function invert(n: Numberish, _size: number = 32): string {
    const buf = ethUtil.setLengthLeft(ethUtil.toBuffer(hexUtils.toHex(n)), _size);
    // tslint:disable-next-line: no-bitwise
    return ethUtil.bufferToHex(Buffer.from(buf.map(b => ~b)));
}

function toHex(n: Numberish | Buffer, _size: number = 32): string {
    if (Buffer.isBuffer(n)) {
        return `0x${n.toString('hex')}`;
    }
    if (typeof n === 'string' && isHex(n)) {
        // Already a hex.
        return n;
    }
    let _n = new BigNumber(n);
    if (_n.isNegative()) {
        // Perform two's-complement.
        // prettier-ignore
        _n = new BigNumber(
            invert(
                toHex(_n.abs()),
                _size,
            ).substr(2),
            16,
        ).plus(1).mod(new BigNumber(2).pow(32 * 8));
    }
    return `0x${_n.toString(16)}`;
}

function isHex(s: string): boolean {
    return /^0x[0-9a-f]*$/i.test(s);
}
