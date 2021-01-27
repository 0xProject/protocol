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
const dev_utils_1 = require("@0x/dev-utils");
const chai_1 = require("chai");
const signature_utils_1 = require("../src/signature_utils");
dev_utils_1.chaiSetup.configure();
describe('signature_utils', () => {
    let provider;
    let signer;
    const hash = '0x38a8da1ec749de4220312ce7fa62aaf01a6e8c1342cbce81278ae7c8885c2475';
    const key = '0xee094b79aa0315914955f2f09be9abe541dcdc51f0aae5bec5453e9f73a471a6';
    before(() => __awaiter(this, void 0, void 0, function* () {
        provider = dev_utils_1.web3Factory.getRpcProvider({ shouldUseInProcessGanache: true });
        [signer] = yield new dev_utils_1.Web3Wrapper(provider).getAvailableAddressesAsync();
    }));
    describe('ethSignHashWithProviderAsync()', () => {
        it('can sign a hash', () => __awaiter(this, void 0, void 0, function* () {
            const actual = yield signature_utils_1.ethSignHashWithProviderAsync(hash, signer, provider);
            const expected = {
                signatureType: signature_utils_1.SignatureType.EthSign,
                r: '0xc1ea77c46d7aabf3f68f29870bc61eb583f9acb25af5a953ce2bff341b4c456a',
                s: '0x66133126ef3058ec52081f9e3dd77103980483f3ab20d0529b14e4b194e7d12d',
                v: 27,
            };
            chai_1.expect(actual).to.deep.eq(expected);
        }));
    });
    describe('ethSignHashWithKey()', () => {
        it('can sign a hash', () => __awaiter(this, void 0, void 0, function* () {
            const actual = signature_utils_1.ethSignHashWithKey(hash, key);
            const expected = {
                signatureType: signature_utils_1.SignatureType.EthSign,
                r: '0xb88b49ba6418464f9b1e703ea0fbba5f9d72576a4d9819e45d4ede7a34afbe73',
                s: '0x6c81693f439942eb8c6ac943fab6b9fcc4b48615fcedcede93298f6dc3087ead',
                v: 28,
            };
            chai_1.expect(actual).to.deep.eq(expected);
        }));
    });
    describe('eip712SignHashWithKey()', () => {
        it('can sign a hash', () => __awaiter(this, void 0, void 0, function* () {
            const actual = signature_utils_1.eip712SignHashWithKey(hash, key);
            const expected = {
                signatureType: signature_utils_1.SignatureType.EIP712,
                r: '0x1a01dba0f97d151f696f689e618a8ef6c4e7610a71c2607e18b0d96c741b3e8d',
                s: '0x28fd463b90fd20cf17f16ab6831d712e9bce29619db1bef6e7802318d1de09ed',
                v: 27,
            };
            chai_1.expect(actual).to.deep.eq(expected);
        }));
    });
    describe('ecSignHashWithKey()', () => {
        it('can sign a hash', () => __awaiter(this, void 0, void 0, function* () {
            const actual = signature_utils_1.ecSignHashWithKey(hash, key);
            const expected = {
                r: '0x1a01dba0f97d151f696f689e618a8ef6c4e7610a71c2607e18b0d96c741b3e8d',
                s: '0x28fd463b90fd20cf17f16ab6831d712e9bce29619db1bef6e7802318d1de09ed',
                v: 27,
            };
            chai_1.expect(actual).to.deep.eq(expected);
        }));
    });
});
//# sourceMappingURL=signature_utils_test.js.map