import { Factory } from 'fishery';
import { Prisma } from 'integrator-db';
import cuid from 'cuid';
import userFactory from './userFactory';
import { addMinutes } from 'date-fns';

const sessionWithUser = Prisma.validator<Prisma.SessionArgs>()({
    include: { user: true },
});
type SessionWithUser = Prisma.SessionGetPayload<typeof sessionWithUser>;

export default Factory.define<SessionWithUser>(({ params }) => {
    const user = userFactory.build(params.user);
    return {
        id: cuid(),
        sessionToken: cuid(),
        user: user,
        userId: user.id,
        expires: addMinutes(new Date(), 60),
    };
});
