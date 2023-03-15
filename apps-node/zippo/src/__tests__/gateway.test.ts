import { kongMock } from './mocks/kongMock';

import { provisionIntegratorAccess } from '../gateway';
import { ZippoRouteTag } from '../gateway/types';

describe('gateway tests', () => {
    describe('provision integrator', () => {
        it('set up mocks', () => {
            kongMock.kongEnsureConsumer.mockResolvedValue({
                id: '156f70c1-e993-4293-a4a4-528190f2b46c',
                created_at: 12345,
                username: 'app12345',
            });
            kongMock.kongEnsureRequestTransformer.mockResolvedValue(true);
            kongMock.kongEnsureAcl.mockResolvedValue({
                id: '256f70c1-e993-4293-a4a4-528190f2b46c',
                consumer: { id: '356f70c1-e993-4293-a4a4-528190f2b46c' },
                created_at: 12345,
                group: 'swap_v1_price_group',
            });
            kongMock.kongEnsureRateLimit.mockResolvedValue({
                id: '456f70c1-e993-4293-a4a4-528190f2b46c',
                consumer: { id: '556f70c1-e993-4293-a4a4-528190f2b46c' },
                created_at: 12345,
                name: 'rate-limit',
                enabled: true,
                config: {
                    minute: 30,
                },
            });
        });

        it('should provision integrator access', async () => {
            await expect(
                provisionIntegratorAccess('integrator12345', 'app12345', [ZippoRouteTag.SwapV1Price], [{ minute: 30 }]),
            ).resolves.toBeTruthy();
        });

        it('should confirm mock calls', () => {
            expect(kongMock.kongEnsureConsumer.mock.calls[0][0]).toEqual('app12345');
            expect(kongMock.kongEnsureRequestTransformer.mock.calls[0][0]).toEqual('app12345');
            expect(kongMock.kongEnsureRequestTransformer.mock.calls[0][1]).toEqual('integrator12345');
            expect(kongMock.kongEnsureAcl.mock.calls[0][0]).toEqual('app12345');
            expect(kongMock.kongEnsureAcl.mock.calls[0][1]).toEqual('swap_v1_price_group');
            expect(kongMock.kongEnsureRateLimit.mock.calls[0][0]).toEqual('app12345');
            expect(kongMock.kongEnsureRateLimit.mock.calls[0][1]).toEqual('swap_price_v1_route_optimism');
            expect(kongMock.kongEnsureRateLimit.mock.calls[0][2]).toEqual({
                minute: 30,
            });
            expect(kongMock.kongEnsureRateLimit.mock.calls[1][1]).toEqual('swap_price_v1_route_fantom');
            expect(kongMock.kongEnsureRateLimit.mock.calls[1][2]).toEqual({
                minute: 30,
            });
        });
    });
});
