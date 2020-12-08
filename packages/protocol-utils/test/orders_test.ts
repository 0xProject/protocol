import { chaiSetup, web3Factory, Web3Wrapper } from '@0x/dev-utils';
import { Web3ProviderEngine } from '@0x/subproviders';
import { BigNumber } from '@0x/utils';
import { expect } from 'chai';
import * as ethjs from 'ethereumjs-util';

import { LimitOrder, RfqOrder } from '../src/orders';
import { SignatureType } from '../src/signature_utils';

chaiSetup.configure();

describe('orders', () => {
    let provider: Web3ProviderEngine;
    let providerMaker: string;
    const key = '0xee094b79aa0315914955f2f09be9abe541dcdc51f0aae5bec5453e9f73a471a6';
    const keyMaker = ethjs.bufferToHex(ethjs.privateToAddress(ethjs.toBuffer(key)));

    before(async () => {
        provider = web3Factory.getRpcProvider({ shouldUseInProcessGanache: true });
        [providerMaker] = await new Web3Wrapper(provider).getAvailableAddressesAsync();
    });

    describe('LimitOrder', () => {
        const order = new LimitOrder({
            makerToken: '0x349e8d89e8b37214d9ce3949fc5754152c525bc3',
            takerToken: '0x83c62b2e67dea0df2a27be0def7a22bd7102642c',
            makerAmount: new BigNumber(1234),
            takerAmount: new BigNumber(5678),
            takerTokenFeeAmount: new BigNumber(9101112),
            maker: '0x8d5e5b5b5d187bdce2e0143eb6b3cc44eef3c0cb',
            taker: '0x615312fb74c31303eab07dea520019bb23f4c6c2',
            sender: '0x70f2d6c7acd257a6700d745b76c602ceefeb8e20',
            feeRecipient: '0xcc3c7ea403427154ec908203ba6c418bd699f7ce',
            pool: '0x0bbff69b85a87da39511aefc3211cb9aff00e1a1779dc35b8f3635d8b5ea2680',
            expiry: new BigNumber(1001),
            salt: new BigNumber(2001),
            chainId: 8008,
            verifyingContract: '0x6701704d2421c64ee9aa93ec7f96ede81c4be77d',
        });

        it('can get the struct hash', () => {
            const actual = order.getStructHash();
            const expected = '0x05a78607ce1eafbbe994f04f8f0ae718d971bf420f089163ed8e7a022e95e468';
            expect(actual).to.eq(expected);
        });

        it('can get the EIP712 hash', () => {
            const actual = order.getHash();
            const expected = '0x8bb1f6e880b3b4f91a901897c4b914ec606dc3b8b59f64983e1638a45bdf3116';
            expect(actual).to.deep.eq(expected);
        });

        it('can get an EthSign signature with a provider', async () => {
            const actual = await order.clone({ maker: providerMaker }).getSignatureWithProviderAsync(provider);
            const expected = {
                signatureType: SignatureType.EthSign,
                r: '0xbd5bb603cc48c5f777f0d34c2012aa779942ac48c355d30d85acc108819e8a8f',
                s: '0x576e17adc9482fb5eda95cd4543e5ed4978990d2caab4c6f92e09e2fa6157d7b',
                v: 27,
            };
            expect(actual).to.deep.eq(expected);
        });

        it('can get an EthSign signature with a private key', () => {
            const actual = order.clone({ maker: keyMaker }).getSignatureWithKey(key);
            const expected = {
                signatureType: SignatureType.EthSign,
                r: '0x5d4fe9b4c8f94efc46ef9e7e3f996c238f9c930fd5c03014ec6db6d4d18a34e5',
                s: '0x0949269d29524aec1ba5b19236c392a3d1866ca39bb8c7b6345e90a3fbf404fc',
                v: 28,
            };
            expect(actual).to.deep.eq(expected);
        });

        it('can get an EIP712 signature with a private key', () => {
            const actual = order.clone({ maker: keyMaker }).getSignatureWithKey(key, SignatureType.EIP712);
            const expected = {
                signatureType: SignatureType.EIP712,
                r: '0x030e27e0a261dda1139154d9ba7e814932bd6b8d15231a8c2cd78d634ff22c2b',
                s: '0x50af45e0d6e81b721905bd35748168f1f348be34fe03073d7a2f2b053cbdca2d',
                v: 27,
            };
            expect(actual).to.deep.eq(expected);
        });
    });

    describe('RfqOrder', () => {
        const order = new RfqOrder({
            makerToken: '0x349e8d89e8b37214d9ce3949fc5754152c525bc3',
            takerToken: '0x83c62b2e67dea0df2a27be0def7a22bd7102642c',
            makerAmount: new BigNumber(1234),
            takerAmount: new BigNumber(5678),
            maker: '0x8d5e5b5b5d187bdce2e0143eb6b3cc44eef3c0cb',
            taker: '0x615312fb74c31303eab07dea520019bb23f4c6c2',
            txOrigin: '0x70f2d6c7acd257a6700d745b76c602ceefeb8e20',
            pool: '0x0bbff69b85a87da39511aefc3211cb9aff00e1a1779dc35b8f3635d8b5ea2680',
            expiry: new BigNumber(1001),
            salt: new BigNumber(2001),
            chainId: 8008,
            verifyingContract: '0x6701704d2421c64ee9aa93ec7f96ede81c4be77d',
        });

        it('can get the struct hash', () => {
            const actual = order.getStructHash();
            const expected = '0x995b6261fa93cd5acd5121f404305f8e9f9c388723f3e53fb05bd5eb534b4899';
            expect(actual).to.eq(expected);
        });

        it('can get the EIP712 hash', () => {
            const actual = order.getHash();
            const expected = '0xb4c40524740dcc4030a62b6d9afe740f6ca24508e59ef0c5bd99d5649a430885';
            expect(actual).to.deep.eq(expected);
        });

        it('can get an EthSign signature with a provider', async () => {
            const actual = await order.clone({ maker: providerMaker }).getSignatureWithProviderAsync(provider);
            const expected = {
                signatureType: SignatureType.EthSign,
                r: '0xed555259efe38e2d679f7bc18385e51ce158576ced6c11630f67ba37b3e59a29',
                s: '0x769211cf3e86b254e3755e1dcf459f5b362ca1c42ec3cf08841d90cb44f2a8e4',
                v: 27,
            };
            expect(actual).to.deep.eq(expected);
        });

        it('can get an EthSign signature with a private key', () => {
            const actual = order.clone({ maker: keyMaker }).getSignatureWithKey(key);
            const expected = {
                signatureType: SignatureType.EthSign,
                r: '0xba231f67168d6d1fd2b83e0a3a6b1663ec493b98a8dbe34689c8e8171972522f',
                s: '0x47023a5f73b5f638e9a138de26b35e59847680bee78af0c8251de532e7c39d8b',
                v: 28,
            };
            expect(actual).to.deep.eq(expected);
        });

        it('can get an EIP712 signature with a private key', () => {
            const actual = order.clone({ maker: keyMaker }).getSignatureWithKey(key, SignatureType.EIP712);
            const expected = {
                signatureType: SignatureType.EIP712,
                r: '0x824d70ae7cccea382ddd51f773f9745abb928dadbccebbd090ca371d7b8fb741',
                s: '0x7557a009f7cfa207d19a8fd42950458340de718a7b35522051cde6f75ad42cba',
                v: 27,
            };
            expect(actual).to.deep.eq(expected);
        });
    });
});
