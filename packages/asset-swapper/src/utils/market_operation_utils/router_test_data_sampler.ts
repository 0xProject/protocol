import { ChainId } from '@0x/contract-addresses';
import { OptimizerCapture } from '@0x/neon-router';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

import { DEFAULT_WARNING_LOGGER } from '../../constants';

export const SAMPLE_THRESHOLD = 0.003;
const UPLOAD_SIZE = 500;
const REGION = process.env.AWS_S3_REGION ? process.env.AWS_S3_REGION : 'us-west-1';
const S3_BUCKET = process.env.S3_BUCKET ? process.env.S3_BUCKET : undefined;

export class TestDataSampler {
    private static _instance: TestDataSampler;
    private static readonly _s3Client = new S3Client({ region: REGION });
    private _routes: OptimizerCapture[] = [];
    private readonly _chainId;
    public static getInstance(chainId: ChainId): TestDataSampler {
        // singleton implementation
        if (!TestDataSampler._instance) {
            TestDataSampler._instance = new TestDataSampler(chainId);
        }
        return TestDataSampler._instance;
    }

    public static sampleRoute(chainId: ChainId, route: OptimizerCapture): void {
        const sampler = TestDataSampler.getInstance(chainId);
        sampler._routes.push(route);

        if (sampler._routes.length > UPLOAD_SIZE) {
            const toUpload = sampler._routes;
            sampler._routes = [];
            if (S3_BUCKET === undefined) {
                return;
            }

            // Set the parameters
            const params = {
                Bucket: S3_BUCKET, // The name of the bucket.
                Key: `${sampler._chainId}/sample-${Date.now()}.json`, // The name of the object.
                Body: JSON.stringify(toUpload), // The content of the object.
            };

            // Create an object and upload it to the Amazon S3 bucket.
            TestDataSampler._s3Client.send(new PutObjectCommand(params)).catch(err => {
                DEFAULT_WARNING_LOGGER(err, 'Failed to upload routing test sample to s3');
            });
        }
    }

    public len(): number {
        return this._routes.length;
    }

    private constructor(chainId: ChainId) {
        this._chainId = chainId;
    }
}
