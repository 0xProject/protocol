import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from 'integrator-db';

import prisma from '../../prisma';

jest.mock('../../prisma', () => ({
    __esModule: true,
    default: mockDeep<PrismaClient>(),
}));

export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;
