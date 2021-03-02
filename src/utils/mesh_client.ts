import { AddOrdersResults, FilterKind, MeshGraphQLClient, OrderWithMetadataV4 } from '@0x/mesh-graphql-client';
import * as _ from 'lodash';

import { MESH_GET_ORDERS_DEFAULT_PAGE_SIZE as DEFAULT_PAGE_SIZE } from '../config';
import { SignedLimitOrder } from '../types';

export type AddOrdersResultsV4 = AddOrdersResults<OrderWithMetadataV4, SignedLimitOrder>;

export class MeshClient extends MeshGraphQLClient {
    constructor(public readonly webSocketUrl: string, public readonly httpUrl?: string) {
        super({
            webSocketUrl: `${webSocketUrl}/graphql`,
            httpUrl: httpUrl ? `${httpUrl}/graphql` : undefined,
        });
    }

    public async getOrdersV4Async(
        perPage: number = DEFAULT_PAGE_SIZE,
    ): Promise<{ ordersInfos: OrderWithMetadataV4[] }> {
        let orders: OrderWithMetadataV4[] = [];
        let lastOrderHash: string | undefined;
        do {
            const currentOrders = await this.findOrdersV4Async({
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

    // tslint:disable-next-line:prefer-function-over-method
    public async destroyAsync(): Promise<void> {
        // We can add stuff here if we need to.
        return;
    }
}
