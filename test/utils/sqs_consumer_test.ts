// tslint:disable:custom-no-magic-numbers
// tslint:disable:no-empty
// tslint:disable:max-file-line-count

import { expect } from '@0x/contracts-test-utils';
import { anyString, anything, instance, mock, verify, when } from 'ts-mockito';

import { SqsClient } from '../../src/utils/sqs_client';
import { SqsConsumer, SqsRetryableError } from '../../src/utils/sqs_consumer';

describe('SqsConsumer', () => {
    describe('consumeOnceAsync', () => {
        describe('beforeHandle', () => {
            it('should not call handleMessage if beforeHandle returns false', async () => {
                // Given
                const sqsClientMock = mock(SqsClient);
                let isHandleCalled = false;
                const beforeHandle = async () => false;
                const handleMessage = async () => {
                    isHandleCalled = true;
                };

                const consumer = new SqsConsumer({
                    id: 'id',
                    sqsClient: sqsClientMock,
                    handleMessage,
                    beforeHandle,
                });

                // When
                await consumer.consumeOnceAsync();

                // Then
                expect(isHandleCalled).to.eq(false);
            });

            it('should not call handleMessage if beforeHandle throws an error', async () => {
                // Given
                const sqsClientMock = mock(SqsClient);
                let isHandleCalled = false;
                const beforeHandle = async () => Promise.reject('error!');
                const handleMessage = async () => {
                    isHandleCalled = true;
                };

                const consumer = new SqsConsumer({
                    id: 'id',
                    sqsClient: sqsClientMock,
                    handleMessage,
                    beforeHandle,
                });

                // When
                await consumer.consumeOnceAsync();

                // Then
                expect(isHandleCalled).to.eq(false);
            });

            it('should call handleMessage if no beforeHandle', async () => {
                // Given
                const sqsClientMock = mock(SqsClient);
                when(sqsClientMock.receiveMessageAsync()).thenResolve({
                    Body: '0xdeadbeef',
                });
                const sqsClientInstance = instance(sqsClientMock);
                let isHandleCalled = false;
                const handleMessage = async () => {
                    isHandleCalled = true;
                };

                const consumer = new SqsConsumer({
                    id: 'id',
                    sqsClient: sqsClientInstance,
                    handleMessage,
                });

                // When
                await consumer.consumeOnceAsync();

                // Then
                expect(isHandleCalled).to.eq(true);
            });

            it('should call handleMessage if beforeHandle returns true', async () => {
                // Given
                const sqsClientMock = mock(SqsClient);
                when(sqsClientMock.receiveMessageAsync()).thenResolve({
                    Body: '0xdeadbeef',
                });
                const sqsClientInstance = instance(sqsClientMock);
                const beforeHandle = async () => true;
                let isHandleCalled = false;
                const handleMessage = async () => {
                    isHandleCalled = true;
                };

                const consumer = new SqsConsumer({
                    id: 'id',
                    sqsClient: sqsClientInstance,
                    beforeHandle,
                    handleMessage,
                });

                // When
                await consumer.consumeOnceAsync();

                // Then
                expect(isHandleCalled).to.eq(true);
            });
        });

        describe('handleMessage', () => {
            it('should not be called if no message is recieved', async () => {
                // Given
                const sqsClientMock = mock(SqsClient);
                when(sqsClientMock.receiveMessageAsync()).thenResolve(null);
                const sqsClientInstance = instance(sqsClientMock);

                let isHandleCalled = false;
                const handleMessage = async () => {
                    isHandleCalled = true;
                };

                const consumer = new SqsConsumer({
                    id: 'id',
                    sqsClient: sqsClientInstance,
                    handleMessage,
                });

                // When
                await consumer.consumeOnceAsync();

                // Then
                expect(isHandleCalled).to.eq(false);
            });

            it('should call changeMessageVisibility if a SqsRetryableError is encountered (triggers a retry)', async () => {
                // Given
                const sqsClientMock = mock(SqsClient);
                when(sqsClientMock.receiveMessageAsync()).thenResolve({
                    Body: '0xdeadbeef',
                    ReceiptHandle: '1',
                });
                const sqsClientInstance = instance(sqsClientMock);

                const handleMessage = async () => {
                    throw new SqsRetryableError('error');
                };

                const consumer = new SqsConsumer({
                    id: 'id',
                    sqsClient: sqsClientInstance,
                    handleMessage,
                });

                // When
                await consumer.consumeOnceAsync();

                // Then
                verify(sqsClientMock.changeMessageVisibilityAsync(anyString(), 0)).once();
            });

            it('should not call changeMessageVisibility if a non SqsRetryableError is encountered', async () => {
                // Given
                const sqsClientMock = mock(SqsClient);
                when(sqsClientMock.receiveMessageAsync()).thenResolve({
                    Body: '0xdeadbeef',
                    ReceiptHandle: '1',
                });
                const sqsClientInstance = instance(sqsClientMock);

                const handleMessage = async () => {
                    throw new Error('error');
                };

                const consumer = new SqsConsumer({
                    id: 'id',
                    sqsClient: sqsClientInstance,
                    handleMessage,
                });

                // When
                await consumer.consumeOnceAsync();

                // Then
                verify(sqsClientMock.changeMessageVisibilityAsync(anything(), anything())).never();
            });

            it('should call deleteMessageAsync if message is successfully handled', async () => {
                // Given
                const sqsClientMock = mock(SqsClient);
                when(sqsClientMock.receiveMessageAsync()).thenResolve({
                    Body: '0xdeadbeef',
                    ReceiptHandle: '1',
                });
                const sqsClientInstance = instance(sqsClientMock);

                let isHandleCalled = false;
                const handleMessage = async () => {
                    isHandleCalled = true;
                };

                const consumer = new SqsConsumer({
                    id: 'id',
                    sqsClient: sqsClientInstance,
                    handleMessage,
                });

                // When
                await consumer.consumeOnceAsync();

                // Then
                expect(isHandleCalled).to.eq(true);
                verify(sqsClientMock.deleteMessageAsync(anyString())).once();
            });
        });

        describe('afterHandle', () => {
            it('should be called once everything is successful', async () => {
                // Given
                const sqsClientMock = mock(SqsClient);
                when(sqsClientMock.receiveMessageAsync()).thenResolve({
                    Body: '0xdeadbeef',
                    ReceiptHandle: '1',
                });

                const sqsClientInstance = instance(sqsClientMock);
                let isAfterCalled = false;
                const afterHandle = async () => {
                    isAfterCalled = true;
                };

                const consumer = new SqsConsumer({
                    id: 'id',
                    sqsClient: sqsClientInstance,
                    handleMessage: async () => {},
                    afterHandle,
                });

                // When
                await consumer.consumeOnceAsync();

                // Then
                expect(isAfterCalled).to.eq(true);
            });

            it('should be passed an error if a non-retryable error was encountered', async () => {
                // Given
                const sqsClientMock = mock(SqsClient);
                when(sqsClientMock.receiveMessageAsync()).thenResolve({
                    Body: '0xdeadbeef',
                    ReceiptHandle: '1',
                });

                const sqsClientInstance = instance(sqsClientMock);
                let isAfterCalledWithError = false;

                const consumer = new SqsConsumer({
                    id: 'id',
                    sqsClient: sqsClientInstance,
                    handleMessage: async () => {
                        throw new Error();
                    },
                    afterHandle: async (_, error) => {
                        if (error) {
                            isAfterCalledWithError = true;
                        }
                    },
                });

                // When
                await consumer.consumeOnceAsync();

                // Then
                expect(isAfterCalledWithError).to.eq(true);
            });
        });
    });
});
