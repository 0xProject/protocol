import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { PoolCacheRouter } from 'pool-cache-api-interfaces';

const client = createTRPCProxyClient<PoolCacheRouter>({
    links: [
        httpBatchLink({
            url: 'http://localhost:3000',
        }),
    ],
});

async function main() {
    const resp = await client.getPoolCacheOfPair.query({
        chainId: 42,
        protocol: 'uniswap-v3',
        token0: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
        token1: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    });
    console.log(resp);
}

main();
