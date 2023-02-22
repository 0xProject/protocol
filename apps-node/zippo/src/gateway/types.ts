export enum ZippoRouteTag {
  SwapV1Price = "swap_price_v1_route",
  SwapV1Quote = "swap_quote_v1_route",
  OrderbookV1 = "orderbook_v1_route",
}

export interface ZippoRateLimit {
  second?: number;
  minute?: number;
  hour?: number;
  day?: number;
}

export interface ZippoRoute {
  tag: ZippoRouteTag; // unique simple name (all lowercase, no spaces, symbols, etc) for the service
  routeNames: string[]; // the kong route names associated with this tag
  groupName: string; // group name used in the kong ACL plugin
}

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
