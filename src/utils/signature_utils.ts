import { Signature, SignatureType } from '@0x/protocol-utils';
import { hexUtils } from '@0x/utils';
import * as ethjs from 'ethereumjs-util';

const EIP_191_PREFIX = '\x19Ethereum Signed Message:\n';

/**
 * recovers the signer from a signature for a given order hash
 */
export function getSignerFromHash(hash: string, signature: Signature): string {
    switch (signature.signatureType) {
        case SignatureType.EIP712:
            return ecrecover(hash, signature);
        case SignatureType.EthSign:
            const eip191Hash = getEIP191Hash(hash);
            return ecrecover(eip191Hash, signature);
        default:
            throw new Error('unsupported signature type');
    }
}

function getEIP191Hash(msg: string): string {
    const byteLength = ethjs.toBuffer(msg).length;
    const prefix = `${EIP_191_PREFIX}${byteLength}`;
    return hexUtils.toHex(ethjs.keccak256(ethjs.toBuffer(hexUtils.concat(Buffer.from(prefix), msg))));
}

function ecrecover(hash: string, signature: Signature): string {
    const pubKey = ethjs.ecrecover(
        ethjs.toBuffer(hash),
        signature.v,
        ethjs.toBuffer(signature.r),
        ethjs.toBuffer(signature.s),
    );
    const recAddressBuffer = ethjs.pubToAddress(pubKey);
    return ethjs.bufferToHex(recAddressBuffer);
}
