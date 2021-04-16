import { AbiEncoder, BigNumber } from '@0x/utils';
export interface CurveLiquidityProviderData {
    curveAddress: string;
    exchangeFunctionSelector: string;
    fromCoinIdx: BigNumber;
    toCoinIdx: BigNumber;
}
export declare const curveLiquidityProviderDataEncoder: AbiEncoder.DataType;
/**
 * Encode data for the curve liquidity provider contract.
 */
export declare function encodeCurveLiquidityProviderData(data: CurveLiquidityProviderData): string;
//# sourceMappingURL=vip_utils.d.ts.map