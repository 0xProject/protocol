// tslint:disable:custom-no-magic-numbers
// tslint:disable:no-empty
// tslint:disable:max-file-line-count

import { FillQuoteTransformerOrderType, ProtocolFeeUtils, QuoteRequestor, SignatureType } from '@0x/asset-swapper';
import { ONE_SECOND_MS } from '@0x/asset-swapper/lib/src/utils/market_operation_utils/constants';
import { getContractAddressesForChainOrThrow } from '@0x/contract-addresses';
import { expect } from '@0x/contracts-test-utils';
import { MetaTransaction, RfqOrder } from '@0x/protocol-utils';
import { BigNumber } from '@0x/utils';
import { anything, instance, mock, when } from 'ts-mockito';

import { ONE_MINUTE_MS } from '../../src/constants';
import { RfqmService } from '../../src/services/rfqm_service';
import { RfqBlockchainUtils } from '../../src/utils/rfq_blockchain_utils';

const NEVER_EXPIRES = new BigNumber(9999999999999999);
const MOCK_WORKER_REGISTRY_ADDRESS = '0x1023331a469c6391730ff1E2749422CE8873EC38';

describe('RfqmService', () => {
    describe('fetchIndicativeQuoteAsync', () => {
        describe('sells', async () => {
            it('should fetch indicative quote', async () => {
                // Given
                const quoteRequestorMock = mock(QuoteRequestor);
                when(
                    quoteRequestorMock.requestRfqmIndicativeQuotesAsync(
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                    ),
                ).thenResolve([
                    {
                        makerToken: 'DAI',
                        makerAmount: new BigNumber(101),
                        takerToken: 'SUSD',
                        takerAmount: new BigNumber(100),
                        expiry: NEVER_EXPIRES,
                    },
                ]);

                const quoteRequestorInstance = instance(quoteRequestorMock);
                const protocolFeeUtilsMock = mock(ProtocolFeeUtils);
                const contractAddresses = getContractAddressesForChainOrThrow(1);
                const rfqBlockchainUtilsMock = mock(RfqBlockchainUtils);
                const service = new RfqmService(
                    quoteRequestorInstance,
                    protocolFeeUtilsMock,
                    contractAddresses,
                    MOCK_WORKER_REGISTRY_ADDRESS,
                    rfqBlockchainUtilsMock,
                );

                // When
                const res = await service.fetchIndicativeQuoteAsync({
                    apiKey: 'some-api-key',
                    buyToken: 'DAI',
                    sellToken: 'SUSD',
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    sellAmount: new BigNumber(100),
                });

                // Then
                if (res === null) {
                    expect.fail('res is null, but not expected to be null');
                    return;
                }
                expect(res.sellAmount.toNumber()).to.be.at.least(100);
                expect(res.price.toNumber()).to.equal(1.01);
            });

            it('should only return an indicative quote that is 100% filled when selling', async () => {
                // Given
                const partialFillQuote = {
                    makerToken: 'DAI',
                    makerAmount: new BigNumber(55),
                    takerToken: 'SUSD',
                    takerAmount: new BigNumber(50),
                    expiry: NEVER_EXPIRES,
                };
                const fullQuote = {
                    makerToken: 'DAI',
                    makerAmount: new BigNumber(105),
                    takerToken: 'SUSD',
                    takerAmount: new BigNumber(100),
                    expiry: NEVER_EXPIRES,
                };
                const quoteRequestorMock = mock(QuoteRequestor);
                when(
                    quoteRequestorMock.requestRfqmIndicativeQuotesAsync(
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                    ),
                ).thenResolve([partialFillQuote, fullQuote]);

                const quoteRequestorInstance = instance(quoteRequestorMock);
                const protocolFeeUtilsMock = mock(ProtocolFeeUtils);
                const contractAddresses = getContractAddressesForChainOrThrow(1);
                const rfqBlockchainUtilsMock = mock(RfqBlockchainUtils);
                const service = new RfqmService(
                    quoteRequestorInstance,
                    protocolFeeUtilsMock,
                    contractAddresses,
                    MOCK_WORKER_REGISTRY_ADDRESS,
                    rfqBlockchainUtilsMock,
                );

                // When
                const res = await service.fetchIndicativeQuoteAsync({
                    apiKey: 'some-api-key',
                    buyToken: 'DAI',
                    sellToken: 'SUSD',
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    sellAmount: new BigNumber(100),
                });

                // Then
                if (res === null) {
                    expect.fail('res is null, but not expected to be null');
                    return;
                }
                expect(res.sellAmount.toNumber()).to.equal(100);
                expect(res.price.toNumber()).to.equal(1.05);
            });

            it('should return null if no quotes are valid', async () => {
                // Given
                const partialFillQuote = {
                    makerToken: 'DAI',
                    makerAmount: new BigNumber(55),
                    takerToken: 'SUSD',
                    takerAmount: new BigNumber(50),
                    expiry: NEVER_EXPIRES,
                };
                const quoteRequestorMock = mock(QuoteRequestor);
                when(
                    quoteRequestorMock.requestRfqmIndicativeQuotesAsync(
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                    ),
                ).thenResolve([partialFillQuote]);

                const quoteRequestorInstance = instance(quoteRequestorMock);
                const protocolFeeUtilsMock = mock(ProtocolFeeUtils);
                const contractAddresses = getContractAddressesForChainOrThrow(1);
                const rfqBlockchainUtilsMock = mock(RfqBlockchainUtils);
                const service = new RfqmService(
                    quoteRequestorInstance,
                    protocolFeeUtilsMock,
                    contractAddresses,
                    MOCK_WORKER_REGISTRY_ADDRESS,
                    rfqBlockchainUtilsMock,
                );

                // Expect
                const res = await service.fetchIndicativeQuoteAsync({
                    apiKey: 'some-api-key',
                    buyToken: 'DAI',
                    sellToken: 'SUSD',
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    sellAmount: new BigNumber(100),
                });
                expect(res).to.eq(null);
            });

            it('should return an indicative quote that can fill more than 100%', async () => {
                // Given
                const worsePricing = {
                    makerToken: 'DAI',
                    makerAmount: new BigNumber(101),
                    takerToken: 'SUSD',
                    takerAmount: new BigNumber(100),
                    expiry: NEVER_EXPIRES,
                };
                const betterPricing = {
                    makerToken: 'DAI',
                    makerAmount: new BigNumber(222),
                    takerToken: 'SUSD',
                    takerAmount: new BigNumber(200),
                    expiry: NEVER_EXPIRES,
                };
                const quoteRequestorMock = mock(QuoteRequestor);
                when(
                    quoteRequestorMock.requestRfqmIndicativeQuotesAsync(
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                    ),
                ).thenResolve([worsePricing, betterPricing]);

                const quoteRequestorInstance = instance(quoteRequestorMock);
                const protocolFeeUtilsMock = mock(ProtocolFeeUtils);
                const contractAddresses = getContractAddressesForChainOrThrow(1);
                const rfqBlockchainUtilsMock = mock(RfqBlockchainUtils);
                const service = new RfqmService(
                    quoteRequestorInstance,
                    protocolFeeUtilsMock,
                    contractAddresses,
                    MOCK_WORKER_REGISTRY_ADDRESS,
                    rfqBlockchainUtilsMock,
                );

                // When
                const res = await service.fetchIndicativeQuoteAsync({
                    apiKey: 'some-api-key',
                    buyToken: 'DAI',
                    sellToken: 'SUSD',
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    sellAmount: new BigNumber(100),
                });

                // Then
                if (res === null) {
                    expect.fail('res is null, but not expected to be null');
                    return;
                }
                expect(res.sellAmount.toNumber()).to.equal(200);
                expect(res.price.toNumber()).to.equal(1.11);
            });

            it('should ignore quotes that are for the wrong pair', async () => {
                // Given
                const worsePricing = {
                    makerToken: 'DAI',
                    makerAmount: new BigNumber(101),
                    takerToken: 'SUSD',
                    takerAmount: new BigNumber(100),
                    expiry: NEVER_EXPIRES,
                };
                const wrongPair = {
                    makerToken: 'BUSD',
                    makerAmount: new BigNumber(111),
                    takerToken: 'SUSD',
                    takerAmount: new BigNumber(100),
                    expiry: NEVER_EXPIRES,
                };
                const quoteRequestorMock = mock(QuoteRequestor);
                when(
                    quoteRequestorMock.requestRfqmIndicativeQuotesAsync(
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                    ),
                ).thenResolve([worsePricing, wrongPair]);

                const quoteRequestorInstance = instance(quoteRequestorMock);
                const protocolFeeUtilsMock = mock(ProtocolFeeUtils);
                const contractAddresses = getContractAddressesForChainOrThrow(1);
                const rfqBlockchainUtilsMock = mock(RfqBlockchainUtils);
                const service = new RfqmService(
                    quoteRequestorInstance,
                    protocolFeeUtilsMock,
                    contractAddresses,
                    MOCK_WORKER_REGISTRY_ADDRESS,
                    rfqBlockchainUtilsMock,
                );

                // When
                const res = await service.fetchIndicativeQuoteAsync({
                    apiKey: 'some-api-key',
                    buyToken: 'DAI',
                    sellToken: 'SUSD',
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    sellAmount: new BigNumber(100),
                });

                // Then
                if (res === null) {
                    expect.fail('res is null, but not expected to be null');
                    return;
                }
                expect(res.sellAmount.toNumber()).to.equal(100);
                expect(res.price.toNumber()).to.equal(1.01); // Worse pricing wins because better pricing is for wrong pair
            });

            it('should ignore quotes that expire within 3 minutes', async () => {
                // Given
                const inOneMinute = (Date.now() + ONE_MINUTE_MS) / ONE_SECOND_MS;
                const expiresSoon = {
                    makerToken: 'DAI',
                    makerAmount: new BigNumber(111),
                    takerToken: 'SUSD',
                    takerAmount: new BigNumber(100),
                    expiry: new BigNumber(inOneMinute),
                };
                const expiresNever = {
                    makerToken: 'DAI',
                    makerAmount: new BigNumber(101),
                    takerToken: 'SUSD',
                    takerAmount: new BigNumber(100),
                    expiry: NEVER_EXPIRES,
                };
                const quoteRequestorMock = mock(QuoteRequestor);
                when(
                    quoteRequestorMock.requestRfqmIndicativeQuotesAsync(
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                    ),
                ).thenResolve([expiresSoon, expiresNever]);

                const quoteRequestorInstance = instance(quoteRequestorMock);
                const protocolFeeUtilsMock = mock(ProtocolFeeUtils);
                const contractAddresses = getContractAddressesForChainOrThrow(1);
                const rfqBlockchainUtilsMock = mock(RfqBlockchainUtils);
                const service = new RfqmService(
                    quoteRequestorInstance,
                    protocolFeeUtilsMock,
                    contractAddresses,
                    MOCK_WORKER_REGISTRY_ADDRESS,
                    rfqBlockchainUtilsMock,
                );

                // When
                const res = await service.fetchIndicativeQuoteAsync({
                    apiKey: 'some-api-key',
                    buyToken: 'DAI',
                    sellToken: 'SUSD',
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    sellAmount: new BigNumber(100),
                });

                // Then
                if (res === null) {
                    expect.fail('res is null, but not expected to be null');
                    return;
                }
                expect(res.sellAmount.toNumber()).to.equal(100);
                expect(res.price.toNumber()).to.equal(1.01); // Worse pricing wins because better pricing expires too soon
            });
        });

        describe('buys', async () => {
            it('should fetch indicative quote when buying', async () => {
                // Given
                const quoteRequestorMock = mock(QuoteRequestor);
                when(
                    quoteRequestorMock.requestRfqmIndicativeQuotesAsync(
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                    ),
                ).thenResolve([
                    {
                        makerToken: 'DAI',
                        makerAmount: new BigNumber(125),
                        takerToken: 'SUSD',
                        takerAmount: new BigNumber(100),
                        expiry: NEVER_EXPIRES,
                    },
                ]);

                const quoteRequestorInstance = instance(quoteRequestorMock);
                const protocolFeeUtilsMock = mock(ProtocolFeeUtils);
                const contractAddresses = getContractAddressesForChainOrThrow(1);
                const rfqBlockchainUtilsMock = mock(RfqBlockchainUtils);
                const service = new RfqmService(
                    quoteRequestorInstance,
                    protocolFeeUtilsMock,
                    contractAddresses,
                    MOCK_WORKER_REGISTRY_ADDRESS,
                    rfqBlockchainUtilsMock,
                );

                // When
                const res = await service.fetchIndicativeQuoteAsync({
                    apiKey: 'some-api-key',
                    buyToken: 'DAI',
                    sellToken: 'SUSD',
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    buyAmount: new BigNumber(100),
                });

                // Then
                if (res === null) {
                    expect.fail('res is null, but not expected to be null');
                    return;
                }
                expect(res.buyAmount.toNumber()).to.be.at.least(100);
                expect(res.price.toNumber()).to.equal(0.8);
            });

            it('should only return an indicative quote that is 100% filled when buying', async () => {
                // Given
                const partialFillQuoteBadPricing = {
                    makerToken: 'DAI',
                    makerAmount: new BigNumber(80),
                    takerToken: 'SUSD',
                    takerAmount: new BigNumber(100),
                    expiry: NEVER_EXPIRES,
                };
                const partialFillQuoteGoodPricing = {
                    makerToken: 'DAI',
                    makerAmount: new BigNumber(80),
                    takerToken: 'SUSD',
                    takerAmount: new BigNumber(40),
                    expiry: NEVER_EXPIRES,
                };
                const fullQuote = {
                    makerToken: 'DAI',
                    makerAmount: new BigNumber(125),
                    takerToken: 'SUSD',
                    takerAmount: new BigNumber(100),
                    expiry: NEVER_EXPIRES,
                };
                const quoteRequestorMock = mock(QuoteRequestor);
                when(
                    quoteRequestorMock.requestRfqmIndicativeQuotesAsync(
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                    ),
                ).thenResolve([partialFillQuoteBadPricing, partialFillQuoteGoodPricing, fullQuote]);

                const quoteRequestorInstance = instance(quoteRequestorMock);
                const protocolFeeUtilsMock = mock(ProtocolFeeUtils);
                const contractAddresses = getContractAddressesForChainOrThrow(1);
                const rfqBlockchainUtilsMock = mock(RfqBlockchainUtils);
                const service = new RfqmService(
                    quoteRequestorInstance,
                    protocolFeeUtilsMock,
                    contractAddresses,
                    MOCK_WORKER_REGISTRY_ADDRESS,
                    rfqBlockchainUtilsMock,
                );

                // When
                const res = await service.fetchIndicativeQuoteAsync({
                    apiKey: 'some-api-key',
                    buyToken: 'DAI',
                    sellToken: 'SUSD',
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    buyAmount: new BigNumber(100),
                });

                // Then
                if (res === null) {
                    expect.fail('res is null, but not expected to be null');
                    return;
                }
                expect(res.buyAmount.toNumber()).to.be.at.least(100);
                expect(res.price.toNumber()).to.equal(0.8);
            });
        });
    });

    describe('fetchFirmQuoteAsync', () => {
        const takerAddress = '0xf003A9418DE2620f935181259C0Fa1595E871234';
        const EMPTY_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000';
        const INVALID_SIGNATURE = {
            signatureType: SignatureType.Invalid,
            v: 1,
            r: EMPTY_BYTES32,
            s: EMPTY_BYTES32,
        };
        const MOCK_META_TX = new MetaTransaction();

        describe('sells', () => {
            it('should fetch a firm quote', async () => {
                // Given
                const quoteRequestorMock = mock(QuoteRequestor);
                when(
                    quoteRequestorMock.requestRfqmFirmQuotesAsync(
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                    ),
                ).thenResolve([
                    {
                        order: new RfqOrder({
                            makerToken: 'DAI',
                            makerAmount: new BigNumber(101),
                            takerToken: 'SUSD',
                            takerAmount: new BigNumber(100),
                            expiry: NEVER_EXPIRES,
                        }),
                        type: FillQuoteTransformerOrderType.Rfq,
                        signature: INVALID_SIGNATURE,
                    },
                ]);

                const quoteRequestorInstance = instance(quoteRequestorMock);
                const protocolFeeUtilsMock = mock(ProtocolFeeUtils);
                const contractAddresses = getContractAddressesForChainOrThrow(1);
                const rfqBlockchainUtilsMock = mock(RfqBlockchainUtils);
                when(
                    rfqBlockchainUtilsMock.generateMetaTransaction(
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                    ),
                ).thenReturn(MOCK_META_TX);
                const rfqBlockchainUtils = instance(rfqBlockchainUtilsMock);
                const service = new RfqmService(
                    quoteRequestorInstance,
                    protocolFeeUtilsMock,
                    contractAddresses,
                    MOCK_WORKER_REGISTRY_ADDRESS,
                    rfqBlockchainUtils,
                );

                // When
                const res = await service.fetchFirmQuoteAsync({
                    apiKey: 'some-api-key',
                    takerAddress,
                    buyToken: 'DAI',
                    sellToken: 'SUSD',
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    sellAmount: new BigNumber(100),
                });

                // Then
                if (res === null) {
                    expect.fail('res is null, but not expected to be null');
                    return;
                }
                expect(res.sellAmount.toNumber()).to.be.at.least(100);
                expect(res.price.toNumber()).to.equal(1.01);
                expect(res.metaTransactionHash).to.match(/^0x[0-9a-fA-F]+/);
                expect(res.orderHash).to.match(/^0x[0-9a-fA-F]+/);
            });
        });

        describe('buys', () => {
            it('should fetch a firm quote', async () => {
                // Given
                const quoteRequestorMock = mock(QuoteRequestor);
                when(
                    quoteRequestorMock.requestRfqmFirmQuotesAsync(
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                    ),
                ).thenResolve([
                    {
                        order: new RfqOrder({
                            makerToken: 'DAI',
                            makerAmount: new BigNumber(100),
                            takerToken: 'SUSD',
                            takerAmount: new BigNumber(80),
                            expiry: NEVER_EXPIRES,
                        }),
                        type: FillQuoteTransformerOrderType.Rfq,
                        signature: INVALID_SIGNATURE,
                    },
                ]);

                const quoteRequestorInstance = instance(quoteRequestorMock);
                const protocolFeeUtilsMock = mock(ProtocolFeeUtils);
                const contractAddresses = getContractAddressesForChainOrThrow(1);
                const rfqBlockchainUtilsMock = mock(RfqBlockchainUtils);
                when(
                    rfqBlockchainUtilsMock.generateMetaTransaction(
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                        anything(),
                    ),
                ).thenReturn(MOCK_META_TX);
                const rfqBlockchainUtils = instance(rfqBlockchainUtilsMock);
                const service = new RfqmService(
                    quoteRequestorInstance,
                    protocolFeeUtilsMock,
                    contractAddresses,
                    MOCK_WORKER_REGISTRY_ADDRESS,
                    rfqBlockchainUtils,
                );

                // When
                const res = await service.fetchFirmQuoteAsync({
                    apiKey: 'some-api-key',
                    takerAddress,
                    buyToken: 'DAI',
                    sellToken: 'SUSD',
                    buyTokenDecimals: 18,
                    sellTokenDecimals: 18,
                    buyAmount: new BigNumber(100),
                });

                // Then
                if (res === null) {
                    expect.fail('res is null, but not expected to be null');
                    return;
                }

                expect(res.buyAmount.toNumber()).to.be.at.least(100);
                expect(res.price.toNumber()).to.equal(0.8);
                expect(res.metaTransactionHash).to.match(/^0x[0-9a-fA-F]+/);
                expect(res.orderHash).to.match(/^0x[0-9a-fA-F]+/);
            });
        });
    });
});
