import { SQS } from 'aws-sdk';

import { LONG_POLLING_WAIT_TIME_SECONDS, SINGLE_MESSAGE } from '../constants';

/**
 * SqsClient wraps SQS, making it far easier to unit test SQS and ignore SQS details
 */
export class SqsClient {
    constructor(private readonly _sqs: SQS, private readonly _queueUrl: string) {}

    public async receiveMessageAsync(): Promise<SQS.Message | null> {
        const response = await this._sqs
            .receiveMessage({
                MaxNumberOfMessages: SINGLE_MESSAGE,
                WaitTimeSeconds: LONG_POLLING_WAIT_TIME_SECONDS,
                QueueUrl: this._queueUrl,
            })
            .promise();

        if (response?.Messages?.length !== 1) {
            return null;
        }
        return response.Messages[0];
    }

    public async changeMessageVisibilityAsync(receiptHandle: string, visibilityTimeout: number): Promise<void> {
        await this._sqs
            .changeMessageVisibility({
                QueueUrl: this._queueUrl,
                ReceiptHandle: receiptHandle,
                VisibilityTimeout: visibilityTimeout,
            })
            .promise();
    }

    public async deleteMessageAsync(receiptHandle: string): Promise<void> {
        await this._sqs
            .deleteMessage({
                QueueUrl: this._queueUrl,
                ReceiptHandle: receiptHandle,
            })
            .promise();
    }
}
