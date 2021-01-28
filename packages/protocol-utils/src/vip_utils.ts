import { AbiEncoder, BigNumber } from '@0x/utils';

export interface CurveLiquidityProviderData {
    curveAddress: string;
    exchangeFunctionSelector: string;
    fromCoinIdx: BigNumber;
    toCoinIdx: BigNumber;
}

export const curveLiquidityProviderDataEncoder = AbiEncoder.create([
    { name: 'curveAddress', type: 'address' },
    { name: 'exchangeFunctionSelector', type: 'bytes4' },
    { name: 'fromCoinIdx', type: 'int128' },
    { name: 'toCoinIdx', type: 'int128' },
]);

export function encodeCurveLiquidityProviderData(data: CurveLiquidityProviderData): string {
    return curveLiquidityProviderDataEncoder.encode([
        data.curveAddress,
        data.exchangeFunctionSelector,
        data.fromCoinIdx,
        data.toCoinIdx,
    ]);
}
