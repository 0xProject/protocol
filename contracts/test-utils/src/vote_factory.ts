import { Vote } from '@0x/contracts-treasury/src/votes';
import { eip712SignHashWithKey } from '@0x/protocol-utils';
import { EIP712DomainWithDefaultSchema } from '@0x/types';
import { BigNumber, signTypedDataUtils } from '@0x/utils';

import { SignedZeroExVote, ZeroExVote } from './types';

export class VoteFactory {
    private readonly _delegatorPrivateKey: Buffer;
    private readonly _domain: EIP712DomainWithDefaultSchema;

    public static newZeroExVote(
        proposalId: BigNumber,
        support: boolean,
        operatedPoolIds: string[],
        chainId: number,
        verifyingContract: string,
    ): ZeroExVote {
        return {
            proposalId,
            support,
            operatedPoolIds,
            chainId,
            verifyingContract,
        };
    }

    private static _getVoteHashBuffer(vote: ZeroExVote | SignedZeroExVote): Buffer {
        const voteObj = new Vote({
            proposalId: vote.proposalId,
            support: vote.support,
            operatedPoolIds: vote.operatedPoolIds,
            chainId: vote.chainId,
            verifyingContract: vote.verifyingContract,
        });
        const typedData = voteObj.getEIP712TypedData();
        return signTypedDataUtils.generateTypedDataHash(typedData);
    }

    constructor(
        delegatorPrivateKey: Buffer,
        contractName: string,
        chainId: number,
        verifyingContract: string,
    ) {
        this._delegatorPrivateKey = delegatorPrivateKey;
        this._domain = {name: contractName, chainId, verifyingContract};
    }

    public async newSignedZeroExVoteAsync(vote: ZeroExVote): Promise<SignedZeroExVote> {
        const voteHashBuffer = VoteFactory._getVoteHashBuffer(vote);
        const signature = eip712SignHashWithKey(`0x${voteHashBuffer.toString('hex')}`, this._delegatorPrivateKey.toString());
        return {
            ...vote,
            ...signature,
        };
    }
}
