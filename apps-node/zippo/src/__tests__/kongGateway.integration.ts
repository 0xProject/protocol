import {
    kongEnsureAcl,
    kongEnsureConsumer,
    kongEnsureKey,
    kongEnsureRateLimit,
    kongEnsureZeroexHeaders,
    kongGetAcl,
    kongGetConsumer,
    kongGetKey,
    kongGetRateLimit,
    kongRemoveAcl,
    kongRemoveConsumer,
    kongRemoveKey,
    kongRemoveRateLimit,
} from '../gateway/kongGateway';
import { ensureKongIsRunning, resetKongConfiguration } from './utils/kongUtils';
import { TZippoRateLimit } from 'zippo-interface';

jest.setTimeout(30000);

describe('kong gateway integration', () => {
    beforeAll(async () => await ensureKongIsRunning());
    beforeEach(async () => await resetKongConfiguration());

    test('create a kong consumer', async () => {
        // should start with an empty kong configuration
        await expect(kongGetConsumer('app1')).resolves.toBeNull();

        // should create a consumer
        await expect(kongEnsureConsumer('app1')).resolves.toEqual(
            expect.objectContaining({
                username: 'app1',
            }),
        );

        // should create zeroex headers
        await expect(
            kongEnsureZeroexHeaders('app1', {
                team_id: 'team1',
                app_id: 'app1',
            }),
        ).resolves.not.toBeNull();

        // should be able to get the new consumer
        await expect(kongGetConsumer('app1')).resolves.toEqual(
            expect.objectContaining({
                username: 'app1',
            }),
        );
    });

    test('create same kong consumer twice', async () => {
        // should start with an empty kong configuration
        await expect(kongGetConsumer('app1')).resolves.toBeNull();

        // should confirm consumer idempotency
        await expect(kongEnsureConsumer('app1')).resolves.not.toBeNull();
        await expect(kongEnsureConsumer('app1')).resolves.not.toBeNull();

        // should ensure zeroex headers idempotency
        await expect(
            kongEnsureZeroexHeaders('app1', {
                team_id: 'team1',
                app_id: 'app1',
            }),
        ).resolves.not.toBeNull();
        await expect(
            kongEnsureZeroexHeaders('app1', {
                team_id: 'team1',
                app_id: 'app1',
            }),
        ).resolves.not.toBeNull();

        // should be able to get the new consumer
        await expect(kongGetConsumer('app1')).resolves.toEqual(
            expect.objectContaining({
                username: 'app1',
            }),
        );
    });

    test('create kong keys', async () => {
        // should start with an empty kong configuration
        await expect(kongEnsureConsumer('app1')).resolves.not.toBeNull();
        await expect(
            kongEnsureZeroexHeaders('app1', {
                team_id: 'team1',
                app_id: 'app1',
            }),
        ).resolves.not.toBeNull();
        await expect(kongGetKey('app1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.toBeNull();

        // should create a new key
        await expect(kongEnsureKey('app1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.toEqual(
            expect.objectContaining({
                key: '56ce736a-37d4-40e4-8d19-820f849383b3',
            }),
        );

        // should be able to get the new key
        await expect(kongGetKey('app1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.toEqual(
            expect.objectContaining({
                key: '56ce736a-37d4-40e4-8d19-820f849383b3',
            }),
        );
    });

    test('create multiple kong keys', async () => {
        // should start with an empty kong configuration
        await expect(kongEnsureConsumer('app1')).resolves.not.toBeNull();
        await expect(
            kongEnsureZeroexHeaders('app1', {
                team_id: 'team1',
                app_id: 'app1',
            }),
        ).resolves.not.toBeNull();
        await expect(kongGetKey('app1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.toBeNull();
        await expect(kongGetKey('app1', 'app1-key2')).resolves.toBeNull();

        // should confirm two keys for the same app can be created
        await expect(kongEnsureKey('app1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.toEqual(
            expect.objectContaining({
                key: '56ce736a-37d4-40e4-8d19-820f849383b3',
            }),
        );
        await expect(kongEnsureKey('app1', 'app1-key2')).resolves.toEqual(
            expect.objectContaining({
                key: 'app1-key2',
            }),
        );

        // should be able to get both new keys
        await expect(kongGetKey('app1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.toEqual(
            expect.objectContaining({
                key: '56ce736a-37d4-40e4-8d19-820f849383b3',
            }),
        );
        await expect(kongGetKey('app1', 'app1-key2')).resolves.toEqual(
            expect.objectContaining({
                key: 'app1-key2',
            }),
        );
    });

    test('create same kong key twice', async () => {
        // should start with an empty kong configuration
        await expect(kongEnsureConsumer('app1')).resolves.not.toBeNull();
        await expect(
            kongEnsureZeroexHeaders('app1', {
                team_id: 'team1',
                app_id: 'app1',
            }),
        ).resolves.not.toBeNull();
        await expect(kongGetKey('app1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.toBeNull();

        // should confirm key creation idempotency
        await expect(kongEnsureKey('app1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.toEqual(
            expect.objectContaining({
                key: '56ce736a-37d4-40e4-8d19-820f849383b3',
            }),
        );
        await expect(kongEnsureKey('app1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.toEqual(
            expect.objectContaining({
                key: '56ce736a-37d4-40e4-8d19-820f849383b3',
            }),
        );

        // should be able to get the new key
        await expect(kongGetKey('app1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.toEqual(
            expect.objectContaining({
                key: '56ce736a-37d4-40e4-8d19-820f849383b3',
            }),
        );
    });

    test('create kong acl', async () => {
        // should start with an empty kong configuration
        await expect(kongEnsureConsumer('app1')).resolves.not.toBeNull();
        await expect(
            kongEnsureZeroexHeaders('app1', {
                team_id: 'team1',
                app_id: 'app1',
            }),
        ).resolves.not.toBeNull();
        await expect(kongEnsureKey('app1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.not.toBeNull();
        await expect(kongGetAcl('app1', 'swap_v1_price_group')).resolves.toBeNull();

        // should create the app ACL membership
        await expect(kongEnsureAcl('app1', 'swap_v1_price_group')).resolves.toEqual(
            expect.objectContaining({
                group: 'swap_v1_price_group',
            }),
        );
    });

    test('create kong rate limit', async () => {
        // should start with an empty kong configuration
        await expect(kongEnsureConsumer('app1')).resolves.not.toBeNull();
        await expect(kongGetRateLimit('app1', 'swap_v1_prices_route_optimism')).resolves.toBeNull();
        await expect(kongGetRateLimit('app1', 'swap_v1_prices_route_fantom')).resolves.toBeNull();

        const rateLimit: TZippoRateLimit = {
            second: 2,
            minute: 60,
        };

        // should add a rate-limit to a route
        await expect(kongEnsureRateLimit('app1', 'swap_v1_prices_route_optimism', rateLimit)).resolves.toEqual(
            expect.objectContaining({
                config: expect.objectContaining(rateLimit),
            }),
        );
        await expect(kongEnsureRateLimit('app1', 'swap_v1_prices_route_fantom', rateLimit)).resolves.toEqual(
            expect.objectContaining({
                config: expect.objectContaining(rateLimit),
            }),
        );

        // should confirm we can get the new rate-limit
        await expect(kongGetRateLimit('app1', 'swap_v1_prices_route_optimism')).resolves.toEqual(
            expect.objectContaining({
                config: expect.objectContaining(rateLimit),
            }),
        );
        await expect(kongGetRateLimit('app1', 'swap_v1_prices_route_fantom')).resolves.toEqual(
            expect.objectContaining({
                config: expect.objectContaining(rateLimit),
            }),
        );
    });

    test('update kong rate limit', async () => {
        // should start with an empty kong configuration
        await expect(kongEnsureConsumer('app1')).resolves.not.toBeNull();
        await expect(kongGetRateLimit('app1', 'swap_v1_prices_route_optimism')).resolves.toBeNull();
        await expect(kongGetRateLimit('app1', 'swap_v1_prices_route_fantom')).resolves.toBeNull();

        const initialRateLimit: TZippoRateLimit = {
            second: 2,
            minute: 60,
        };

        // should add a rate-limit to a route
        await expect(kongEnsureRateLimit('app1', 'swap_v1_prices_route_optimism', initialRateLimit)).resolves.toEqual(
            expect.objectContaining({
                config: expect.objectContaining(initialRateLimit),
            }),
        );
        await expect(kongEnsureRateLimit('app1', 'swap_v1_prices_route_fantom', initialRateLimit)).resolves.toEqual(
            expect.objectContaining({
                config: expect.objectContaining(initialRateLimit),
            }),
        );

        const updateRateLimit: TZippoRateLimit = {
            second: 4,
            minute: 100,
        };

        // should update a rate-limit for a route
        await expect(kongEnsureRateLimit('app1', 'swap_v1_prices_route_optimism', updateRateLimit)).resolves.toEqual(
            expect.objectContaining({
                config: expect.objectContaining(updateRateLimit),
            }),
        );
        await expect(kongEnsureRateLimit('app1', 'swap_v1_prices_route_optimism', updateRateLimit)).resolves.toEqual(
            expect.objectContaining({
                config: expect.objectContaining(updateRateLimit),
            }),
        );
    });

    test('remove kong consumer', async () => {
        // should start with an empty kong configuration
        await expect(kongEnsureConsumer('app1')).resolves.not.toBeNull();

        // should create a consumer
        await expect(kongGetConsumer('app1')).resolves.not.toBeNull();

        // should remove a consumer
        await expect(kongRemoveConsumer('app1')).resolves.toBeTruthy();

        // should no longer be able to get the consumer
        await expect(kongGetConsumer('app1')).resolves.toBeNull();
    });

    test('remove kong key', async () => {
        // should start with an empty kong configuration
        await expect(kongEnsureConsumer('app1')).resolves.not.toBeNull();
        await expect(kongEnsureKey('app1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.toEqual(
            expect.objectContaining({
                key: '56ce736a-37d4-40e4-8d19-820f849383b3',
            }),
        );

        // should add a key to an app
        await expect(kongGetKey('app1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.not.toBeNull();

        // should remove an app key
        await expect(kongRemoveKey('app1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.toBeTruthy();

        // should no longer be able to get the app key
        await expect(kongGetKey('app1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.toBeNull();
    });

    test('remove kong acl', async () => {
        // should start with an empty kong configuration
        await expect(kongEnsureConsumer('app1')).resolves.not.toBeNull();
        await expect(kongGetAcl('app1', 'swap_v1_price_group')).resolves.toBeNull();

        // should grant ACL membership
        await expect(kongEnsureAcl('app1', 'swap_v1_price_group')).resolves.not.toBeNull();
        await expect(kongGetAcl('app1', 'swap_v1_price_group')).resolves.not.toBeNull();

        // should remove ACL membership
        await expect(kongRemoveAcl('app1', 'swap_v1_price_group')).resolves.toBeTruthy();

        // should confirm the app no longer has ACL membership
        await expect(kongGetAcl('app1', 'swap_v1_price_group')).resolves.toBeNull();
    });

    test('remove kong rate limit', async () => {
        const rateLimit: TZippoRateLimit = {
            second: 2,
            minute: 60,
        };

        // should start with an empty kong configuration
        await expect(kongEnsureConsumer('app1')).resolves.not.toBeNull();

        // should give the app a rate-limit
        await expect(kongEnsureRateLimit('app1', 'swap_v1_prices_route_optimism', rateLimit)).resolves.not.toBeNull();
        await expect(kongEnsureRateLimit('app1', 'swap_v1_prices_route_fantom', rateLimit)).resolves.not.toBeNull();
        await expect(kongGetRateLimit('app1', 'swap_v1_prices_route_optimism')).resolves.not.toBeNull();
        await expect(kongGetRateLimit('app1', 'swap_v1_prices_route_fantom')).resolves.not.toBeNull();

        // should remove rate-limit from app
        await expect(kongRemoveRateLimit('app1', 'swap_v1_prices_route_optimism')).resolves.toBeTruthy();
        await expect(kongRemoveRateLimit('app1', 'swap_v1_prices_route_fantom')).resolves.toBeTruthy();

        // should no longer have a rate-limit for the app
        await expect(kongGetRateLimit('app1', 'swap_v1_prices_route_optimism')).resolves.toBeNull();
        await expect(kongGetRateLimit('app1', 'swap_v1_prices_route_fantom')).resolves.toBeNull();
    });
});
