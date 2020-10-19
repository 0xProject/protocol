import { expect } from '@0x/contracts-test-utils';
import * as express from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import * as core from 'express-serve-static-core';
import 'mocha';
import { Counter } from 'prom-client';
import * as request from 'supertest';

import { METRICS_PATH } from '../src/constants';
import { createMetricsRouter } from '../src/routers/metrics_router';
import { MetricsService } from '../src/services/metrics_service';

const SUITE_NAME = 'metrics tests';
const metricsPath = '/metrics';

let app: express.Express;

const expectMetric = async (testApp: core.Express, metricName: string, value?: string): Promise<void> => {
    await request(testApp)
        .get(metricsPath)
        .then(response => {
            expect(response.text).to.include(metricName);
            if (value !== undefined) {
                expect(response.text).to.include(`${metricName} ${value}`);
            }
        });
};

describe(SUITE_NAME, () => {
    before(async () => {
        app = express();
        const metricsService = new MetricsService();
        const metricsRouter = createMetricsRouter(metricsService);
        app.use(METRICS_PATH, metricsRouter);
    });
    describe(metricsPath, () => {
        it('returns default prometheus metrics', async () => {
            await expectMetric(app, 'process_cpu_user_seconds_total');
        });
        it('returns a custom metric correctly', async () => {
            const customMetricName = 'test_counter_metric';
            const counter = new Counter({
                name: customMetricName,
                help: 'testing',
            });
            counter.inc();
            await expectMetric(app, customMetricName, '1');
        });
    });
});
