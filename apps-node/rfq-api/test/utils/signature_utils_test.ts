import { eip712SignTypedDataWithKey, ethSignHashWithKey, LimitOrder, OtcOrder } from '@0x/protocol-utils';

import { getSignerFromHash, padSignature } from '../../src/utils/signature_utils';

const address = '0xdA9AC423442169588DE6b4305f4E820D708d0cE5';
const privateKey = '0x653fa328df81be180b58e42737bc4cef037a19a3b9673b15d20ee2eebb2e509d';

describe('Signature utils', () => {
    describe('getSignerFromHash', () => {
        it('should recover an address for an EthSign Signature', () => {
            // Given
            const otcOrder = new OtcOrder();
            const orderHash = otcOrder.getHash();
            const signature = ethSignHashWithKey(orderHash, privateKey);

            // When
            const signer = getSignerFromHash(orderHash, signature);

            // Then
            expect(signer).toEqual(address.toLowerCase());
        });

        it('should recover an address for an EIP712 Signature', () => {
            // Given
            const otcOrder = new OtcOrder();
            const orderHash = otcOrder.getHash();
            const signature = eip712SignTypedDataWithKey(otcOrder.getEIP712TypedData(), privateKey);

            // When
            const signer = getSignerFromHash(orderHash, signature);

            // Then
            expect(signer).toEqual(address.toLowerCase());
        });

        it('should not recover an address when signature is for something else', () => {
            // Given
            const limitOrder = new LimitOrder();
            const limitOrderHash = limitOrder.getHash();
            const signatureForLimitOrder = ethSignHashWithKey(limitOrderHash, privateKey);

            const otcOrder = new OtcOrder();
            const otcOrderHash = otcOrder.getHash();

            // When
            const signer = getSignerFromHash(otcOrderHash, signatureForLimitOrder);

            // Then
            expect(signer.toLowerCase()).not.toEqual(address.toLowerCase());
        });
    });
    describe('padSignature', () => {
        it("doesn't modify valid signatures", () => {
            const validSignature = {
                r: '0x9168c21566a9846ad80ef8c27a199d4855a5245dfee5e9453300e6dd5d659ca6',
                s: '0x0c74487fba706194d030cce9c8b5d712e698326731f4e6d603251b7a1eeca084',
                v: 28,
                signatureType: 3,
            };

            const result = padSignature(validSignature);

            expect(validSignature).toEqual(result);
        });

        it('pads a signature missing bytes', () => {
            const signature = {
                r: '0x59ca6',
                s: '0Xeca084',
                v: 28,
                signatureType: 3,
            };

            const result = padSignature(signature);

            expect(result).toEqual({
                r: '0x0000000000000000000000000000000000000000000000000000000000059ca6',
                s: '0x0000000000000000000000000000000000000000000000000000000000eca084',
                v: 28,
                signatureType: 3,
            });
        });
    });
});
