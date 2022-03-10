import { ChainId } from '@0x/contract-addresses';
import { OptimizerCapture } from '@0x/neon-router';
import { S3Client, PutObjectCommand, CreateBucketCommand } from "@aws-sdk/client-s3";

const SAMPLE_THRESHOLD = 0.05;
const UPLOAD_SIZE = 1000;
const REGION = process.env.AWS_S3_REGION? process.env.AWS_S3_REGION : "us-west-1";

export class TestDataSampler {
    private static instance: TestDataSampler;
    private routes: Array<OptimizerCapture> = [];
    private readonly chainId;
    private constructor(chainId: ChainId) {
        this.chainId = chainId;
    }
    public static getInstance(chainId: ChainId): TestDataSampler {
        // singleton implementation
        if (!TestDataSampler.instance) {
            TestDataSampler.instance = new TestDataSampler(chainId);
        }
        return TestDataSampler.instance;
    }

    public sampleRoute(route: OptimizerCapture) {
        if (Math.random() < SAMPLE_THRESHOLD) {
            this.routes.push(route);

            if (this.routes.length > UPLOAD_SIZE) {
                const toUpload = this.routes;
                this.routes = [];
                const file = `${this.chainId}-${Date.now()}`;
                const s3Client = new S3Client({ region: REGION });
                // Set the parameters
                const params = {
                    Bucket: file, // The name of the bucket.
                    Key: `${file}-sample.txt`, // The name of the object.
                    Body: JSON.stringify(toUpload), // The content of the object.
                };

                const run = async () => {
                    // Create an Amazon S3 bucket.
                    try {
                      const data = await s3Client.send(
                          new CreateBucketCommand({ Bucket: params.Bucket })
                      );
                    } catch (err) {
                      console.log("Create S3 bucket; Error:", err);
                    }
                    // Create an object and upload it to the Amazon S3 bucket.
                    try {
                      const results = await s3Client.send(new PutObjectCommand(params));
                    } catch (err) {
                      console.log("Upload to S3 bucket; Error:", err);
                    }
                };
                run();
            }
        }
    }

    public len(): number {
        return this.routes.length;
    }
};