import { prismaMock } from "./mocks/prismaMock";

import { getById, create } from "../services/userService";

describe("get by user ID", () => {
  const user = {
    id: "cldn7h4vj000008jufh6zbmwi",
    integratorTeamId: "cldn84ifb000108ml7dw5g7ip",
    name: "bob",
    email: "bob@example.com",
    emailVerifiedAt: new Date(),
    image: "",
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  test("should mock prisma db access and perform get", async () => {
    // mock prisma database access
    prismaMock.user.findUnique.mockResolvedValue(user);

    // perform get and ensure we got the mocked user
    await expect(getById(user.id)).resolves.toEqual(user);
  });

  test("should confirm calls to prisma as expected", () => {
    // confirm calls to prisma happened as expected
    expect(prismaMock.user.findUnique.mock.calls[0][0].where.id).toEqual(
      user.id
    );
  });
});

describe("create user", () => {
  const integratorTeam = {
    id: "cldn88o0x000208mlcyshgoma",
    name: "My Team",
    image: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const user = {
    id: "cldn88yix000308ml6pnh1lv83",
    integratorTeamId: "cldn88o0x000208mlcyshgoma",
    name: "bob",
    email: "bob@example.com",
    emailVerifiedAt: new Date(),
    image: "",
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  test("should mock prisma db access and perform create", async () => {
    // mock prisma database access
    prismaMock.integratorTeam.create.mockResolvedValue(integratorTeam);
    prismaMock.user.create.mockResolvedValue(user);

    // perform create and ensure we get back the mocked user
    await expect(
      create({
        name: user.name,
        email: user.email,
      })
    ).resolves.toEqual(user);
  });

  test("should confirm calls to prisma as expected", () => {
    // confirm calls to prisma happened as expected
    expect(prismaMock.integratorTeam.create.mock.calls[0][0].data.name).toEqual(
      integratorTeam.name
    );
    expect(prismaMock.user.create.mock.calls[0][0].data.name).toEqual(
      user.name
    );
    expect(prismaMock.user.create.mock.calls[0][0].data.email).toEqual(
      user.email
    );
    expect(
      prismaMock.user.create.mock.calls[0][0].data.integratorTeamId
    ).toEqual(integratorTeam.id);
  });
});
