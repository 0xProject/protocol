import { getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { createExchangeProxyEIP712Domain } from '@0x/protocol-utils';
import { Eip712DataField, Eip712Domain } from '../core/types';

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
    const sortedDomain = getSortedEip712Domain(domain);
    const fields = Object.keys(sortedDomain).map((name) => ({ name, type: NAME_TO_TYPES[name] }));
    return {
        EIP712Domain: fields,
    };
};

/**
 * Get 0x domain that follows the order specified in EIP-712.
 */
export const getZeroExEip712Domain = (chainId: number) => {
    const zeroExEip712Domain = createExchangeProxyEIP712Domain(
        chainId,
        getContractAddressesForChainOrThrow(chainId).exchangeProxy,
    );

    return getSortedEip712Domain(zeroExEip712Domain);
};

/**
 * Sort EIP-712 domain to follow the order specified in EIP-712.
 *
 * The field order for matters as specified in EIP-712: name, version, chainId, verifyingContract and salt (salt does not apply to 0x so we can ignore it).
 *
 * ES2015 guarantees the order of fields for an object (https://stackoverflow.com/a/23202095):
 * 1. Positive integer keys in ascending order (and strings like "1" that parse as ints)
 * 2. String keys, in insertion order
 * 3. Symbol names, in insertion order
 */
export function getSortedEip712Domain(eip712Domain: Eip712Domain): Eip712Domain {
    const { name, version, chainId, verifyingContract, salt } = eip712Domain;
    return {
        ...(name ? { name } : {}),
        ...(version ? { version } : {}),
        ...(chainId ? { chainId } : {}),
        ...(verifyingContract ? { verifyingContract } : {}),
        ...(salt ? { salt } : {}),
    };
}
