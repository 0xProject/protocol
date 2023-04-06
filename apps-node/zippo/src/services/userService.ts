import { Prisma } from 'integrator-db';
import prisma from '../prisma';
import { z } from 'zod';
import cuid from 'cuid';
import { addMinutes, addDays } from 'date-fns';
import { TZippoTier, zippoRouterDefinition } from 'zippo-interface';
import { validatePassword, verifyPassword } from '../utils/passwordUtils';
import mailgunClient from '../mailgun';
import { env } from '../env';

const defaultUserSelect = Prisma.validator<Prisma.UserSelect>()({
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    emailVerifiedAt: true,
    image: true,
    createdAt: true,
    updatedAt: true,
    integratorTeamId: true,
});

const verificationTokenSelect = Prisma.validator<Prisma.VerificationTokenSelect>()({
    id: true,
    verificationToken: true,
    userEmail: true,
    expires: true,
});

const sessionSelect = Prisma.validator<Prisma.SessionSelect>()({
    id: true,
    sessionToken: true,
    userId: true,
    expires: true,
});

/**
 * Get a user by ID.
 *
 * @param input User ID
 */
export async function getById(
    input: z.infer<typeof zippoRouterDefinition.user.getById.input>,
): Promise<z.infer<typeof zippoRouterDefinition.user.getById.output>> {
    return prisma.user.findUnique({
        where: { id: input },
        select: defaultUserSelect,
    });
}

/**
 * Get a user by email.
 *
 * @param input User email
 */
export async function getByEmail(
    input: z.infer<typeof zippoRouterDefinition.user.getByEmail.input>,
): Promise<z.infer<typeof zippoRouterDefinition.user.getByEmail.output>> {
    return prisma.user.findUnique({
        where: { email: input },
        select: defaultUserSelect,
    });
}

/**
 * Create a new user.
 *
 * @param input user parameters
 * @param input.firstName The first name for the new user
 * @param input.lastName The last name for the new user
 * @param input.password The password for the new user
 * @param [input.email] The email for the new user
 * @param [input.image] The image URL for the new user
 * @param [input.integratorTeamId] The team ID to assign to the new user - either this or integratorTeam must be specified.
 * @param [input.integratorTeam] The team data for a new team to create and assign to the new user - either this or integratorTeamId must be specified.
 */
export async function create(input: z.infer<typeof zippoRouterDefinition.user.create.input>) {
    const { integratorTeamId, integratorTeam, password, ...userParameters } = input;

    let teamEntity;

    // if we are given an explicit team ID - use that (if it exists in the db)
    if (integratorTeamId) {
        teamEntity = await prisma.integratorTeam.findUnique({
            where: { id: integratorTeamId },
        });
    }
    // else if we are given team parameters - use those to create a new team
    if (!teamEntity && integratorTeam) {
        teamEntity = await prisma.integratorTeam.create({
            data: { ...integratorTeam },
        });
    }
    // else fallback to creating a new team for this user
    if (!teamEntity) {
        teamEntity = await prisma.integratorTeam.create({
            data: {
                name: '__not_init',
                productType: '__not_init',
                tier: 'dev',
            },
        });
    }

    let [salt, passwordHash] = await validatePassword(password);

    return prisma.user.create({
        data: {
            ...userParameters,
            integratorTeamId: teamEntity.id,
            passwordHash: passwordHash,
            salt: salt,
        },
        select: defaultUserSelect,
    });
}

/**
 * Update an existing user.
 *
 * @param id User ID
 * @param input User information
 */
export async function update(
    id: z.output<typeof zippoRouterDefinition.user.update.input>['id'],
    input: Omit<z.infer<typeof zippoRouterDefinition.user.update.input>, 'id'>,
) {
    return prisma.user.update({
        where: {
            id,
        },
        data: {
            ...input,
        },
        select: defaultUserSelect,
    });
}

/**
 * Login user, returns new session token
 *
 * @param input login information
 */
export async function login(input: z.infer<typeof zippoRouterDefinition.session.login.input>) {
    const user = await prisma.user.findUnique({
        where: { email: input.email },
        select: { id: true, passwordHash: true },
    });
    if (!user) {
        throw new Error('Unable to find user');
    }

    if (!(await verifyPassword({ password: input.password, passwordHash: user.passwordHash }))) {
        throw Error('Input password did not match user password');
    }

    return createSessionToken(user.id);
}

/**
 * Deletes session token for user logout, returns null
 *
 * @param input session token
 */
export async function logout(input: z.infer<typeof zippoRouterDefinition.session.logout.input>) {
    return deleteSessionToken(input);
}

/**
 * Return session token information for a session ID
 *
 * @param input session id
 */
export async function getSession(input: z.infer<typeof zippoRouterDefinition.session.getSession.input>) {
    return prisma.session.findUnique({
        where: { sessionToken: input },
        select: sessionSelect,
    });
}

/**
 * Verify user email.
 *
 * @param input  email, verification token
 */
export async function verifyEmail(input: z.infer<typeof zippoRouterDefinition.user.verifyEmail.input>) {
    const verificationToken = await prisma.verificationToken.findUnique({
        where: { verificationToken: input.verificationToken },
        select: { user: true, userEmail: true, expires: true },
    });
    if (!verificationToken) {
        throw new Error('Unable to find verification token');
    }
    if (verificationToken.expires < new Date()) {
        throw new Error('Verification token expired');
    }

    await deleteVerificationToken(input.verificationToken);

    return prisma.user.update({
        where: { id: verificationToken.user.id },
        data: { email: input.email, emailVerifiedAt: new Date() },
        select: defaultUserSelect,
    });
}

