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
const utils_1 = require("@0x/utils");
const chai_1 = require("chai");
const ethjs = require("ethereumjs-util");
const meta_transactions_1 = require("../src/meta_transactions");
const signature_utils_1 = require("../src/signature_utils");
dev_utils_1.chaiSetup.configure();
describe('mtxs', () => {
    let provider;
    let providerMaker;
    const key = '0xee094b79aa0315914955f2f09be9abe541dcdc51f0aae5bec5453e9f73a471a6';
    const keyMaker = ethjs.bufferToHex(ethjs.privateToAddress(ethjs.toBuffer(key)));
    before(() => __awaiter(this, void 0, void 0, function* () {
        provider = dev_utils_1.web3Factory.getRpcProvider({ shouldUseInProcessGanache: true });
        [providerMaker] = yield new dev_utils_1.Web3Wrapper(provider).getAvailableAddressesAsync();
    }));
    describe('MetaTransaction', () => {
        const mtx = new meta_transactions_1.MetaTransaction({
            signer: '0x349e8d89e8b37214d9ce3949fc5754152c525bc3',
            sender: '0x83c62b2e67dea0df2a27be0def7a22bd7102642c',
            minGasPrice: new utils_1.BigNumber(1234),
            maxGasPrice: new utils_1.BigNumber(5678),
            expirationTimeSeconds: new utils_1.BigNumber(9101112),
            salt: new utils_1.BigNumber(2001),
            callData: '0x12345678',
            value: new utils_1.BigNumber(1001),
            feeToken: '0xcc3c7ea403427154ec908203ba6c418bd699f7ce',
            feeAmount: new utils_1.BigNumber(9101112),
            chainId: 8008,
            verifyingContract: '0x6701704d2421c64ee9aa93ec7f96ede81c4be77d',
        });
        it('can get the struct hash', () => {
            const actual = mtx.getStructHash();
            const expected = '0x164b8bfaed3718d233d4cc87501d0d8fa0a72ed7deeb8e591524133f17867180';
            chai_1.expect(actual).to.eq(expected);
        });
        it('can get the EIP712 hash', () => {
            const actual = mtx.getHash();
            const expected = '0x068f2f98836e489070608461768bfd3331128787d09278d38869c2b56bfc34a4';
            chai_1.expect(actual).to.eq(expected);
        });
        it('can get an EthSign signature with a provider', () => __awaiter(this, void 0, void 0, function* () {
            const actual = yield mtx.clone({ signer: providerMaker }).getSignatureWithProviderAsync(provider);
            const expected = {
                signatureType: signature_utils_1.SignatureType.EthSign,
                r: '0xbb831776a2d6639d4e4d1641f158773ce202881bac74dddb2672d5ff5521ef5c',
                s: '0x746a61ccfdfee3afae15f4a3bd67ded2ce555d89d482940a844eeffaede2ee8a',
                v: 27,
            };
            chai_1.expect(actual).to.deep.eq(expected);
        }));
        it('can get an EthSign signature with a private key', () => {
            const actual = mtx.clone({ signer: keyMaker }).getSignatureWithKey(key);
            const expected = {
                signatureType: signature_utils_1.SignatureType.EthSign,
                r: '0xbf19b5ef62df8c8315727087e9d8562e3b88d32452ac8193e3ed9f5354a220ef',
                s: '0x512387e81b2c03e4bc4cf72ee5293c86498c17fde3ae89f18dd0705076a7f472',
                v: 28,
            };
            chai_1.expect(actual).to.deep.eq(expected);
        });
        it('can get an EIP712 signature with a private key', () => {
            const actual = mtx.clone({ signer: keyMaker }).getSignatureWithKey(key, signature_utils_1.SignatureType.EIP712);
            const expected = {
                signatureType: signature_utils_1.SignatureType.EIP712,
                r: '0x050c6b80a3fafa1b816fdfd646f3e90862a21d3fbf3ed675eaf9c89e092ec405',
                s: '0x179600bd412820233598628b85b58f1e9f6da4555421f45266ec2ebf94153d1d',
                v: 27,
            };
            chai_1.expect(actual).to.deep.eq(expected);
        });
    });
});
//# sourceMappingURL=meta_transactions_test.js.map