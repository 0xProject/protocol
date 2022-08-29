import { Eip712DataField, Eip712Domain } from '../types';

const NAME_TO_TYPES: Record<string, string> = {
    name: 'string',
    version: 'string',
    chainId: 'uint256',
    verifyingContract: 'address',
    salt: 'bytes32',
};

// Beware, we use Eip lowercase in our code, but we must use "EIP" in caps to adhere
// to eth_signTypedData_v4. Confusingly, ethers.js does not accept the EIP712Domain type,
// but it's easier to delete this value than create it
export const extractEIP712DomainType = (domain: Eip712Domain): { EIP712Domain: Eip712DataField[] } => {
    const fields = Object.keys(domain).map((name) => ({ name, type: NAME_TO_TYPES[name] }));
    return {
        EIP712Domain: fields,
    };
};
