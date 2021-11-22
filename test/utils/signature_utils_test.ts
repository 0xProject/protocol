// tslint:disable:custom-no-magic-numbers
// tslint:disable:max-file-line-count

import { expect } from '@0x/contracts-test-utils';
import { eip712SignTypedDataWithKey, ethSignHashWithKey, LimitOrder, OtcOrder } from '@0x/protocol-utils';

import { getSignerFromHash } from '../../src/utils/signature_utils';

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
            expect(signer).to.eq(address.toLowerCase());
        });

        it('should recover an address for an EIP712 Signature', () => {
            // Given
            const otcOrder = new OtcOrder();
            const orderHash = otcOrder.getHash();
            const signature = eip712SignTypedDataWithKey(otcOrder.getEIP712TypedData(), privateKey);

            // When
            const signer = getSignerFromHash(orderHash, signature);

            // Then
            expect(signer).to.eq(address.toLowerCase());
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
            expect(signer.toLowerCase()).to.not.eq(address.toLowerCase());
        });
    });
});
