import { JsonRpcProvider, JsonRpcPayload, JsonRpcResult } from 'ethers';

export type HexString = string;
export type Address = string;

export interface Override {
    code?: HexString;
    nonce?: HexString;
    balance?: HexString;
    stateDiff?: Record<HexString, HexString>;
}

export type StateOverrideSet = Record<Address, Override>;

export class StateOverrideJsonRpcProvider extends JsonRpcProvider {
    stateOverrideSet: StateOverrideSet | undefined;

    setStateOverride(stateOverrideSet: StateOverrideSet | undefined) {
        this.stateOverrideSet = stateOverrideSet;
    }

    async _send(payload: JsonRpcPayload | Array<JsonRpcPayload>): Promise<Array<JsonRpcResult>> {
        if (this.stateOverrideSet !== undefined) {
            const stateOverrideSet = this.stateOverrideSet;
            const payloadWithStateOverride =
                payload instanceof Array
                    ? payload.map((p) => toPayloadWithStateOverride(p, stateOverrideSet))
                    : toPayloadWithStateOverride(payload, this.stateOverrideSet);
            return super._send(payloadWithStateOverride);
        }

        return super._send(payload);
    }
}

function toPayloadWithStateOverride(payload: JsonRpcPayload, stateOverrideSet: StateOverrideSet): JsonRpcPayload {
    if (payload.method === 'eth_call' && payload.params instanceof Array) {
        return {
            ...payload,
            params: [...payload.params, stateOverrideSet],
        };
    }
    return payload;
}
