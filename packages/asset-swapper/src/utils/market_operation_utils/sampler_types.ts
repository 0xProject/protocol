import { BigNumber } from '@0x/utils';

import { ERC20BridgeSource } from './types';

export type Bytes = string;
export type Address = Bytes;

export type LiquiditySource = ERC20BridgeSource;

export declare type RPCSamplerCallback = (err: Error | null, results: LiquidityResponse[]) => void;

export interface RpcLiquidityRequest {
    tokenPath: Address[];
    inputAmount: string;
    source: LiquiditySource;
    demand: boolean;
}

export interface LiquidityCurvePoint {
    sellAmount: BigNumber; // TODO (Romain) was bigint
    buyAmount: BigNumber; // TODO (Romain) was bigint
    encodedFillData: Bytes;
}

export interface LiquidityResponse {
    source: LiquiditySource;
    liquidityCurves: LiquidityCurvePoint[][];
}

export interface TokenResponse {
    address: Address;
    symbol: string;
    decimals: number;
    gasCost: 0;
}
