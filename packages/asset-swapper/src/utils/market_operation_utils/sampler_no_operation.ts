import { BigNumber, logUtils, NULL_BYTES } from '@0x/utils';

import { ERC20BridgeSource, FillData, SourceQuoteOperation } from './types';

interface SamplerNoOperationCall {
    callback: () => BigNumber[];
}

/**
 * SamplerNoOperation can be used for sources where we already have all the necessary information
 * required to perform the sample operations, without needing access to any on-chain data. Using a noop sample
 * you can skip the eth_call, and just calculate the results directly in typescript land.
 */
export class SamplerNoOperation<TFillData extends FillData = FillData> implements SourceQuoteOperation<TFillData> {
    public readonly source: ERC20BridgeSource;
    public fillData: TFillData;
    private readonly _callback: () => BigNumber[];

    constructor(opts: { source: ERC20BridgeSource; fillData?: TFillData } & SamplerNoOperationCall) {
        this.source = opts.source;
        this.fillData = opts.fillData || ({} as TFillData); // tslint:disable-line:no-object-literal-type-assertion
        this._callback = opts.callback;
    }

    // tslint:disable-next-line:prefer-function-over-method
    public encodeCall(): string {
        return NULL_BYTES;
    }
    public handleCallResults(_callResults: string): BigNumber[] {
        return this._callback();
    }
    public handleRevert(_callResults: string): BigNumber[] {
        logUtils.warn(`SamplerNoOperation: ${this.source} reverted`);
        return [];
    }
}
