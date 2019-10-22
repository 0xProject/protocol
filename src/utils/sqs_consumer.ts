// tslint:disable: max-classes-per-file
import { SQS } from 'aws-sdk';
import delay from 'delay';

import { ONE_SECOND_MS } from '../constants';
import { logger } from '../logger';

import { SqsClient } from './sqs_client';

export type MessageHandler = (message: SQS.Types.Message) => Promise<any>;

export class SqsRetryableError extends Error {}
export class SqsConsumer {
    private readonly _id: string;
    private readonly _sqsClient: SqsClient;
    private readonly _beforeHandle?: () => Promise<boolean>;
    private readonly _handleMessage: MessageHandler;
    private readonly _afterHandle?: (message: SQS.Types.Message, error?: Error) => Promise<any>;
    private _isConsuming: boolean;

    constructor(params: {
        id: string;
        sqsClient: SqsClient;
        beforeHandle?: () => Promise<boolean>;
        handleMessage: MessageHandler;
        afterHandle?: (message: SQS.Types.Message, error?: Error) => Promise<any>;
    }) {
        this._id = params.id;
        this._sqsClient = params.sqsClient;
        this._beforeHandle = params.beforeHandle;
        this._handleMessage = params.handleMessage;
        this._afterHandle = params.afterHandle;
        this._isConsuming = false;
    }

    public stop(): void {
        this._isConsuming = false;
    }

    public async consumeAsync(): Promise<void> {
        if (this._isConsuming) {
            return;
        }

        this._isConsuming = true;
        while (this._isConsuming) {
            await this.consumeOnceAsync();
        }
    }

    public async consumeOnceAsync(): Promise<void> {
        // Run the before hook
        if (this._beforeHandle) {
            let beforeCheck;
            try {
                beforeCheck = await this._beforeHandle();
            } catch (e) {
                logger.error({ id: this._id, errorMessage: e.message }, 'Error encountered in the preHandle check');
                return;
            }

            if (!beforeCheck) {
                logger.warn({ id: this._id }, 'Before validation failed');
                await delay(ONE_SECOND_MS);
                return;
            }
        }

        // Receive message
        const message = await this._sqsClient.receiveMessageAsync();

        // No message
        if (message === null) {
            return;
        }

        // Handle message
        let error: Error | undefined;
        try {
            await this._handleMessage(message);
        } catch (err) {
            error = err;
            logger.error(
                { errorMessage: err.message, message, id: this._id },
                'Encountered error while handling message',
            );

            if (err instanceof SqsRetryableError) {
                logger.info({ message, id: this._id }, 'Retrying message');
                // Retry message
                await this._sqsClient.changeMessageVisibilityAsync(message.ReceiptHandle!, 0);
                await delay(ONE_SECOND_MS);
                return;
            }
        }

        // Delete message
        await this._sqsClient.deleteMessageAsync(message.ReceiptHandle!);

        // Run the after hook
        if (this._afterHandle) {
            await this._afterHandle(message, error);
        }
    }
}
