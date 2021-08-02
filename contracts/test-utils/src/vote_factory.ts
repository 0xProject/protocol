import { eip712Utils, generatePseudoRandomSalt } from '@0x/order-utils';
import {
    ECSignature,
    EIP712DomainWithDefaultSchema,
    EIP712TypedData,
    SignatureType,
} from '@0x/types';
import { BigNumber, signTypedDataUtils } from '@0x/utils';
import * as ethUtil from 'ethereumjs-util';
import * as _ from 'lodash';

import { constants } from './constants';
import { signingUtils } from './signing_utils';

// TODO(Cece): move to 0x/types repo
interface ZeroExVote {
    proposalId: BigNumber;
    support: boolean;
    operatedPoolIds: number[];
}

// TODO(Cece): move to 0x/types repo
interface SignedZeroExVote extends ZeroExVote {
    signature: string;
}

export class VoteFactory {
    private readonly _delegatorBuff: Buffer;
    private readonly _relayerBuff: Buffer;
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
        delegatorBuff: Buffer,
        delegatorPrivateKey: Buffer,
        relayerBuff: Buffer,
        contractName: string,
        chainId: number,
        verifyingContract: string,
    ) {
        this._delegatorBuff = delegatorBuff;
        this._relayerBuff = relayerBuff;
        this._delegatorPrivateKey = delegatorPrivateKey;
        this._domain = {name: contractName, chainId, verifyingContract};
    }

    public async newSignedZeroExVoteAsync(
        vote: ZeroExVote,
        signatureType: SignatureType = SignatureType.EIP712,
    ): Promise<SignedZeroExVote> {
        const voteHashBuffer = this._getVoteHashBuffer(vote);
        const signature = signingUtils.signMessage(voteHashBuffer, this._delegatorPrivateKey, signatureType);
        const signedVote = {
            ...vote,
            signature: `0x${signature.toString('hex')}`,
        };
        return signedVote;
    }

    private _createZeroExVoteTypedData(zeroExVote: ZeroExVote): EIP712TypedData {
        // assert.isNumber('domain.chainId', zeroExVote.domain.chainId);
        // assert.isETHAddressHex('domain.verifyingContract', zeroExTransaction.domain.verifyingContract);
        // assert.doesConformToSchema('zeroExTransaction', zeroExTransaction, schemas.zeroExTransactionSchema);
        const normalizedVote = _.mapValues(zeroExVote, value => {
            return !_.isString(value) ? value.toString() : value;
        });
        const typedData = eip712Utils.createTypedData(
            // TODO(how to define schema)
            constants.ZEROEX_VOTE_SCHEMA.name,
            { ZeroExVote: constants.ZEROEX_VOTE_SCHEMA.parameters },
            normalizedVote,
            this._domain,
        );
        return typedData;
    }

    private _getVoteHashBuffer(vote: ZeroExVote | SignedZeroExVote): Buffer {
        const typedData = this._createZeroExVoteTypedData(vote);
        const transactionHashBuff = signTypedDataUtils.generateTypedDataHash(typedData);
        return transactionHashBuff;
    }
}

// TODO(Cece): move to better place
export function parseSignatureHexAsRSV(signatureHex: string): ECSignature {
    const { v, r, s } = ethUtil.fromRpcSig(signatureHex);
    const ecSignature: ECSignature = {
        v,
        r: ethUtil.bufferToHex(r),
        s: ethUtil.bufferToHex(s),
    };
    return ecSignature;
}
