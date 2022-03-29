import fetch from 'isomorphic-fetch';
import { PoolDataService, SubgraphPoolBase } from '@balancer-labs/sdk';

const queryWithLinear = `
      {
        pools: pools(
          first: 1000,
          where: { swapEnabled: true },
          orderBy: totalLiquidity,
          orderDirection: desc
        ) {
          id
          address
          poolType
          swapFee
          totalShares
          tokens {
            address
            balance
            decimals
            weight
            priceRate
          }
          tokensList
          totalWeight
          amp
          expiryTime
          unitSeconds
          principalToken
          baseToken
          swapEnabled
          wrappedIndex
          mainIndex
          lowerTarget
          upperTarget
        }
      }
    `;

const queryWithOutLinear = `
      {
        pools: pools(
          first: 1000,
          where: { swapEnabled: true },
          orderBy: totalLiquidity,
          orderDirection: desc
        ) {
          id
          address
          poolType
          swapFee
          totalShares
          tokens {
            address
            balance
            decimals
            weight
            priceRate
          }
          tokensList
          totalWeight
          amp
          expiryTime
          unitSeconds
          principalToken
          baseToken
          swapEnabled
        }
      }
    `;

export const Query: { [chainId: number]: string } = {
    1: queryWithLinear,
    3: queryWithLinear,
    4: queryWithLinear,
    5: queryWithLinear,
    42: queryWithLinear,
    137: queryWithOutLinear,
    42161: queryWithLinear,
};

/**
 * Simple service to query required info from Subgraph for Balancer Pools.
 * Because Balancer Subgraphs have slightly different schema depending on network the queries are adjusted as needed.
 */
export class SubgraphPoolDataService implements PoolDataService {
    constructor(
        private readonly config: {
            chainId: number;
            subgraphUrl: string;
        }
    ) {}

    public async getPools(): Promise<SubgraphPoolBase[]> {
        console.log(
            `SubgraphPoolDataService:getPools(): ${this.config.subgraphUrl}`
        );
        const response = await fetch(this.config.subgraphUrl, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: Query[this.config.chainId] }),
        });

        const { data } = await response.json();
        return data.pools ?? [];
    }
}
