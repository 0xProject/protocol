export interface KongConsumer {
    id: string; // internal kong consumer ID
    created_at: number; // unix timestamp
    username: string; // 0x integrator ID
    custom_id?: string; // not used currently
    tags?: string[]; // not used currently
}

export interface KongKeys {
    next: string | null;
    data: KongKey[];
}

export interface KongKey {
    consumer: {
        id: string; // internal kong consumer ID
    };
    id: string;
    created_at: number; // unix timestamp
    ttl?: number;
    key: string; // da key
    tags?: string[]; // not used currently
}

export interface KongAcl {
    consumer: {
        id: string; // internal kong consumer ID
    };
    id: string;
    created_at: number; // unix timestamp
    group: string; // group name
    tags?: string[]; // not used currently
}

export interface KongPlugin<T> {
    consumer: {
        id: string; // internal kong consumer ID
    };
    id: string;
    name: string;
    created_at: number; // unix timestamp
    service?: string;
    route?: string;
    config: T;
    tags?: string[]; // not used currently
    enabled: boolean;
}

export interface KongPlugins {
    next: string | null;
    data: KongPlugin<Record<string, unknown>>[];
}
