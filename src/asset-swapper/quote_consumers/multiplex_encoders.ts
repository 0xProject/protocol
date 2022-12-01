import { OtcOrder, RfqOrder, SIGNATURE_ABI } from '@0x/protocol-utils';
import { AbiEncoder } from '@0x/utils';

export enum MultiplexSubcall {
    Invalid,
    Rfq,
    Otc,
    UniswapV2,
    UniswapV3,
    TransformERC20,
    BatchSell,
    MultiHopSell,
}
export const multiplexTransformERC20Encoder = AbiEncoder.create([
    {
        name: 'transformations',
        type: 'tuple[]',
        components: [
            { name: 'deploymentNonce', type: 'uint32' },
            { name: 'data', type: 'bytes' },
        ],
    },
]);
export const multiplexRfqEncoder = AbiEncoder.create([
    { name: 'order', type: 'tuple', components: RfqOrder.STRUCT_ABI },
    { name: 'signature', type: 'tuple', components: SIGNATURE_ABI },
]);
export const multiplexOtcOrder = AbiEncoder.create([
    { name: 'order', type: 'tuple', components: OtcOrder.STRUCT_ABI },
    { name: 'signature', type: 'tuple', components: SIGNATURE_ABI },
]);
export const multiplexUniswapEncoder = AbiEncoder.create([
    { name: 'tokens', type: 'address[]' },
    { name: 'isSushi', type: 'bool' },
]);
