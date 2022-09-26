import {
    Callback,
    ErrorCallback,
    JSONRPCRequestPayload,
    Subprovider,
    SupportedProvider,
    ZeroExProvider,
} from '@0x/subproviders';
import { providerUtils } from '@0x/utils';

export class SubproviderAdapter extends Subprovider {
    private readonly _provider: ZeroExProvider;
    constructor(provider: SupportedProvider) {
        super();
        this._provider = providerUtils.standardizeOrThrow(provider);
    }
    // tslint:disable-next-line:async-suffix
    public async handleRequest(payload: JSONRPCRequestPayload, _next: Callback, end: ErrorCallback): Promise<void> {
        this._provider.sendAsync(payload, (err, result) => {
            // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            result != null && result!.result != null
                ? // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  end(null, result!.result)
                : // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  end(err || new Error(result!.error?.message));
        });
    }
}
