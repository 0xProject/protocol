import { Factory } from 'fishery';
import { Prisma } from 'integrator-db';
import cuid from 'cuid';
import userFactory from './userFactory';
import { addMinutes } from 'date-fns';

const verificationTokenWithUser = Prisma.validator<Prisma.VerificationTokenArgs>()({
    include: { user: true },
});
type VerificationTokenWithUser = Prisma.VerificationTokenGetPayload<typeof verificationTokenWithUser>;

export default Factory.define<VerificationTokenWithUser>(({ params }) => {
    const user = userFactory.build(params.user);
    return {
        id: cuid(),
        verificationToken: cuid(),
        user: user,
        userEmail: user.email as string,
        expires: addMinutes(new Date(), 10),
    };
});
