import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../src/routers';
import { randomUUID } from 'crypto';

const basic = createTRPCProxyClient<AppRouter>({
    links: [httpBatchLink({ url: 'http://localhost:2022' })],
});

async function main() {
    const bobId = randomUUID();
    const newUser = await basic.user.create.mutate({
        name: `Bob${bobId}`,
        email: `bob${bobId}@example.com`,
    });
    console.log(`Created user ${newUser.id}`);

    const result = await basic.user.get.query(newUser.id);

    if (result) {
        console.log(result.name.toUpperCase());
    } else {
        console.log('Not found');
    }
}

main();
