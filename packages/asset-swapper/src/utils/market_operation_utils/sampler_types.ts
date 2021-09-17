import { BigNumber } from '@0x/utils';

import { ERC20BridgeSource } from './types';

export type Bytes = string;
export type Address = Bytes;

export type LiquiditySource = ERC20BridgeSource;

export declare type RPCSamplerCallback = (err: Error | null, liquidityResponses: LiquidityResponse[]) => void;

export interface RpcLiquidityRequest {
    tokenPath: Address[];
    inputAmount: string;
    source: LiquiditySource;
    demand: boolean;
}

export interface LiquidityCurvePoint {
    sellAmount: bigint;
    buyAmount: bigint;
    encodedFillData: Bytes;
    gasCost: number;
}

export interface LiquidityResponse {
    source: LiquiditySource;
    liquidityCurves: LiquidityCurvePoint[][];
}

export interface TokenResponse {
    address: Address;
    symbol: string;
    decimals: number;
    gasCost: number;
}
