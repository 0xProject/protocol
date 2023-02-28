import { ChainId } from '@0x/contract-addresses';
import { logUtils } from '@0x/utils';
import { PoolDataService, SubgraphPoolBase } from '@balancer-labs/sor';
import { gql, request } from 'graphql-request';

const isSameAddress = (address1: string, address2: string): boolean =>
    address1.toLowerCase() === address2.toLowerCase();

const queryWithLinear = gql`
    query fetchTopPoolsWithLinear($maxPoolsFetched: Int!) {
        pools: pools(
            first: $maxPoolsFetched
            where: { swapEnabled: true, totalShares_not_in: ["0", "0.000000000001"] }
            orderBy: totalLiquidity
            orderDirection: desc
        ) {
            id
            address
            poolType
            swapFee
            totalShares
            tokens(orderBy: index) {
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
            sqrtAlpha
            sqrtBeta
            root3Alpha
            alpha
            beta
            c
            s
            lambda
            tauAlphaX
            tauAlphaY
            tauBetaX
            tauBetaY
            u
            v
            w
            z
            dSq
        }
    }
`;

const QUERY_BY_CHAIN_ID: { [chainId: number]: string } = {
    [ChainId.Mainnet]: queryWithLinear,
    [ChainId.Polygon]: queryWithLinear,
    [ChainId.Arbitrum]: queryWithLinear,
    [ChainId.Optimism]: queryWithLinear,
    [ChainId.Fantom]: queryWithLinear,
};

const DEFAULT_MAX_POOLS_FETCHED = 96;

/**
 * Simple service to query required info from Subgraph for Balancer Pools.
 * Because Balancer Subgraphs have slightly different schema depending on network the queries are adjusted as needed.
 */
export class SubgraphPoolDataService implements PoolDataService {
    private readonly _gqlQuery: string | undefined;

    constructor(
        private readonly _config: {
            chainId: number;
            subgraphUrl: string | null;
            maxPoolsFetched?: number;
            poolsToIgnore?: string[];
        },
    ) {
        this._config.maxPoolsFetched = this._config.maxPoolsFetched || DEFAULT_MAX_POOLS_FETCHED;
        this._gqlQuery = QUERY_BY_CHAIN_ID[this._config.chainId];
    }

    public async getPools(): Promise<SubgraphPoolBase[]> {
        if (!this._gqlQuery || !this._config.subgraphUrl) {
            return [];
        }
        try {
            const { pools } = await request<{ pools: SubgraphPoolBase[] }>(this._config.subgraphUrl, this._gqlQuery, {
                maxPoolsFetched: this._config.maxPoolsFetched,
            });
            // Filter out any pools that were set to ignore in config
            const filteredPools = pools.filter((p) => {
                if (!this._config.poolsToIgnore) return true;
                const index = this._config.poolsToIgnore.findIndex((addr) => isSameAddress(addr, p.address));
                return index === -1;
            });
            return filteredPools;
        } catch (err) {
            logUtils.warn(`Failed to fetch BalancerV2 subgraph pools: ${err.message}`);
            return [];
        }
    }
}
