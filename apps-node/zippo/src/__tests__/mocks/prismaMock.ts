import { mockDeep, DeepMockProxy } from "jest-mock-extended";
import { PrismaClient } from "@prisma/client";

import prisma from "../../prisma";

jest.mock("../../prisma", () => ({
  __esModule: true,
  default: mockDeep<PrismaClient>(),
}));

export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;
