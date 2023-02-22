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
import { ZippoRateLimit } from '../gateway/types';

jest.setTimeout(30000);

describe('kong gateway integration', () => {
    beforeAll(async () => await ensureKongIsRunning());

    describe('kong consumer', () => {
        beforeAll(async () => await resetKongConfiguration());

        it('should start with an empty kong configuration', async () => {
            await expect(kongGetConsumer('project1')).resolves.toBeNull();
        });

        it('should create a consumer', async () => {
            await expect(kongEnsureConsumer('project1')).resolves.toEqual(
                expect.objectContaining({
                    username: 'project1',
                }),
            );
        });

        it('should create a request transformer', async () => {
            await expect(kongEnsureRequestTransformer('project1', 'integrator1')).resolves.not.toBeNull();
        });

        it('should be able to get the new consumer', async () => {
            await expect(kongGetConsumer('project1')).resolves.toEqual(
                expect.objectContaining({
                    username: 'project1',
                }),
            );
        });
    });

    describe('kong same consumer twice', () => {
        beforeAll(async () => await resetKongConfiguration());

        it('should start with an empty kong configuration', async () => {
            await expect(kongGetConsumer('project1')).resolves.toBeNull();
        });

        it('should confirm consumer idempotency', async () => {
            await expect(kongEnsureConsumer('project1')).resolves.not.toBeNull();
            await expect(kongEnsureConsumer('project1')).resolves.not.toBeNull();
        });

        it('should ensure request transformer idempotency', async () => {
            await expect(kongEnsureRequestTransformer('project1', 'integrator1')).resolves.not.toBeNull();
            await expect(kongEnsureRequestTransformer('project1', 'integrator1')).resolves.not.toBeNull();
        });

        it('should be able to get the new consumer', async () => {
            await expect(kongGetConsumer('project1')).resolves.toEqual(
                expect.objectContaining({
                    username: 'project1',
                }),
            );
        });
    });

    describe('kong keys', () => {
        beforeAll(async () => await resetKongConfiguration());

        it('should start with an empty kong configuration', async () => {
            await expect(kongEnsureConsumer('project1')).resolves.not.toBeNull();
            await expect(kongEnsureRequestTransformer('project1', 'integrator1')).resolves.not.toBeNull();
            await expect(kongGetKey('project1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.toBeNull();
        });

        it('should create a new key', async () => {
            await expect(kongEnsureKey('project1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.toEqual(
                expect.objectContaining({
                    key: '56ce736a-37d4-40e4-8d19-820f849383b3',
                }),
            );
        });

        it('should be able to get the new key', async () => {
            await expect(kongGetKey('project1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.toEqual(
                expect.objectContaining({
                    key: '56ce736a-37d4-40e4-8d19-820f849383b3',
                }),
            );
        });
    });

    describe('kong multiple keys', () => {
        beforeAll(async () => await resetKongConfiguration());

        it('should start with an empty kong configuration', async () => {
            await expect(kongEnsureConsumer('project1')).resolves.not.toBeNull();
            await expect(kongEnsureRequestTransformer('project1', 'integrator1')).resolves.not.toBeNull();
            await expect(kongGetKey('project1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.toBeNull();
            await expect(kongGetKey('project1', 'project1-key2')).resolves.toBeNull();
        });

        it('should confirm two keys for the same project can be created', async () => {
            await expect(kongEnsureKey('project1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.toEqual(
                expect.objectContaining({
                    key: '56ce736a-37d4-40e4-8d19-820f849383b3',
                }),
            );
            await expect(kongEnsureKey('project1', 'project1-key2')).resolves.toEqual(
                expect.objectContaining({
                    key: 'project1-key2',
                }),
            );
        });

        it('should be able to get both new keys', async () => {
            await expect(kongGetKey('project1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.toEqual(
                expect.objectContaining({
                    key: '56ce736a-37d4-40e4-8d19-820f849383b3',
                }),
            );
            await expect(kongGetKey('project1', 'project1-key2')).resolves.toEqual(
                expect.objectContaining({
                    key: 'project1-key2',
                }),
            );
        });
    });

    describe('kong same key twice', () => {
        beforeAll(async () => await resetKongConfiguration());

        it('should start with an empty kong configuration', async () => {
            await expect(kongEnsureConsumer('project1')).resolves.not.toBeNull();
            await expect(kongEnsureRequestTransformer('project1', 'integrator1')).resolves.not.toBeNull();
            await expect(kongGetKey('project1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.toBeNull();
        });

        it('should confirm key creation idempotency', async () => {
            await expect(kongEnsureKey('project1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.toEqual(
                expect.objectContaining({
                    key: '56ce736a-37d4-40e4-8d19-820f849383b3',
                }),
            );
            await expect(kongEnsureKey('project1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.toEqual(
                expect.objectContaining({
                    key: '56ce736a-37d4-40e4-8d19-820f849383b3',
                }),
            );
        });

        it('should be able to get the new key', async () => {
            await expect(kongGetKey('project1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.toEqual(
                expect.objectContaining({
                    key: '56ce736a-37d4-40e4-8d19-820f849383b3',
                }),
            );
        });
    });

    describe('kong acl', () => {
        beforeAll(async () => await resetKongConfiguration());

        it('should start with an empty kong configuration', async () => {
            await expect(kongEnsureConsumer('project1')).resolves.not.toBeNull();
            await expect(kongEnsureRequestTransformer('project1', 'integrator1')).resolves.not.toBeNull();
            await expect(kongEnsureKey('project1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.not.toBeNull();
            await expect(kongGetAcl('project1', 'swap_v1_price_group')).resolves.toBeNull();
        });

        it('should create the project ACL membership', async () => {
            await expect(kongEnsureAcl('project1', 'swap_v1_price_group')).resolves.toEqual(
                expect.objectContaining({
                    group: 'swap_v1_price_group',
                }),
            );
        });
    });

    describe('kong rate limit', () => {
        beforeAll(async () => await resetKongConfiguration());

        it('should start with an empty kong configuration', async () => {
            await expect(kongEnsureConsumer('project1')).resolves.not.toBeNull();
            await expect(kongGetRateLimit('project1', 'swap_price_v1_route_optimism')).resolves.toBeNull();
            await expect(kongGetRateLimit('project1', 'swap_price_v1_route_fantom')).resolves.toBeNull();
        });

        const rateLimit: ZippoRateLimit = {
            second: 2,
            minute: 60,
        };

        it('should add a rate-limit to a route', async () => {
            await expect(kongEnsureRateLimit('project1', 'swap_price_v1_route_optimism', rateLimit)).resolves.toEqual(
                expect.objectContaining({
                    config: expect.objectContaining(rateLimit),
                }),
            );
            await expect(kongEnsureRateLimit('project1', 'swap_price_v1_route_fantom', rateLimit)).resolves.toEqual(
                expect.objectContaining({
                    config: expect.objectContaining(rateLimit),
                }),
            );
        });

        it('should confirm we can get the new rate-limit', async () => {
            await expect(kongGetRateLimit('project1', 'swap_price_v1_route_optimism')).resolves.toEqual(
                expect.objectContaining({
                    config: expect.objectContaining(rateLimit),
                }),
            );
            await expect(kongGetRateLimit('project1', 'swap_price_v1_route_fantom')).resolves.toEqual(
                expect.objectContaining({
                    config: expect.objectContaining(rateLimit),
                }),
            );
        });
    });

    describe('kong rate limit update', () => {
        beforeAll(async () => await resetKongConfiguration());

        it('should start with an empty kong configuration', async () => {
            await expect(kongEnsureConsumer('project1')).resolves.not.toBeNull();
            await expect(kongGetRateLimit('project1', 'swap_price_v1_route_optimism')).resolves.toBeNull();
            await expect(kongGetRateLimit('project1', 'swap_price_v1_route_fantom')).resolves.toBeNull();
        });

        const initialRateLimit: ZippoRateLimit = {
            second: 2,
            minute: 60,
        };

        it('should add a rate-limit to a route', async () => {
            await expect(
                kongEnsureRateLimit('project1', 'swap_price_v1_route_optimism', initialRateLimit),
            ).resolves.toEqual(
                expect.objectContaining({
                    config: expect.objectContaining(initialRateLimit),
                }),
            );
            await expect(
                kongEnsureRateLimit('project1', 'swap_price_v1_route_fantom', initialRateLimit),
            ).resolves.toEqual(
                expect.objectContaining({
                    config: expect.objectContaining(initialRateLimit),
                }),
            );
        });

        const updateRateLimit: ZippoRateLimit = {
            second: 4,
            minute: 100,
        };

        it('should update a rate-limit for a route', async () => {
            await expect(
                kongEnsureRateLimit('project1', 'swap_price_v1_route_optimism', updateRateLimit),
            ).resolves.toEqual(
                expect.objectContaining({
                    config: expect.objectContaining(updateRateLimit),
                }),
            );
            await expect(
                kongEnsureRateLimit('project1', 'swap_price_v1_route_optimism', updateRateLimit),
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
            await expect(kongEnsureConsumer('project1')).resolves.not.toBeNull();
        });

        it('should create a consumer', async () => {
            await expect(kongGetConsumer('project1')).resolves.not.toBeNull();
        });

        it('should remove a consumer', async () => {
            await expect(kongRemoveConsumer('project1')).resolves.toBeTruthy();
        });

        it('should no longer be able to get the consumer', async () => {
            await expect(kongGetConsumer('project1')).resolves.toBeNull();
        });
    });

    describe('kong remove key', () => {
        beforeAll(async () => await resetKongConfiguration());

        it('should start with an empty kong configuration', async () => {
            await expect(kongEnsureConsumer('project1')).resolves.not.toBeNull();
            await expect(kongEnsureKey('project1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.toEqual(
                expect.objectContaining({
                    key: '56ce736a-37d4-40e4-8d19-820f849383b3',
                }),
            );
        });

        it('should add a key to a project', async () => {
            await expect(kongGetKey('project1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.not.toBeNull();
        });

        it('should remove a project key', async () => {
            await expect(kongRemoveKey('project1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.toBeTruthy();
        });

        it('should no longer be able to get the project key', async () => {
            await expect(kongGetKey('project1', '56ce736a-37d4-40e4-8d19-820f849383b3')).resolves.toBeNull();
        });
    });

    describe('kong remove acl', () => {
        beforeAll(async () => await resetKongConfiguration());

        it('should start with an empty kong configuration', async () => {
            await expect(kongEnsureConsumer('project1')).resolves.not.toBeNull();
            await expect(kongGetAcl('project1', 'swap_v1_price_group')).resolves.toBeNull();
        });

        it('should grant ACL membership', async () => {
            await expect(kongEnsureAcl('project1', 'swap_v1_price_group')).resolves.not.toBeNull();
            await expect(kongGetAcl('project1', 'swap_v1_price_group')).resolves.not.toBeNull();
        });

        it('should remove ACL membership', async () => {
            await expect(kongRemoveAcl('project1', 'swap_v1_price_group')).resolves.toBeTruthy();
        });

        it('should confirm the project no longer has ACL membership', async () => {
            await expect(kongGetAcl('project1', 'swap_v1_price_group')).resolves.toBeNull();
        });
    });

    describe('kong remove rate limit', () => {
        beforeAll(async () => await resetKongConfiguration());

        const rateLimit: ZippoRateLimit = {
            second: 2,
            minute: 60,
        };

        it('should start with an empty kong configuration', async () => {
            await expect(kongEnsureConsumer('project1')).resolves.not.toBeNull();
        });

        it('should give the project a rate-limit', async () => {
            await expect(
                kongEnsureRateLimit('project1', 'swap_price_v1_route_optimism', rateLimit),
            ).resolves.not.toBeNull();
            await expect(
                kongEnsureRateLimit('project1', 'swap_price_v1_route_fantom', rateLimit),
            ).resolves.not.toBeNull();
            await expect(kongGetRateLimit('project1', 'swap_price_v1_route_optimism')).resolves.not.toBeNull();
            await expect(kongGetRateLimit('project1', 'swap_price_v1_route_fantom')).resolves.not.toBeNull();
        });

        it('should remove rate-limit from project', async () => {
            await expect(kongRemoveRateLimit('project1', 'swap_price_v1_route_optimism')).resolves.toBeTruthy();
            await expect(kongRemoveRateLimit('project1', 'swap_price_v1_route_fantom')).resolves.toBeTruthy();
        });

        it('should no longer have a rate-limit for the project', async () => {
            await expect(kongGetRateLimit('project1', 'swap_price_v1_route_optimism')).resolves.toBeNull();
            await expect(kongGetRateLimit('project1', 'swap_price_v1_route_fantom')).resolves.toBeNull();
        });
    });
});
