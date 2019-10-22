import {
    Callback,
    ErrorCallback,
    JSONRPCRequestPayload,
    Subprovider,
    SupportedProvider,
    ZeroExProvider,
} from '@0x/subproviders';
import { providerUtils } from '@0x/utils';

import { utils } from './utils';

export class SubproviderAdapter extends Subprovider {
    private readonly _provider: ZeroExProvider;
    constructor(provider: SupportedProvider) {
        super();
        this._provider = providerUtils.standardizeOrThrow(provider);
    }
    // tslint:disable-next-line:async-suffix
    public async handleRequest(payload: JSONRPCRequestPayload, _next: Callback, end: ErrorCallback): Promise<void> {
        this._provider.sendAsync(payload, (err, result) => {
            !utils.isNil(result) && !utils.isNil(result!.result)
                ? end(null, result!.result)
                : end(err || new Error(result!.error?.message));
        });
    }
}
