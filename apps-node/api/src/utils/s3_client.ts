import { S3 } from 'aws-sdk';

/**
 * S3Client wraps S3, abstracting away S3 details
 */
export class S3Client {
    constructor(private readonly _s3: S3) {}

    /**
     * Check if a file exists in S3 without obtaining its content. If it exists,
     * returns the `lastModified` timestamp with the result.
     */
    public async hasFileAsync(
        bucket: string,
        fileName: string,
    ): Promise<{ exists: true; lastModified: Date } | { exists: false; lastModified: undefined }> {
        const bucketParams = {
            Bucket: bucket,
            Key: fileName,
        };

        try {
            const response = await this._s3.headObject(bucketParams).promise();
            if (response.LastModified) {
                return { exists: true, lastModified: response.LastModified };
            } else {
                throw new Error(`Failed to get metadata of S3 object ${fileName} in bucket ${bucket}.`);
            }
        } catch (error) {
            if (error.code === 'NotFound') {
                return { exists: false, lastModified: undefined };
            } else {
                throw error;
            }
        }
    }

    /**
     * Obtain the content of a file in S3. This method assumes the specified file exists
     * and will throw if the request failed for whatever reasons. On successful query it
     * always returns the `lastModified` timestamp with the result.
     */
    public async getFileContentAsync(
        bucket: string,
        fileName: string,
    ): Promise<{ content: string; lastModified: Date }> {
        const bucketParams = {
            Bucket: bucket,
            Key: fileName,
        };

        const response = await this._s3.getObject(bucketParams).promise();
        if (response && response.Body && response.LastModified) {
            return { content: response.Body.toString(), lastModified: response.LastModified };
        } else {
            throw new Error(`Failed to get content of S3 object ${fileName} in bucket ${bucket}.`);
        }
    }
}
