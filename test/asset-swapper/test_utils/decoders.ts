import { AbiEncoder, BigNumber } from '@0x/utils';

const transformERC20Encoder = AbiEncoder.createMethod('transformERC20', [
    { type: 'address', name: 'inputToken' },
    { type: 'address', name: 'outputToken' },
    { type: 'uint256', name: 'inputTokenAmount' },
    { type: 'uint256', name: 'minOutputTokenAmount' },
    {
        type: 'tuple[]',
        name: 'transformations',
        components: [
            { type: 'uint32', name: 'deploymentNonce' },
            { type: 'bytes', name: 'data' },
        ],
    },
]);

interface TransformERC20Args {
    inputToken: string;
    outputToken: string;
    inputTokenAmount: BigNumber;
    minOutputTokenAmount: BigNumber;
    transformations: {
        deploymentNonce: BigNumber;
        data: string;
    }[];
}

/** Returns decoded `TransformERC20.transformERC20` calldata. */
export function decodeTransformERC20(calldata: string): TransformERC20Args {
    return transformERC20Encoder.decode(calldata) as TransformERC20Args;
}

export function getTransformerNonces(args: TransformERC20Args): number[] {
    return args.transformations.map((t) => t.deploymentNonce.toNumber());
}
