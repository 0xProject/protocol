import * as _ from 'lodash';

import { ObjectMap } from '../types';

export interface JsonRpcResponse {
    error: any;
    id: number;
    result: any;
}

export const utils = {
    arrayToMapWithId: <T extends object>(array: T[], idKey: keyof T): ObjectMap<T> => {
        const initialMap: ObjectMap<T> = {};
        return array.reduce((acc, val) => {
            const id = val[idKey] as any;
            acc[id] = val;
            return acc;
        }, initialMap);
    },

    /**
     * Executes JSON-RPC response validation
     * Copied from https://github.com/ethereum/web3.js/blob/79a165a205074cfdc14f59a61c41ba9ef5d25172/packages/web3-providers/src/validators/JsonRpcResponseValidator.js
     */
    isValidJsonRpcResponseOrThrow: (response: JsonRpcResponse, payload: any = undefined): boolean => {
        if (_.isObject(response)) {
            if (response.error) {
                if (response.error instanceof Error) {
                    throw new Error(`Node error: ${response.error.message}`);
                }

                throw new Error(`Node error: ${JSON.stringify(response.error)}`);
            }

            if (payload && response.id !== payload.id) {
                throw new Error(
                    `Validation error: Invalid JSON-RPC response ID (request: ${payload.id} / response: ${response.id})`,
                );
            }

            if (response.result === undefined) {
                throw new Error('Validation error: Undefined JSON-RPC result');
            }

            return true;
        }

        throw new Error('Validation error: Response should be of type Object');
    },
};
