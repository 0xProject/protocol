import { EIP712DataField, EIP712Domain } from '../types';

const NAME_TO_TYPES: Record<string, string> = {
    name: 'string',
    version: 'string',
    chainId: 'uint256',
    verifyingContract: 'address',
    salt: 'bytes32',
};

export const extractEIP712DomainType = (domain: EIP712Domain): { EIP712Domain: EIP712DataField[] } => {
    const fields = Object.keys(domain).map((name) => ({ name, type: NAME_TO_TYPES[name] }));
    return {
        EIP712Domain: fields,
    };
};
