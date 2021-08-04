import {
    EIP712_DOMAIN_PARAMETERS, EIP712Domain,
    getTypeHash,
    ZERO,
} from '@0x/protocol-utils';
import { EIP712TypedData } from '@0x/types';
import { BigNumber, hexUtils, NULL_ADDRESS } from '@0x/utils';

const VOTE_EIP712_DOMAIN_DEFAULT = {
    chainId: 1,
    verifyingContract: NULL_ADDRESS,
    name: 'Zrx Treasury',
    version: '1.0.0',
};
const VOTE_DEFAULT_VALUES = {
    proposalId: ZERO,
    support: false,
    operatedPoolIds: [] as string[],
    chainId: 1,
    verifyingContract: NULL_ADDRESS,
};

export type VoteFields = typeof VOTE_DEFAULT_VALUES;

export class Vote {
    public static readonly STRUCT_NAME = 'Vote';
    public static readonly STRUCT_ABI = [
        { type: 'uint256', name: 'proposalId' },
        { type: 'boolean', name: 'support' },
        { type: 'bytes32[]', name: 'operatedPoolIds' },
    ];
    public static readonly TYPE_HASH = getTypeHash(Vote.STRUCT_NAME, Vote.STRUCT_ABI);

    public proposalId: BigNumber;
    public support: boolean;
    public operatedPoolIds: string[];
    public chainId: number;
    public verifyingContract: string;

    protected static _createVoteEIP712Domain(chainId?: number, verifyingContract?: string): EIP712Domain {
        return {
            ...VOTE_EIP712_DOMAIN_DEFAULT,
            ...(chainId ? { chainId } : {}),
            ...(verifyingContract ? { verifyingContract } : {}),
        };
    }

    constructor(fields: Partial<VoteFields> = {}) {
        const _fields = { ...VOTE_DEFAULT_VALUES, ...fields };
        this.proposalId = _fields.proposalId;
        this.support = _fields.support;
        this.operatedPoolIds = _fields.operatedPoolIds;
        this.chainId = _fields.chainId;
        this.verifyingContract = _fields.verifyingContract;
    }

    public clone(fields: Partial<VoteFields> = {}): Vote {
        return new Vote({
            proposalId: this.proposalId,
            support: this.support,
            operatedPoolIds: this.operatedPoolIds,
            chainId: this.chainId,
            verifyingContract: this.verifyingContract,
            ...fields,
        });
    }

    public getStructHash(): string {
        const operatedPoolIdsBuff: Buffer[] = [];
        for (const id of this.operatedPoolIds) {
            operatedPoolIdsBuff.push(Buffer.from(id.toString(16), 'hex'));
        }

        return hexUtils.hash(
            hexUtils.concat(
                hexUtils.leftPad(Vote.TYPE_HASH),
                hexUtils.leftPad(this.proposalId),
                hexUtils.leftPad(this.support ? 1 : 0),
                hexUtils.hash(hexUtils.concat(...operatedPoolIdsBuff)),
                hexUtils.leftPad(this.chainId),
                hexUtils.leftPad(this.verifyingContract),
            ),
        );
    }

    public getEIP712TypedData(): EIP712TypedData {
        return {
            types: {
                EIP712Domain: EIP712_DOMAIN_PARAMETERS,
                [Vote.STRUCT_NAME]: Vote.STRUCT_ABI,
            },
            domain: Vote._createVoteEIP712Domain(this.chainId, this.verifyingContract) as any,
            primaryType: Vote.STRUCT_NAME,
            message: {
                proposalId: this.proposalId.toString(10),
                support: this.support ? 1 : 0,
                // TODO(Cece): key types does not support array
                operatedPoolIds: this.operatedPoolIds,
                chainId: this.chainId.toString(10),
                verifyingContract: this.verifyingContract,
            },
        };
    }
}
