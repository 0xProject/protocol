// tslint:disable: max-classes-per-file
import * as Sentry from '@sentry/node';
import { Transaction as SentryTransaction } from '@sentry/types';
import { SQS } from 'aws-sdk';
import delay from 'delay';

import { SENTRY_DSN } from '../config';
import { ONE_SECOND_MS } from '../core/constants';
import { logger } from '../logger';

import { SqsClient } from './sqs_client';

// $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MessageHandler = (message: SQS.Types.Message) => Promise<any>;

export class SqsRetryableError extends Error {}
export class SqsConsumer {
    private readonly _workerIndex: number;
    private readonly _workerAddress: string;
    private readonly _sqsClient: SqsClient;
    private readonly _beforeHandle?: () => Promise<boolean>;
    private readonly _handleMessage: MessageHandler;
    // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly _afterHandle?: (message: SQS.Types.Message, error?: Error) => Promise<any>;
    private _isConsuming: boolean;

    constructor(params: {
        workerIndex: number;
        workerAddress: string;
        sqsClient: SqsClient;
        beforeHandle?: () => Promise<boolean>;
        handleMessage: MessageHandler;
        // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        afterHandle?: (message: SQS.Types.Message, error?: Error) => Promise<any>;
    }) {
        this._workerIndex = params.workerIndex;
        this._workerAddress = params.workerAddress;
        this._sqsClient = params.sqsClient;
        this._beforeHandle = params.beforeHandle;
        this._handleMessage = params.handleMessage;
        this._afterHandle = params.afterHandle;
        this._isConsuming = false;
    }

    public get workerIndex(): number {
        return this._workerIndex;
    }

    public get workerAddress(): string {
        return this._workerAddress;
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

    /**
     * Decorates _consumeOnceInternalAsync with Sentry observability
     */
    public async consumeOnceAsync(): Promise<void> {
        let transaction: SentryTransaction | undefined;
        if (SENTRY_DSN) {
            transaction = Sentry.startTransaction({
                name: 'Worker Transaction',
            });
        }

        try {
            await this._consumeOnceInternalAsync();
        } catch (e) {
            if (SENTRY_DSN) {
                Sentry.captureException(e);
            }
            logger.error(
                { id: this._workerAddress, workerIndex: this._workerIndex, errorMessage: e.message },
                `Encountered error when consuming from the queue`,
            );
        } finally {
            if (SENTRY_DSN) {
                transaction?.finish();
            }
        }
    }

    private async _consumeOnceInternalAsync(): Promise<void> {
        // Run the before hook
        if (this._beforeHandle) {
            let beforeCheck;
            try {
                beforeCheck = await this._beforeHandle();
            } catch (e) {
                logger.error(
                    { id: this._workerAddress, workerIndex: this._workerIndex, errorMessage: e.message },
                    'Error encountered in the preHandle check',
                );
                throw e;
            }

            if (!beforeCheck) {
                const errorMessage = 'Before validation failed';
                logger.warn({ id: this._workerAddress, workerIndex: this._workerIndex }, errorMessage);
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
                { errorMessage: err.message, message, id: this._workerAddress, workerIndex: this._workerIndex },
                'Encountered error while handling message',
            );

            if (err instanceof SqsRetryableError) {
                logger.info({ message, id: this._workerAddress, workerIndex: this._workerIndex }, 'Retrying message');
                // Retry message
                // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                await this._sqsClient.changeMessageVisibilityAsync(message.ReceiptHandle!, 0);
                await delay(ONE_SECOND_MS);
                throw err;
            }
        }

        // Delete message
        // $eslint-fix-me https://github.com/rhinodavid/eslint-fix-me
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        await this._sqsClient.deleteMessageAsync(message.ReceiptHandle!);

        // Run the after hook
        if (this._afterHandle) {
            await this._afterHandle(message, error);
        }

        if (error) {
            throw error;
        }
    }
}
