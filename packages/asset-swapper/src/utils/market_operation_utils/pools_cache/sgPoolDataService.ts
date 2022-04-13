import { ChainId } from '@0x/contract-addresses';
import { gql, request } from 'graphql-request';
import { PoolDataService, SubgraphPoolBase } from '@balancer-labs/sdk';

const queryWithLinear = gql`
    query fetchTopPoolsWithLinear($maxPoolsFetched: Int!) {
        pools: pools(first: 1000, where: { swapEnabled: true }, orderBy: totalLiquidity, orderDirection: desc) {
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

const queryWithOutLinear = gql`
    query fetchTopPoolsWithoutLinear($maxPoolsFetched: Int!) {
        pools: pools(first: 1000, where: { swapEnabled: true }, orderBy: totalLiquidity, orderDirection: desc) {
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

const QUERY_BY_CHAIN_ID = {
    [ChainId.Mainnet]: queryWithLinear,
    [ChainId.Polygon]: queryWithOutLinear,
} as { [chainId: number]: string };

/**
 * Simple service to query required info from Subgraph for Balancer Pools.
 * Because Balancer Subgraphs have slightly different schema depending on network the queries are adjusted as needed.
 */
export class SubgraphPoolDataService implements PoolDataService {
    private readonly _gqlQuery: string | undefined;

    constructor(
        private readonly _config: {
            chainId: number;
            subgraphUrl: string;
            maxPoolsFetched?: number;
        },
    ) {
        this._config.maxPoolsFetched = this._config.maxPoolsFetched || 1e3;
        this._gqlQuery = QUERY_BY_CHAIN_ID[this._config.chainId];
    }

    public async getPools(): Promise<SubgraphPoolBase[]> {
        console.log(`SubgraphPoolDataService:getPools(): ${this._config.subgraphUrl}`);
        if (!this._gqlQuery) {
            return [];
        }
        try {
            const { pools } = await request<{ pools: SubgraphPoolBase[] }>(this._config.subgraphUrl, this._gqlQuery, {
                maxPoolsFetched: this._config.maxPoolsFetched,
            });
            return pools;
        } catch (err) {
            console.error(`Failed to fetch BalancerV2 subgraph pools: ${err.message}`);
            return [];
        }
    }
}
