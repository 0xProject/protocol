// tslint:disable: custom-no-magic-numbers
import { EIP_712_REGISTRY } from '../../src/eip712registry';
import { extractEIP712DomainType, getSortedEip712Domain, getZeroExEip712Domain } from '../../src/utils/Eip712Utils';

describe('eip712Utils', () => {
    describe('extractEIP712DomainType', () => {
        it('extracts the EIP712Domain type from the domain for the USDC token on polygon', () => {
            const token = '0x2791bca1f2de4661ed88a30c99a7a9449aa84174'; // USDC
            const { domain } = EIP_712_REGISTRY[137][token];
            const result = extractEIP712DomainType(domain);
            expect(result).toEqual({
                EIP712Domain: [
                    { name: 'name', type: 'string' },
                    { name: 'version', type: 'string' },
                    { name: 'verifyingContract', type: 'address' },
                    { name: 'salt', type: 'bytes32' },
                ],
            });
        });

        it('extracts the EIP712Domain type from the domain for the BANANA token on polygon', () => {
            const token = '0x5d47baba0d66083c52009271faf3f50dcc01023c'; // BANANA
            const { domain } = EIP_712_REGISTRY[137][token];
            const result = extractEIP712DomainType(domain);
            expect(result).toEqual({
                EIP712Domain: [
                    { name: 'name', type: 'string' },
                    { name: 'version', type: 'string' },
                    { name: 'chainId', type: 'uint256' },
                    { name: 'verifyingContract', type: 'address' },
                ],
            });
        });
    });

    describe('getZeroExEip712Domain', () => {
        it('gets 0x EIP 712 domain', () => {
            const result = getZeroExEip712Domain(1);
            // `toEqual` does not check field ordering
            expect(result).toEqual({
                name: 'ZeroEx',
                version: '1.0.0',
                chainId: 1,
                verifyingContract: '0xdef1c0ded9bec7f1a1670819833240f027b25eff',
            });
            // Check field ordering
            expect(Object.keys(result)).toEqual(['name', 'version', 'chainId', 'verifyingContract']);
        });
    });

    describe('getSortedEip712Domain', () => {
        const result = getSortedEip712Domain({
            version: '1.0.0',
            chainId: 1,
            name: '0x',
            verifyingContract: '0x12345',
        });
        // `toEqual` does not check field ordering
        expect(result).toEqual({
            version: '1.0.0',
            chainId: 1,
            name: '0x',
            verifyingContract: '0x12345',
        });
        // Check field ordering
        expect(Object.keys(result)).toEqual(['name', 'version', 'chainId', 'verifyingContract']);
    });
});
