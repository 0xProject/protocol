import { blockchainTests, expect } from '@0x/contracts-test-utils';
import { hexUtils } from '@0x/utils';
import * as ethjs from 'ethereumjs-util';

import { eip712SignHashWithKey, ethSignHashWithKey, RevertErrors, SignatureType } from '@0x/protocol-utils';

import { artifacts } from './artifacts';
import { TestLibSignatureContract } from './wrappers';

const EMPTY_REVERT = 'reverted with no data';

blockchainTests.resets('LibSignature library', env => {
    let testLib: TestLibSignatureContract;
    let signerKey: string;
    let signer: string;

    before(async () => {
        signerKey = hexUtils.random();
        signer = ethjs.bufferToHex(ethjs.privateToAddress(ethjs.toBuffer(signerKey)));
        testLib = await TestLibSignatureContract.deployFrom0xArtifactAsync(
            artifacts.TestLibSignature,
            env.provider,
            env.txDefaults,
            artifacts,
        );
    });

    describe('getSignerOfHash()', () => {
        it('can recover the signer of an EIP712 signature', async () => {
            const hash = hexUtils.random();
            const sig = eip712SignHashWithKey(hash, signerKey);
            const recovered = await testLib.getSignerOfHash(hash, sig).callAsync();
            expect(recovered).to.eq(signer);
        });

        it('can recover the signer of an EthSign signature', async () => {
            const hash = hexUtils.random();
            const sig = ethSignHashWithKey(hash, signerKey);
            const recovered = await testLib.getSignerOfHash(hash, sig).callAsync();
            expect(recovered).to.eq(signer);
        });

        it('throws if the signature type is out of range', async () => {
            const hash = hexUtils.random();
            const badType = (Object.values(SignatureType).slice(-1)[0] as number) + 1;
            const sig = {
                ...ethSignHashWithKey(hash, signerKey),
                signatureType: badType,
            };
            return expect(testLib.getSignerOfHash(hash, sig).callAsync()).to.be.rejectedWith(EMPTY_REVERT);
        });

        it('throws if the signature data is malformed', async () => {
            const hash = hexUtils.random();
            const sig = {
                ...ethSignHashWithKey(hash, signerKey),
                v: 1,
            };
            return expect(testLib.getSignerOfHash(hash, sig).callAsync()).to.revertWith(
                new RevertErrors.Signatures.SignatureValidationError(
                    RevertErrors.Signatures.SignatureValidationErrorCodes.BadSignatureData,
                    hash,
                ),
            );
        });

        it('throws if an EC value is out of range', async () => {
            const hash = hexUtils.random();
            const sig = {
                ...ethSignHashWithKey(hash, signerKey),
                r: '0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141',
            };
            return expect(testLib.getSignerOfHash(hash, sig).callAsync()).to.revertWith(
                new RevertErrors.Signatures.SignatureValidationError(
                    RevertErrors.Signatures.SignatureValidationErrorCodes.BadSignatureData,
                    hash,
                ),
            );
        });

        it('throws if the type is Illegal', async () => {
            const hash = hexUtils.random();
            const sig = {
                ...ethSignHashWithKey(hash, signerKey),
                signatureType: SignatureType.Illegal,
            };
            return expect(testLib.getSignerOfHash(hash, sig).callAsync()).to.revertWith(
                new RevertErrors.Signatures.SignatureValidationError(
                    RevertErrors.Signatures.SignatureValidationErrorCodes.Illegal,
                    hash,
                ),
            );
        });

        it('throws if the type is Invalid', async () => {
            const hash = hexUtils.random();
            const sig = {
                ...ethSignHashWithKey(hash, signerKey),
                signatureType: SignatureType.Invalid,
            };
            return expect(testLib.getSignerOfHash(hash, sig).callAsync()).to.revertWith(
                new RevertErrors.Signatures.SignatureValidationError(
                    RevertErrors.Signatures.SignatureValidationErrorCodes.AlwaysInvalid,
                    hash,
                ),
            );
        });
    });
});
