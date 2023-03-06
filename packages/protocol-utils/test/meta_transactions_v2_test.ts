import { chaiSetup, } from '@0x/dev-utils';
import { BigNumber } from '@0x/utils';
import { expect } from 'chai';
import { MetaTransactionV2 } from '../src/meta_transactions_v2';

chaiSetup.configure();

describe('mtxs v2', () => {
    describe('MetaTransactionV2 (no fees)', () => {
        const mtx = new MetaTransactionV2({
            signer: '0x349e8d89e8b37214d9ce3949fc5754152c525bc3',
            sender: '0x83c62b2e67dea0df2a27be0def7a22bd7102642c',
            expirationTimeSeconds: new BigNumber(9101112),
            salt: new BigNumber(2001),
            callData: '0x12345678',
            feeToken: '0xcc3c7ea403427154ec908203ba6c418bd699f7ce',
            fees: [] as any,
            chainId: 8008,
            verifyingContract: '0x6701704d2421c64ee9aa93ec7f96ede81c4be77d',
        });

        it('can get the struct hash', () => {
            const actual = mtx.getStructHash();
            const expected = '0x57db4055edfed82a6d86103197c21390bf29412fb4585e08c708454e03d92516';
            expect(actual).to.eq(expected);
        });

        it('can get the EIP712 hash', () => {
            const actual = mtx.getHash();
            const expected = '0x05fc975cb9f37cc442a2975bc479502ce33d2d068fe8a1d6f50dbb11c1499137';
            expect(actual).to.eq(expected);
        });
    });

    describe('MetaTransactionV2 (two fees)', () => {
        const mtx = new MetaTransactionV2({
            signer: '0x349e8d89e8b37214d9ce3949fc5754152c525bc3',
            sender: '0x83c62b2e67dea0df2a27be0def7a22bd7102642c',
            expirationTimeSeconds: new BigNumber(9101112),
            salt: new BigNumber(2001),
            callData: '0x12345678',
            feeToken: '0xcc3c7ea403427154ec908203ba6c418bd699f7ce',
            fees: [{
                recipient: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                amount: new BigNumber(1000000),
            }, {
                recipient: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
                amount: new BigNumber(1000),
            }] as any,
            chainId: 8008,
            verifyingContract: '0x6701704d2421c64ee9aa93ec7f96ede81c4be77d',
        });

        it('can get the struct hash', () => {
            const actual = mtx.getStructHash();
            const expected = '0x441c8b8a8f25c1716f2880326d008d07d0b8eb9606623c0a81dd5d9fa14dd12e';
            expect(actual).to.eq(expected);
        });

        it('can get the EIP712 hash', () => {
            const actual = mtx.getHash();
            const expected = '0xfc85ef2149bd49fcc8fee2571ed8f0ecd671dec03845637ab1ded3d891ac3386';
            expect(actual).to.eq(expected);
        });
    });
});
