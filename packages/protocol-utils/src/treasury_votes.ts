import { BigNumber, hexUtils, NULL_ADDRESS } from '@0x/utils';
import * as ethUtil from 'ethereumjs-util';

import { ZERO } from './constants';
import { EIP712_DOMAIN_PARAMETERS, getTypeHash } from './eip712_utils';
import { eip712SignHashWithKey, Signature } from './signature_utils';

const VOTE_DEFAULT_VALUES = {
    proposalId: ZERO,
    support: false,
    operatedPoolIds: [] as string[],
    chainId: 1,
    version: '1.0.0',
    verifyingContract: NULL_ADDRESS,
};

export type TreasuryVoteFields = typeof VOTE_DEFAULT_VALUES;

export class TreasuryVote {
    public static readonly CONTRACT_NAME = 'Zrx Treasury';

    public static readonly MESSAGE_STRUCT_NAME = 'TreasuryVote';
    public static readonly MESSAGE_STRUCT_ABI = [
        { type: 'uint256', name: 'proposalId' },
        { type: 'bool', name: 'support' },
        { type: 'bytes32[]', name: 'operatedPoolIds' },
    ];
    public static readonly MESSAGE_TYPE_HASH = getTypeHash(
        TreasuryVote.MESSAGE_STRUCT_NAME,
        TreasuryVote.MESSAGE_STRUCT_ABI,
    );

    public static readonly DOMAIN_STRUCT_NAME = 'EIP712Domain';
    public static readonly DOMAIN_TYPE_HASH = getTypeHash(TreasuryVote.DOMAIN_STRUCT_NAME, EIP712_DOMAIN_PARAMETERS);

    public proposalId: BigNumber;
    public support: boolean;
    public operatedPoolIds: string[];
    public chainId: number;
    public version: string;
    public verifyingContract: string;

    constructor(fields: Partial<TreasuryVoteFields> = {}) {
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
                hexUtils.leftPad(TreasuryVote.DOMAIN_TYPE_HASH),
                hexUtils.hash(hexUtils.toHex(Buffer.from(TreasuryVote.CONTRACT_NAME))),
                hexUtils.leftPad(this.chainId),
                hexUtils.hash(hexUtils.toHex(Buffer.from(this.version))),
                hexUtils.leftPad(this.verifyingContract),
            ),
        );
    }

    public getStructHash(): string {
        return hexUtils.hash(
            hexUtils.concat(
                hexUtils.leftPad(TreasuryVote.MESSAGE_TYPE_HASH),
                hexUtils.leftPad(this.proposalId),
                hexUtils.leftPad(this.support ? 1 : 0),
                hexUtils.hash(
                    ethUtil.toBuffer(hexUtils.concat(...this.operatedPoolIds.map(id => hexUtils.leftPad(id)))),
                ),
            ),
        );
    }

    public getEIP712Hash(): string {
        return hexUtils.hash(hexUtils.toHex(hexUtils.concat('0x1901', this.getDomainHash(), this.getStructHash())));
    }

    public getSignatureWithKey(privateKey: string): Signature {
        return eip712SignHashWithKey(this.getEIP712Hash(), privateKey);
    }
}
