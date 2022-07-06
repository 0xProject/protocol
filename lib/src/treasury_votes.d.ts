import { BigNumber } from '@0x/utils';
import { Signature } from './signature_utils';
declare const VOTE_DEFAULT_VALUES: {
    proposalId: BigNumber;
    support: boolean;
    operatedPoolIds: string[];
    chainId: number;
    version: string;
    verifyingContract: string;
};
export declare type TreasuryVoteFields = typeof VOTE_DEFAULT_VALUES;
export declare class TreasuryVote {
    static readonly CONTRACT_NAME = "Zrx Treasury";
    static readonly MESSAGE_STRUCT_NAME = "TreasuryVote";
    static readonly MESSAGE_STRUCT_ABI: {
        type: string;
        name: string;
    }[];
    static readonly MESSAGE_TYPE_HASH: string;
    static readonly DOMAIN_STRUCT_NAME = "EIP712Domain";
    static readonly DOMAIN_TYPE_HASH: string;
    proposalId: BigNumber;
    support: boolean;
    operatedPoolIds: string[];
    chainId: number;
    version: string;
    verifyingContract: string;
    constructor(fields?: Partial<TreasuryVoteFields>);
    getDomainHash(): string;
    getStructHash(): string;
    getEIP712Hash(): string;
    getSignatureWithKey(privateKey: string): Signature;
}
export {};
//# sourceMappingURL=treasury_votes.d.ts.map