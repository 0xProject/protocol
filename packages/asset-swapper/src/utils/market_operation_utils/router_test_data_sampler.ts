import { ChainId } from '@0x/contract-addresses';
import { OptimizerCapture } from '@0x/neon-router';
import { CreateBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const SAMPLE_THRESHOLD = 0.05;
const UPLOAD_SIZE = 1000;
const REGION = process.env.AWS_S3_REGION ? process.env.AWS_S3_REGION : 'us-west-1';

export class TestDataSampler {
    private static _instance: TestDataSampler;
    private _routes: OptimizerCapture[] = [];
    private readonly _chainId;
    public static getInstance(chainId: ChainId): TestDataSampler {
        // singleton implementation
        if (!TestDataSampler._instance) {
            TestDataSampler._instance = new TestDataSampler(chainId);
        }
        return TestDataSampler._instance;
    }

    public sampleRoute(route: OptimizerCapture): void {
        if (Math.random() < SAMPLE_THRESHOLD) {
            this._routes.push(route);

            if (this._routes.length > UPLOAD_SIZE) {
                const toUpload = this._routes;
                this._routes = [];
                const file = `${this._chainId}-${Date.now()}`;
                const s3Client = new S3Client({ region: REGION });
                // Set the parameters
                const params = {
                    Bucket: file, // The name of the bucket.
                    Key: `${file}-sample.txt`, // The name of the object.
                    Body: JSON.stringify(toUpload), // The content of the object.
                };

                const run = async () => {
                    // Create an Amazon S3 bucket.
                    await s3Client.send(new CreateBucketCommand({ Bucket: params.Bucket }));
                    // Create an object and upload it to the Amazon S3 bucket.
                    await s3Client.send(new PutObjectCommand(params));
                };
                run()
                    .then()
                    .catch();
            }
        }
    }

    public len(): number {
        return this._routes.length;
    }

    private constructor(chainId: ChainId) {
        this._chainId = chainId;
    }
}
