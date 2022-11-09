import { Connection } from 'typeorm';

import { RfqBlockedAddressUtils } from './rfq_blocked_address_utils';

/**
 * Satisfies the Set<string> interface, but uses RfqBlockedAddressUtils under the hood.
 * Only implements the `has` method
 */
export class RfqDynamicBlacklist implements Set<string> {
    public size: number;
    private readonly _rfqBlockedAddressUtils: RfqBlockedAddressUtils;

    constructor(connection: Connection, initialBlockedSet: Set<string>, ttlMs: number) {
        this._rfqBlockedAddressUtils = new RfqBlockedAddressUtils(connection, initialBlockedSet, ttlMs);
        this.size = 0;
    }

    public get [Symbol.toStringTag](): string {
        return 'RfqDynamicBlacklist';
    }

    public has(value: string): boolean {
        return this._rfqBlockedAddressUtils.isBlocked(value);
    }

    /// Pass through methods
    public add(value: string): this {
        this._rfqBlockedAddressUtils._blocked.add(value);
        return this;
    }

    public clear(): void {
        this._rfqBlockedAddressUtils._blocked.clear();
    }

    public delete(value: string): boolean {
        return this._rfqBlockedAddressUtils._blocked.delete(value);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public forEach(callbackfn: (value: string, value2: string, set: Set<string>) => void, _thisArg?: any): void {
        this._rfqBlockedAddressUtils._blocked.forEach(callbackfn);
    }

    public entries(): IterableIterator<[string, string]> {
        return this._rfqBlockedAddressUtils._blocked.entries();
    }

    public keys(): IterableIterator<string> {
        return this._rfqBlockedAddressUtils._blocked.keys();
    }

    public values(): IterableIterator<string> {
        return this._rfqBlockedAddressUtils._blocked.values();
    }

    public [Symbol.iterator](): IterableIterator<string> {
        return this._rfqBlockedAddressUtils._blocked.values();
    }
}
