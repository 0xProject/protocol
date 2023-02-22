import { env } from "../env";
import {
  kongGetAcl,
  kongGetConsumer,
  kongGetKey,
  kongGetRateLimit,
} from "../gateway/kongGateway";
import { ensureKongIsRunning, resetKongConfiguration } from "./utils/kongUtils";
import { ZippoRouteTag } from "../gateway/types";
import {
  deprovisionIntegratorAccess,
  provisionIntegratorAccess,
  provisionIntegratorKey,
  removeIntegrator,
  revokeIntegratorKey,
} from "../gateway";

jest.setTimeout(30000);

describe("gateway integration", () => {
  beforeAll(async () => await ensureKongIsRunning());

  describe("provision integrator", () => {
    beforeAll(async () => await resetKongConfiguration());

    const routeInfo = env.ZIPPO_ROUTE_MAP[ZippoRouteTag.SwapV1Price];
    if (!routeInfo) {
      throw new Error("ROUTE_MAP does not contain SwapV1Price info");
    }

    it("should confirm kong consumer does not exist yet", async () => {
      await expect(kongGetConsumer("project9876")).resolves.toBeNull();
    });

    it("should confirm provisioning an API key indicates success", async () => {
      await expect(
        provisionIntegratorKey("integrator9876", "project9876", "abc123")
      ).resolves.toBeTruthy();
    });

    it("should confirm provisioning new integrator indicates success", async () => {
      await expect(
        provisionIntegratorAccess(
          "integrator9876",
          "project9876",
          [ZippoRouteTag.SwapV1Price],
          [{ minute: 30 }]
        )
      ).resolves.toBeTruthy();
    });

    it("should confirm kong consumer was created", async () => {
      await expect(kongGetConsumer("project9876")).resolves.toEqual(
        expect.objectContaining({
          username: "project9876",
        })
      );
    });

    it("should confirm integrator has the key", async () => {
      await expect(kongGetKey("project9876", "abc123")).resolves.toEqual(
        expect.objectContaining({
          key: "abc123",
        })
      );
    });

    it("should confirm integrator has correct ACL access", async () => {
      await expect(
        kongGetAcl("project9876", routeInfo.groupName)
      ).resolves.toEqual(
        expect.objectContaining({
          group: routeInfo.groupName,
        })
      );
    });

    it("should confirm integrator has correct rate limit", async () => {
      await Promise.all(
        routeInfo.routeNames.map(async (routeName) => {
          await expect(
            kongGetRateLimit("project9876", routeName)
          ).resolves.toEqual(
            expect.objectContaining({
              config: expect.objectContaining({ minute: 30 }),
            })
          );
        })
      );
    });
  });

  describe("deprovision integrator", () => {
    beforeAll(async () => await resetKongConfiguration());

    const routeInfo = env.ZIPPO_ROUTE_MAP[ZippoRouteTag.SwapV1Price];
    if (!routeInfo) {
      throw new Error("ROUTE_MAP does not contain SwapV1Price info");
    }

    it("should confirm kong consumer does not exist yet", async () => {
      await expect(kongGetConsumer("project9876")).resolves.toBeNull();
    });

    it("should confirm provisioning new integrator indicates success", async () => {
      await expect(
        provisionIntegratorAccess(
          "integrator9876",
          "project9876",
          [ZippoRouteTag.SwapV1Price],
          [{ minute: 30 }]
        )
      ).resolves.toBeTruthy();
    });

    it("should confirm integrator as correct ACL access", async () => {
      await expect(
        kongGetAcl("project9876", routeInfo.groupName)
      ).resolves.toEqual(
        expect.objectContaining({
          group: routeInfo.groupName,
        })
      );
    });

    it("should confirm integrator has correct rate limit", async () => {
      await Promise.all(
        routeInfo.routeNames.map(async (routeName) => {
          await expect(
            kongGetRateLimit("project9876", routeName)
          ).resolves.toEqual(
            expect.objectContaining({
              config: expect.objectContaining({ minute: 30 }),
            })
          );
        })
      );
    });

    it("should remove integrator access to a route", async () => {
      await expect(
        deprovisionIntegratorAccess("integrator9876", "project9876", [
          ZippoRouteTag.SwapV1Price,
        ])
      ).resolves.toBeTruthy();
    });

    it("should confirm integrator is no longer a member of the ACL", async () => {
      await expect(
        kongGetAcl("project9876", routeInfo.groupName)
      ).resolves.toBeNull();
    });

    it("should confirm rate limit is gone", async () => {
      await Promise.all(
        routeInfo.routeNames.map(async (routeName) => {
          await expect(
            kongGetRateLimit("project9876", routeName)
          ).resolves.toBeNull();
        })
      );
    });
  });

  describe("remove integrator", () => {
    beforeAll(async () => await resetKongConfiguration());

    it("should confirm kong consumer does not exist yet", async () => {
      await expect(kongGetConsumer("project9876")).resolves.toBeNull();
    });

    it("should confirm provisioning new integrator indicates success", async () => {
      await expect(
        provisionIntegratorAccess(
          "integrator9876",
          "project9876",
          [ZippoRouteTag.SwapV1Price],
          [{ minute: 30 }]
        )
      ).resolves.toBeTruthy();
    });

    it("should confirm kong consumer was created", async () => {
      await expect(kongGetConsumer("project9876")).resolves.toEqual(
        expect.objectContaining({
          username: "project9876",
        })
      );
    });

    it("should remove integrator", async () => {
      await expect(
        removeIntegrator("integrator9876", "project9876")
      ).resolves.toBeTruthy();
    });

    it("should confirm kong consumer was deleted", async () => {
      await expect(kongGetConsumer("project9876")).resolves.toBeNull();
    });
  });

  describe("revoke integrator key", () => {
    beforeAll(async () => await resetKongConfiguration());

    it("should confirm kong consumer does not exist yet", async () => {
      await expect(kongGetConsumer("project9876")).resolves.toBeNull();
    });

    it("should confirm provisioning an API key indicates success", async () => {
      await expect(
        provisionIntegratorKey("integrator9876", "project9876", "abc123")
      ).resolves.toBeTruthy();
    });

    it("should confirm kong consumer was created", async () => {
      await expect(kongGetConsumer("project9876")).resolves.toEqual(
        expect.objectContaining({
          username: "project9876",
        })
      );
    });

    it("should confirm integrator has the key", async () => {
      await expect(kongGetKey("project9876", "abc123")).resolves.toEqual(
        expect.objectContaining({
          key: "abc123",
        })
      );
    });

    it("should revoke the integrator key", async () => {
      await expect(
        revokeIntegratorKey("integrator9876", "project9876", "abc123")
      ).resolves.toBeTruthy();
    });

    it("should confirm kong consumer still exists", async () => {
      await expect(kongGetConsumer("project9876")).resolves.toEqual(
        expect.objectContaining({
          username: "project9876",
        })
      );
    });

    it("should confirm integrator key is gone", async () => {
      await expect(kongGetKey("project9876", "abc123")).resolves.toBeNull();
    });
  });
});