/**
 * Reset user password.
 *
 * @param input reset password params
 */
export async function resetPassword(input: z.infer<typeof zippoRouterDefinition.user.resetPassword.input>) {
    const verificationToken = await prisma.verificationToken.findUnique({
        where: { verificationToken: input.verificationToken },
        select: { user: true, expires: true },
    });
    if (!verificationToken) {
        throw new Error('Unable to find verification token');
    }
    if (verificationToken.expires < new Date()) {
        throw new Error('Verification token expired');
    }

    let [salt, passwordHash] = await validatePassword(input.password);

    await deleteVerificationToken(input.verificationToken);

    return prisma.user.update({
        where: { id: verificationToken.user.id },
        data: {
            passwordHash: passwordHash,
            salt: salt,
        },
        select: defaultUserSelect,
    });
}

/**
 * Send a password reset email to a user.
 *
 * NOTE: This email uses the mailgun `password_reset_email` template. Do not change
 * any variables without coordinating with the template documentation.
 *
 * @param input reset password email params
 */
export async function sendPasswordResetEmail(
    input: z.infer<typeof zippoRouterDefinition.user.sendPasswordResetEmail.input>,
) {
    const user = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { email: true, firstName: true, lastName: true },
    });
    if (!user) {
        throw new Error('Unable to find user');
    }
    if (!user.email) {
        throw new Error('Blank email for user');
    }

    const verificationToken = await createVerificationToken(input.userId);

    const verifyUrl = new URL(input.verifyUrl);
    verifyUrl.searchParams.set('token', verificationToken.verificationToken);
    const emailVars = {
        verifyUrl: verifyUrl.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
    };

    return sendUserEmail(input.userId, 'password_reset_email', 'Reset your 0x password', emailVars);
}

/**
 * Send an email verification email to a user.
 *
 * NOTE: This email uses the mailgun `email_verification_at_signup` template. Do not change
 * any variables without coordinating with the template documentation.
 *
 * @param input email verification email params
 */
export async function sendEmailVerifyEmail(
    input: z.infer<typeof zippoRouterDefinition.user.sendPasswordResetEmail.input>,
) {
    const user = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { email: true, firstName: true, lastName: true },
    });
    if (!user) {
        throw new Error('Unable to find user');
    }
    if (!user.email) {
        throw new Error('Blank email for user');
    }

    const verificationToken = await createVerificationToken(input.userId);

    const verifyUrl = new URL(input.verifyUrl);
    verifyUrl.searchParams.set('token', verificationToken.verificationToken);
    const emailVars = {
        verifyUrl: verifyUrl.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
    };

    return sendUserEmail(input.userId, 'email_verification_at_signup', 'Verify your email on 0x', emailVars);
}

/**
 * Send a template email to a user.
 *
 * @param input email params
 */
export async function sendEmail(input: z.infer<typeof zippoRouterDefinition.user.sendEmail.input>) {
    return sendUserEmail(input.userId, input.template, input.subject, input.emailVars);
}

/**
 * Helper function to create a verification token to be used for password resets or email verification
 *
 * @param userId email
 */
async function createVerificationToken(userId: string) {
    const verificationToken = cuid();

    const now = new Date();
    const expires = addMinutes(now, 60);

    return prisma.verificationToken.create({
        data: {
            user: {
                connect: {
                    id: userId,
                },
            },
            verificationToken,
            expires,
        },
        select: verificationTokenSelect,
    });
}

/**
 * Helper function to delete a verification token
 *
 * @param verificationToken token id
 */
async function deleteVerificationToken(verificationToken: string) {
    return prisma.verificationToken.delete({
        where: { verificationToken },
    });
}

/**
 * Helper function to create a session token
 *
 * @param userId user id
 */
async function createSessionToken(userId: string) {
    const sessionToken = cuid();

    const now = new Date();
    const expires = addDays(now, 7);

    return prisma.session.create({
        data: {
            user: {
                connect: {
                    id: userId,
                },
            },
            sessionToken,
            expires,
        },
        select: sessionSelect,
    });
}

/**
 * Helper function to delete a session token
 *
 * @param sessionToken token id
 */
async function deleteSessionToken(sessionToken: string) {
    return prisma.session.delete({
        where: { sessionToken },
    });
}

/**
 * Helper function to send an email
 *
 * @param userId User ID
 * @param template Template name
 * @param subject Email subject
 * @param emailVars Variables to send with email
 */
async function sendUserEmail(
    userId: string,
    template: string,
    subject: string,
    emailVars: Record<string, string> = {},
) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
    });
    if (!user) {
        throw new Error('Unable to find user');
    }
    if (!user.email) {
        throw new Error('Blank email for user');
    }

    let emailData = {
        from: '0x <no-reply@0x.org>',
        to: user.email,
        subject: subject,
        template: template,
        'h:X-Mailgun-Variables': JSON.stringify(emailVars),
    };

    return mailgunClient.messages.create(env.MAILGUN_DOMAIN, emailData);
}
