import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { TZippoRouter } from 'zippo-interface';
import { randomUUID } from 'crypto';

const basic = createTRPCProxyClient<TZippoRouter>({
    links: [httpBatchLink({ url: 'http://localhost:2022' })],
});

async function main() {
    const bobId = randomUUID();
    const newUser = await basic.user.create.mutate({
        name: `Bob${bobId}`,
        email: `bob${bobId}@example.com`,
        password: 'zfv2ymw3ydv.PND0mpe',
    });
    console.log(`Created user ${newUser.id}`);

    const result = await basic.user.getById.query(newUser.id);

    if (result) {
        console.log('Found user: ', result.name);

        const teamResult = await basic.team.get.query(result.integratorTeamId);
        console.log('Team: ', teamResult);
    } else {
        console.log('Not found');
    }
}

main();
