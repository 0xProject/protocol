import { env } from '../env';
import { kongGetAcl, kongGetConsumer, kongGetKey, kongGetRateLimit } from '../gateway/kongGateway';
import { ensureKongIsRunning, resetKongConfiguration } from './utils/kongUtils';
import { TZippoRouteTag } from 'zippo-interface';

import {
    deprovisionIntegratorAccess,
    provisionIntegratorAccess,
    provisionIntegratorKey,
    removeIntegrator,
    revokeIntegratorKey,
} from '../gateway';

jest.setTimeout(30000);

describe('gateway integration', () => {
    beforeAll(async () => await ensureKongIsRunning());
    beforeEach(async () => await resetKongConfiguration());

    test('provision integrator', async () => {
        const routeInfo = env.ZIPPO_ROUTE_MAP[TZippoRouteTag.SwapV1Prices];
        if (!routeInfo) {
            throw new Error('ROUTE_MAP does not contain SwapV1Prices info');
        }

        // should confirm kong consumer does not exist yet
        await expect(kongGetConsumer('app9876')).resolves.toBeNull();

        // should confirm provisioning an API key indicates success
        await expect(provisionIntegratorKey('integrator9876', 'app9876', 'abc123')).resolves.toBeTruthy();

        // should confirm provisioning new integrator indicates success
        await expect(
            provisionIntegratorAccess('integrator9876', 'app9876', [TZippoRouteTag.SwapV1Prices], [{ minute: 30 }]),
        ).resolves.toBeTruthy();

        // should confirm kong consumer was created
        await expect(kongGetConsumer('app9876')).resolves.toEqual(
            expect.objectContaining({
                username: 'app9876',
            }),
        );

        // should confirm integrator has the key
        await expect(kongGetKey('app9876', 'abc123')).resolves.toEqual(
            expect.objectContaining({
                key: 'abc123',
            }),
        );

        // should confirm integrator has correct ACL access
        await expect(kongGetAcl('app9876', routeInfo.groupName)).resolves.toEqual(
            expect.objectContaining({
                group: routeInfo.groupName,
            }),
        );

        // should confirm integrator has correct rate limit
        await Promise.all(
            routeInfo.routeNames.map(async (routeName) => {
                await expect(kongGetRateLimit('app9876', routeName)).resolves.toEqual(
                    expect.objectContaining({
                        config: expect.objectContaining({ minute: 30 }),
                    }),
                );
            }),
        );
    });

    test('deprovision integrator', async () => {
        const routeInfo = env.ZIPPO_ROUTE_MAP[TZippoRouteTag.SwapV1Prices];
        if (!routeInfo) {
            throw new Error('ROUTE_MAP does not contain SwapV1Prices info');
        }

        // should confirm kong consumer does not exist yet
        await expect(kongGetConsumer('app9876')).resolves.toBeNull();

        // should confirm provisioning new integrator indicates success
        await expect(
            provisionIntegratorAccess('integrator9876', 'app9876', [TZippoRouteTag.SwapV1Prices], [{ minute: 30 }]),
        ).resolves.toBeTruthy();

        // should confirm integrator as correct ACL access
        await expect(kongGetAcl('app9876', routeInfo.groupName)).resolves.toEqual(
            expect.objectContaining({
                group: routeInfo.groupName,
            }),
        );

        // should confirm integrator has correct rate limit
        await Promise.all(
            routeInfo.routeNames.map(async (routeName) => {
                await expect(kongGetRateLimit('app9876', routeName)).resolves.toEqual(
                    expect.objectContaining({
                        config: expect.objectContaining({ minute: 30 }),
                    }),
                );
            }),
        );

        // should remove integrator access to a route
        await expect(
            deprovisionIntegratorAccess('integrator9876', 'app9876', [TZippoRouteTag.SwapV1Prices]),
        ).resolves.toBeTruthy();

        // should confirm integrator is no longer a member of the ACL
        await expect(kongGetAcl('app9876', routeInfo.groupName)).resolves.toBeNull();

        // should confirm rate limit is gone
        await Promise.all(
            routeInfo.routeNames.map(async (routeName) => {
                await expect(kongGetRateLimit('app9876', routeName)).resolves.toBeNull();
            }),
        );
    });

    test('remove integrator', async () => {
        // should confirm kong consumer does not exist yet
        await expect(kongGetConsumer('app9876')).resolves.toBeNull();

        // should confirm provisioning new integrator indicates success
        await expect(
            provisionIntegratorAccess('integrator9876', 'app9876', [TZippoRouteTag.SwapV1Prices], [{ minute: 30 }]),
        ).resolves.toBeTruthy();

        // should confirm kong consumer was created
        await expect(kongGetConsumer('app9876')).resolves.toEqual(
            expect.objectContaining({
                username: 'app9876',
            }),
        );

        // should remove integrator
        await expect(removeIntegrator('integrator9876', 'app9876')).resolves.toBeTruthy();

        // should confirm kong consumer was deleted
        await expect(kongGetConsumer('app9876')).resolves.toBeNull();
    });

    test('revoke integrator key', async () => {
        // should confirm kong consumer does not exist yet
        await expect(kongGetConsumer('app9876')).resolves.toBeNull();

        // should confirm provisioning an API key indicates success
        await expect(provisionIntegratorKey('integrator9876', 'app9876', 'abc123')).resolves.toBeTruthy();

        // should confirm kong consumer was created
        await expect(kongGetConsumer('app9876')).resolves.toEqual(
            expect.objectContaining({
                username: 'app9876',
            }),
        );

        // should confirm integrator has the key
        await expect(kongGetKey('app9876', 'abc123')).resolves.toEqual(
            expect.objectContaining({
                key: 'abc123',
            }),
        );

        // should revoke the integrator key
        await expect(revokeIntegratorKey('integrator9876', 'app9876', 'abc123')).resolves.toBeTruthy();

        // should confirm kong consumer still exists
        await expect(kongGetConsumer('app9876')).resolves.toEqual(
            expect.objectContaining({
                username: 'app9876',
            }),
        );

        // should confirm integrator key is gone
        await expect(kongGetKey('app9876', 'abc123')).resolves.toBeNull();
    });
});
