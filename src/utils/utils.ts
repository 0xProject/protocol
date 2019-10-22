import { intervalUtils } from '@0x/utils';
import * as _ from 'lodash';

export interface JsonRpcResponse {
    error: any;
    id: number;
    result: any;
}

export const utils = {
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
    chunkByByteLength: <T>(items: T[], maxByteLength: number): T[][] => {
        const itemsClone = items.slice(0);
        const chunkedItems: T[][] = [];
        let currChunk: T[] = [];
        let currentChunkTotalLength: number = 0;
        while (itemsClone.length !== 0) {
            const item = itemsClone[0];
            const currLength = Buffer.from(JSON.stringify(item)).byteLength;
            // Too big to add, reset
            if (currentChunkTotalLength + currLength > maxByteLength) {
                chunkedItems.push(currChunk);
                currChunk = [];
                currentChunkTotalLength = 0;
            } else {
                currChunk.push(item);
                currentChunkTotalLength += currLength;
                itemsClone.splice(0, 1);
            }
        }
        // Handle the final chunk
        if (currChunk.length !== 0) {
            chunkedItems.push(currChunk);
        }
        return chunkedItems;
    },
    delayAsync: async (ms: number): Promise<void> => {
        // tslint:disable-next-line:no-inferred-empty-object-type
        return new Promise<void>((resolve) => setTimeout(resolve, ms));
    },
    runWithTimeout: async <T>(fn: () => Promise<T>, timeoutMs: number): Promise<any> => {
        let _timeoutHandle: NodeJS.Timeout;
        // tslint:disable-next-line:no-inferred-empty-object-type
        const timeoutPromise = new Promise((_resolve, reject) => {
            _timeoutHandle = setTimeout(() => reject(new Error('timeout')), timeoutMs);
        });
        return Promise.race([fn(), timeoutPromise]).then((result) => {
            clearTimeout(_timeoutHandle);
            return result;
        });
    },
    isNil: (value: any): boolean => {
        // undefined == null => true
        // undefined == undefined => true
        return value == null;
    },
    setAsyncExcludingImmediateInterval(
        fn: () => Promise<void>,
        intervalMs: number,
        onError: (err: Error) => void,
    ): NodeJS.Timer {
        // Execute this immediately rather than wait for the first interval
        void (async () => {
            try {
                await fn();
            } catch (e) {
                onError(e);
            }
        })();
        return intervalUtils.setAsyncExcludingInterval(fn, intervalMs, onError);
    },
    calculateCallDataGas: (bytes: string) => {
        const buf = Buffer.from(bytes.replace(/0x/g, ''), 'hex');
        let gas = 21000;
        for (const b of buf) {
            // 4 gas per 0 byte, 16 gas per non-zero
            // tslint:disable-next-line
            gas += b === 0 ? 4 : 16;
        }
        return gas;
    },
};
