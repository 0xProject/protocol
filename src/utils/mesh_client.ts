import { FilterKind, MeshGraphQLClient, OrderWithMetadata } from '@0x/mesh-graphql-client';
import * as _ from 'lodash';

import { MESH_GET_ORDERS_DEFAULT_PAGE_SIZE as DEFAULT_PAGE_SIZE } from '../config';

export class MeshClient extends MeshGraphQLClient {
    constructor(public readonly webSocketUrl: string, public readonly httpUrl?: string) {
        super({
            webSocketUrl: `${webSocketUrl}/graphql`,
            httpUrl: httpUrl ? `${httpUrl}/graphql` : undefined,
        });
    }

    public async getOrdersAsync(perPage: number = DEFAULT_PAGE_SIZE): Promise<{ ordersInfos: OrderWithMetadata[] }> {
        let orders: OrderWithMetadata[] = [];
        let lastOrderHash: string | undefined;
        do {
            const currentOrders = await this.findOrdersAsync({
                limit: perPage,
                filters: lastOrderHash
                    ? [
                          {
                              field: 'hash',
                              kind: FilterKind.Greater,
                              value: lastOrderHash,
                          },
                      ]
                    : undefined,
            });

            // Mesh will return an empty array when we have iterated through all orders
            lastOrderHash = currentOrders.length === 0 ? undefined : currentOrders[currentOrders.length - 1]?.hash;
            orders = [...orders, ...currentOrders];
        } while (lastOrderHash !== undefined);

        // NOTE: Due to how we are paginating through orders by hash we can end up with duplicates
        const uniqOrders = _.uniqBy(orders, 'hash');

        return { ordersInfos: uniqOrders };
    }
}
