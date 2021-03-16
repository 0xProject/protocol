"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const contracts_test_utils_1 = require("@0x/contracts-test-utils");
const utils_1 = require("@0x/utils");
const ethjs = require("ethereumjs-util");
const protocol_utils_1 = require("@0x/protocol-utils");
const artifacts_1 = require("./artifacts");
const wrappers_1 = require("./wrappers");
const EMPTY_REVERT = 'reverted with no data';
contracts_test_utils_1.blockchainTests.resets('LibSignature library', env => {
    let testLib;
    let signerKey;
    let signer;
    before(() => __awaiter(this, void 0, void 0, function* () {
        signerKey = utils_1.hexUtils.random();
        signer = ethjs.bufferToHex(ethjs.privateToAddress(ethjs.toBuffer(signerKey)));
        testLib = yield wrappers_1.TestLibSignatureContract.deployFrom0xArtifactAsync(artifacts_1.artifacts.TestLibSignature, env.provider, env.txDefaults, artifacts_1.artifacts);
    }));
    describe('getSignerOfHash()', () => {
        it('can recover the signer of an EIP712 signature', () => __awaiter(this, void 0, void 0, function* () {
            const hash = utils_1.hexUtils.random();
            const sig = protocol_utils_1.eip712SignHashWithKey(hash, signerKey);
            const recovered = yield testLib.getSignerOfHash(hash, sig).callAsync();
            contracts_test_utils_1.expect(recovered).to.eq(signer);
        }));
        it('can recover the signer of an EthSign signature', () => __awaiter(this, void 0, void 0, function* () {
            const hash = utils_1.hexUtils.random();
            const sig = protocol_utils_1.ethSignHashWithKey(hash, signerKey);
            const recovered = yield testLib.getSignerOfHash(hash, sig).callAsync();
            contracts_test_utils_1.expect(recovered).to.eq(signer);
        }));
        it('throws if the signature type is out of range', () => __awaiter(this, void 0, void 0, function* () {
            const hash = utils_1.hexUtils.random();
            const badType = Object.values(protocol_utils_1.SignatureType).slice(-1)[0] + 1;
            const sig = Object.assign({}, protocol_utils_1.ethSignHashWithKey(hash, signerKey), { signatureType: badType });
            return contracts_test_utils_1.expect(testLib.getSignerOfHash(hash, sig).callAsync()).to.be.rejectedWith(EMPTY_REVERT);
        }));
        it('throws if the signature data is malformed', () => __awaiter(this, void 0, void 0, function* () {
            const hash = utils_1.hexUtils.random();
            const sig = Object.assign({}, protocol_utils_1.ethSignHashWithKey(hash, signerKey), { v: 1 });
            return contracts_test_utils_1.expect(testLib.getSignerOfHash(hash, sig).callAsync()).to.revertWith(new protocol_utils_1.RevertErrors.Signatures.SignatureValidationError(protocol_utils_1.RevertErrors.Signatures.SignatureValidationErrorCodes.BadSignatureData, hash));
        }));
        it('throws if an EC value is out of range', () => __awaiter(this, void 0, void 0, function* () {
            const hash = utils_1.hexUtils.random();
            const sig = Object.assign({}, protocol_utils_1.ethSignHashWithKey(hash, signerKey), { r: '0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141' });
            return contracts_test_utils_1.expect(testLib.getSignerOfHash(hash, sig).callAsync()).to.revertWith(new protocol_utils_1.RevertErrors.Signatures.SignatureValidationError(protocol_utils_1.RevertErrors.Signatures.SignatureValidationErrorCodes.BadSignatureData, hash));
        }));
        it('throws if the type is Illegal', () => __awaiter(this, void 0, void 0, function* () {
            const hash = utils_1.hexUtils.random();
            const sig = Object.assign({}, protocol_utils_1.ethSignHashWithKey(hash, signerKey), { signatureType: protocol_utils_1.SignatureType.Illegal });
            return contracts_test_utils_1.expect(testLib.getSignerOfHash(hash, sig).callAsync()).to.revertWith(new protocol_utils_1.RevertErrors.Signatures.SignatureValidationError(protocol_utils_1.RevertErrors.Signatures.SignatureValidationErrorCodes.Illegal, hash));
        }));
        it('throws if the type is Invalid', () => __awaiter(this, void 0, void 0, function* () {
            const hash = utils_1.hexUtils.random();
            const sig = Object.assign({}, protocol_utils_1.ethSignHashWithKey(hash, signerKey), { signatureType: protocol_utils_1.SignatureType.Invalid });
            return contracts_test_utils_1.expect(testLib.getSignerOfHash(hash, sig).callAsync()).to.revertWith(new protocol_utils_1.RevertErrors.Signatures.SignatureValidationError(protocol_utils_1.RevertErrors.Signatures.SignatureValidationErrorCodes.AlwaysInvalid, hash));
        }));
    });
});
//# sourceMappingURL=lib_signature_test.js.map