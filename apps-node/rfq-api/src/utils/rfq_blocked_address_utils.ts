import { Gauge } from 'prom-client';
import { Connection } from 'typeorm/connection/Connection';

import { BlockedAddressEntity } from '../entities/BlockedAddressEntity';
import { logger } from '../logger';

const MAX_SET_SIZE = 5000;

const RFQ_BLOCKED_ADDRESS_SET_SIZE = new Gauge({
    name: 'rfq_blocked_address_set_size',
    help: 'The number of blocked addresses',
});

/**
 * RfqBlockedAddressUtils helps manage the RFQ blocked addresses
 */
export class RfqBlockedAddressUtils {
    public _blocked: Set<string>;
    private _expiresAt: number;
    private _updatePromise: Promise<void> | undefined;
    private _updating: boolean;
    private readonly _ttlMs: number;

    constructor(private readonly _connection: Connection, initialBlockedSet: Set<string>, ttlMs: number) {
        this._blocked = initialBlockedSet;
        this._ttlMs = ttlMs;
        this._updating = false;
        this._expiresAt = Date.now().valueOf(); // cache expires immediately
    }

    /**
     * isBlocked returns whether an address is blocked from the cache
     * NOTE: In the background, it also updates the blocked set if the cache is expired
     */
    public isBlocked(address: string): boolean {
        if (Date.now().valueOf() > this._expiresAt && !this._updating) {
            // If expired, update in the background
            this._updatePromise = this._updateBlockedSetAsync();
        }

        // Return cached value, even if stale
        return this._blocked.has(address.toLowerCase());
    }

    /**
     * completeUpdateAsync returns a Promise that resolves when the blocked address cache is updated
     */
    public async completeUpdateAsync(): Promise<void> {
        if (this._updatePromise) {
            return this._updatePromise;
        }
    }

    /**
     * Updates the blocked set of addresses
     */
    private async _updateBlockedSetAsync(): Promise<void> {
        this._updating = true;
        const blockedAddresses = await this._connection
            .getRepository(BlockedAddressEntity)
            .find({ take: MAX_SET_SIZE });

        RFQ_BLOCKED_ADDRESS_SET_SIZE.set(blockedAddresses.length);
        if (blockedAddresses.length >= MAX_SET_SIZE) {
            logger.warn('Blocked address table has hit or exceeded the limit');
        }
        this._blocked = new Set(blockedAddresses.map((entity) => entity.address.toLowerCase()));
        this._expiresAt = Date.now().valueOf() + this._ttlMs;
        this._updating = false;
    }
}
