import { RfqOrder, SIGNATURE_ABI } from '@0x/protocol-utils';
import { AbiEncoder } from '@0x/utils';

export const multiplexTransformERC20Encoder = AbiEncoder.create([
    {
        name: 'transformations',
        type: 'tuple[]',
        components: [
            { name: 'deploymentNonce', type: 'uint32' },
            { name: 'data', type: 'bytes' },
        ],
    },
    { name: 'ethValue', type: 'uint256' },
]);
export const multiplexRfqEncoder = AbiEncoder.create([
    { name: 'order', type: 'tuple', components: RfqOrder.STRUCT_ABI },
    { name: 'signature', type: 'tuple', components: SIGNATURE_ABI },
]);
export const multiplexUniswapEncoder = AbiEncoder.create([
    { name: 'tokens', type: 'address[]' },
    { name: 'isSushi', type: 'bool' },
]);
export const multiplexPlpEncoder = AbiEncoder.create([
    { name: 'provider', type: 'address' },
    { name: 'auxiliaryData', type: 'bytes' },
]);
