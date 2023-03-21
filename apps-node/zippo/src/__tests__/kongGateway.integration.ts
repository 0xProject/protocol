import {
    kongEnsureAcl,
    kongEnsureConsumer,
    kongEnsureKey,
    kongEnsureRateLimit,
    kongEnsureRequestTransformer,
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

    describe('kong consumer', () => {
        beforeAll(async () => await resetKongConfiguration());

        it('should start with an empty kong configuration', async () => {
            await expect(kongGetConsumer('app1')).resolves.toBeNull();
        });

        it('should create a consumer', async () => {
            await expect(kongEnsureConsumer('app1')).resolves.toEqual(
                expect.objectContaining({
                    username: 'app1',
                }),
            );
        });

        it('should create a request transformer', async () => {
            await expect(kongEnsureRequestTransformer('app1', 'integrator1')).resolves.not.toBeNull();
        });

        it('should be able to get the new consumer', async () => {
            await expect(kongGetConsumer('app1')).resolves.toEqual(
                expect.objectContaining({
                    username: 'app1',
                }),
            );
        });
    });

    describe('kong same consumer twice', () => {
        beforeAll(async () => await resetKongConfiguration());

        it('should start with an empty kong configuration', async () => {
            await expect(kongGetConsumer('app1')).resolves.toBeNull();
        });

        it('should confirm consumer idempotency', async () => {
            await expect(kongEnsureConsumer('app1')).resolves.not.toBeNull();
            await expect(kongEnsureConsumer('app1')).resolves.not.toBeNull();
        });

        it('should ensure request transformer idempotency', async () => {
            await expect(kongEnsureRequestTransformer('app1', 'integrator1')).resolves.not.toBeNull();
            await expect(kongEnsureRequestTransformer('app1', 'integrator1')).resolves.not.toBeNull();
        });

        it('should be able to get the new consumer', async () => {
            await expect(kongGetConsumer('app1')).resolves.toEqual(
                expect.objectContaining({
                    username: 'app1',
                }),
            );
        });
    });

    describe('kong keys', () => {
        beforeAll(async () => await resetKongConfiguration());

        it('should start with an empty kong configuration', async () => {
            await expect(kongEnsureConsumer('app1')).resolves.not.toBeNull();
            await expect(kongEnsureRequestTransformer('app1', 'integrator1')).resolves.not.toBeNull();
            await expect(kongGetKey('app1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.toBeNull();
        });

        it('should create a new key', async () => {
            await expect(kongEnsureKey('app1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.toEqual(
                expect.objectContaining({
                    key: '56ce736a-37d4-40e4-8d19-820f849383b3',
                }),
            );
        });

        it('should be able to get the new key', async () => {
            await expect(kongGetKey('app1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.toEqual(
                expect.objectContaining({
                    key: '56ce736a-37d4-40e4-8d19-820f849383b3',
                }),
            );
        });
    });

    describe('kong multiple keys', () => {
        beforeAll(async () => await resetKongConfiguration());

        it('should start with an empty kong configuration', async () => {
            await expect(kongEnsureConsumer('app1')).resolves.not.toBeNull();
            await expect(kongEnsureRequestTransformer('app1', 'integrator1')).resolves.not.toBeNull();
            await expect(kongGetKey('app1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.toBeNull();
            await expect(kongGetKey('app1', 'app1-key2')).resolves.toBeNull();
        });

        it('should confirm two keys for the same app can be created', async () => {
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
        });

        it('should be able to get both new keys', async () => {
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
    });

    describe('kong same key twice', () => {
        beforeAll(async () => await resetKongConfiguration());

        it('should start with an empty kong configuration', async () => {
            await expect(kongEnsureConsumer('app1')).resolves.not.toBeNull();
            await expect(kongEnsureRequestTransformer('app1', 'integrator1')).resolves.not.toBeNull();
            await expect(kongGetKey('app1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.toBeNull();
        });

        it('should confirm key creation idempotency', async () => {
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
        });

        it('should be able to get the new key', async () => {
            await expect(kongGetKey('app1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.toEqual(
                expect.objectContaining({
                    key: '56ce736a-37d4-40e4-8d19-820f849383b3',
                }),
            );
        });
    });

    describe('kong acl', () => {
        beforeAll(async () => await resetKongConfiguration());

        it('should start with an empty kong configuration', async () => {
            await expect(kongEnsureConsumer('app1')).resolves.not.toBeNull();
            await expect(kongEnsureRequestTransformer('app1', 'integrator1')).resolves.not.toBeNull();
            await expect(kongEnsureKey('app1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.not.toBeNull();
            await expect(kongGetAcl('app1', 'swap_v1_price_group')).resolves.toBeNull();
        });

        it('should create the app ACL membership', async () => {
            await expect(kongEnsureAcl('app1', 'swap_v1_price_group')).resolves.toEqual(
                expect.objectContaining({
                    group: 'swap_v1_price_group',
                }),
            );
        });
    });

    describe('kong rate limit', () => {
        beforeAll(async () => await resetKongConfiguration());

        it('should start with an empty kong configuration', async () => {
            await expect(kongEnsureConsumer('app1')).resolves.not.toBeNull();
            await expect(kongGetRateLimit('app1', 'swap_v1_prices_route_optimism')).resolves.toBeNull();
            await expect(kongGetRateLimit('app1', 'swap_v1_prices_route_fantom')).resolves.toBeNull();
        });

        const rateLimit: TZippoRateLimit = {
            second: 2,
            minute: 60,
        };

        it('should add a rate-limit to a route', async () => {
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
        });

        it('should confirm we can get the new rate-limit', async () => {
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
    });

    describe('kong rate limit update', () => {
        beforeAll(async () => await resetKongConfiguration());

        it('should start with an empty kong configuration', async () => {
            await expect(kongEnsureConsumer('app1')).resolves.not.toBeNull();
            await expect(kongGetRateLimit('app1', 'swap_v1_prices_route_optimism')).resolves.toBeNull();
            await expect(kongGetRateLimit('app1', 'swap_v1_prices_route_fantom')).resolves.toBeNull();
        });

        const initialRateLimit: TZippoRateLimit = {
            second: 2,
            minute: 60,
        };

        it('should add a rate-limit to a route', async () => {
            await expect(
                kongEnsureRateLimit('app1', 'swap_v1_prices_route_optimism', initialRateLimit),
            ).resolves.toEqual(
                expect.objectContaining({
                    config: expect.objectContaining(initialRateLimit),
                }),
            );
            await expect(kongEnsureRateLimit('app1', 'swap_v1_prices_route_fantom', initialRateLimit)).resolves.toEqual(
                expect.objectContaining({
                    config: expect.objectContaining(initialRateLimit),
                }),
            );
        });

        const updateRateLimit: TZippoRateLimit = {
            second: 4,
            minute: 100,
        };

        it('should update a rate-limit for a route', async () => {
            await expect(
                kongEnsureRateLimit('app1', 'swap_v1_prices_route_optimism', updateRateLimit),
            ).resolves.toEqual(
                expect.objectContaining({
                    config: expect.objectContaining(updateRateLimit),
                }),
            );
            await expect(
                kongEnsureRateLimit('app1', 'swap_v1_prices_route_optimism', updateRateLimit),
            ).resolves.toEqual(
                expect.objectContaining({
                    config: expect.objectContaining(updateRateLimit),
                }),
            );
        });
    });

    describe('kong remove consumer', () => {
        beforeAll(async () => await resetKongConfiguration());

        it('should start with an empty kong configuration', async () => {
            await expect(kongEnsureConsumer('app1')).resolves.not.toBeNull();
        });

        it('should create a consumer', async () => {
            await expect(kongGetConsumer('app1')).resolves.not.toBeNull();
        });

        it('should remove a consumer', async () => {
            await expect(kongRemoveConsumer('app1')).resolves.toBeTruthy();
        });

        it('should no longer be able to get the consumer', async () => {
            await expect(kongGetConsumer('app1')).resolves.toBeNull();
        });
    });

    describe('kong remove key', () => {
        beforeAll(async () => await resetKongConfiguration());

        it('should start with an empty kong configuration', async () => {
            await expect(kongEnsureConsumer('app1')).resolves.not.toBeNull();
            await expect(kongEnsureKey('app1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.toEqual(
                expect.objectContaining({
                    key: '56ce736a-37d4-40e4-8d19-820f849383b3',
                }),
            );
        });

        it('should add a key to an app', async () => {
            await expect(kongGetKey('app1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.not.toBeNull();
        });

        it('should remove an app key', async () => {
            await expect(kongRemoveKey('app1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.toBeTruthy();
        });

        it('should no longer be able to get the app key', async () => {
            await expect(kongGetKey('app1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.toBeNull();
        });
    });

    describe('kong remove acl', () => {
        beforeAll(async () => await resetKongConfiguration());

        it('should start with an empty kong configuration', async () => {
            await expect(kongEnsureConsumer('app1')).resolves.not.toBeNull();
            await expect(kongGetAcl('app1', 'swap_v1_price_group')).resolves.toBeNull();
        });

        it('should grant ACL membership', async () => {
            await expect(kongEnsureAcl('app1', 'swap_v1_price_group')).resolves.not.toBeNull();
            await expect(kongGetAcl('app1', 'swap_v1_price_group')).resolves.not.toBeNull();
        });

        it('should remove ACL membership', async () => {
            await expect(kongRemoveAcl('app1', 'swap_v1_price_group')).resolves.toBeTruthy();
        });

        it('should confirm the app no longer has ACL membership', async () => {
            await expect(kongGetAcl('app1', 'swap_v1_price_group')).resolves.toBeNull();
        });
    });

    describe('kong remove rate limit', () => {
        beforeAll(async () => await resetKongConfiguration());

        const rateLimit: TZippoRateLimit = {
            second: 2,
            minute: 60,
        };

        it('should start with an empty kong configuration', async () => {
            await expect(kongEnsureConsumer('app1')).resolves.not.toBeNull();
        });

        it('should give the app a rate-limit', async () => {
            await expect(
                kongEnsureRateLimit('app1', 'swap_v1_prices_route_optimism', rateLimit),
            ).resolves.not.toBeNull();
            await expect(kongEnsureRateLimit('app1', 'swap_v1_prices_route_fantom', rateLimit)).resolves.not.toBeNull();
            await expect(kongGetRateLimit('app1', 'swap_v1_prices_route_optimism')).resolves.not.toBeNull();
            await expect(kongGetRateLimit('app1', 'swap_v1_prices_route_fantom')).resolves.not.toBeNull();
        });

        it('should remove rate-limit from app', async () => {
            await expect(kongRemoveRateLimit('app1', 'swap_v1_prices_route_optimism')).resolves.toBeTruthy();
            await expect(kongRemoveRateLimit('app1', 'swap_v1_prices_route_fantom')).resolves.toBeTruthy();
        });

        it('should no longer have a rate-limit for the app', async () => {
            await expect(kongGetRateLimit('app1', 'swap_v1_prices_route_optimism')).resolves.toBeNull();
            await expect(kongGetRateLimit('app1', 'swap_v1_prices_route_fantom')).resolves.toBeNull();
        });
    });
});
