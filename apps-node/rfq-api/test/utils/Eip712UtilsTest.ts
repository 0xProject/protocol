// tslint:disable: custom-no-magic-numbers
import { EIP_712_REGISTRY } from '../../src/eip712registry';
import { extractEIP712DomainType } from '../../src/utils/Eip712Utils';

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
