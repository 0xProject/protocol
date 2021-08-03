import { assert } from '@0x/assert';
import { schemas } from '@0x/json-schemas';
import { eip712Utils } from '@0x/order-utils';
import { ECSignature, EIP712DomainWithDefaultSchema, EIP712TypedData, SignatureType } from '@0x/types';
import { BigNumber, signTypedDataUtils } from '@0x/utils';
import * as ethUtil from 'ethereumjs-util';
import * as _ from 'lodash';

import { constants } from './constants';
import { signingUtils } from './signing_utils';
import { SignedZeroExVote, ZeroExVote } from './types';

export class VoteFactory {
    private readonly _delegatorPrivateKey: Buffer;
    private readonly _domain: EIP712DomainWithDefaultSchema;

    public static newZeroExVote(
        proposalId: BigNumber,
        support: boolean,
        operatedPoolIds: number[],
    ): ZeroExVote {
        return {
            proposalId,
            support,
            operatedPoolIds,
        };
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

    public async newSignedZeroExVoteAsync(
        vote: ZeroExVote,
        signatureType: SignatureType = SignatureType.EIP712,
    ): Promise<SignedZeroExVote> {
        const voteHashBuffer = this._getVoteHashBuffer(vote);
        const signature = signingUtils.signMessage(voteHashBuffer, this._delegatorPrivateKey, signatureType);
        return {
            ...vote,
            signature: `0x${signature.toString('hex')}`,
        };
    }

    private _getVoteHashBuffer(vote: ZeroExVote | SignedZeroExVote): Buffer {
        const typedData = this._createZeroExVoteTypedData(vote);
        return signTypedDataUtils.generateTypedDataHash(typedData);
    }

    private _createZeroExVoteTypedData(zeroExVote: ZeroExVote): EIP712TypedData {
        assert.doesConformToSchema('ZeroExVote', zeroExVote, schemas.ZeroExVote); // TODO(need to bump @0x/json-schemas first?)
        const normalizedVote = _.mapValues(zeroExVote, value => {
            return !_.isString(value) ? value.toString() : value;
        });
        return eip712Utils.createTypedData(
            // TODO(need to bump @0x/json-schemas first?)
            constants.ZEROEX_VOTE_SCHEMA.name,
            { ZeroExVote: constants.ZEROEX_VOTE_SCHEMA.parameters },
            normalizedVote,
            this._domain,
        );
    }
}

// TODO(Cece): move to better place
export function parseSignatureHexAsRSV(signatureHex: string): ECSignature {
    const { v, r, s } = ethUtil.fromRpcSig(signatureHex);
    return {
        v,
        r: ethUtil.bufferToHex(r),
        s: ethUtil.bufferToHex(s),
    };
}
