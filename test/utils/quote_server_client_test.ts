// tslint:disable:custom-no-magic-numbers
// tslint:disable:no-empty
// tslint:disable:max-file-line-count

import { RfqOrder } from '@0x/asset-swapper';
import { expect } from '@0x/contracts-test-utils';
import { OtcOrder, Signature, SignatureType } from '@0x/protocol-utils';
import { SignRequest, SubmitRequest, TakerRequestQueryParamsUnnested, V4RFQIndicativeQuote } from '@0x/quote-server';
import { BigNumber } from '@0x/utils';
import Axios from 'axios';
import AxiosMockAdapter from 'axios-mock-adapter';
import { ethers } from 'ethers';
import * as HttpStatus from 'http-status-codes';

import { Integrator } from '../../src/config';
import { QuoteServerClient } from '../../src/utils/quote_server_client';
import { CONTRACT_ADDRESSES } from '../constants';

async function signAsync(signer: ethers.Signer, message: string): Promise<Signature> {
    const hexSignature = await signer.signMessage(message);
    return hexStringToSignature(hexSignature);
}

function hexStringToSignature(hexSignature: string): Signature {
    const signature = hexSignature.substr(2); // remove 0x
    const r = `0x${signature.slice(0, 64)}`;
    const s = `0x${signature.slice(64, 128)}`;
    const v = `0x${signature.slice(128, 130)}`;
    const v_decimal = ethers.BigNumber.from(v).toNumber();

    return {
        v: v_decimal,
        r,
        s,
        signatureType: SignatureType.EthSign,
    };
}

const makerUri = 'https://some-market-maker.xyz';
const integrator: Integrator = {
    integratorId: 'some-integrator-id',
    apiKeys: [],
    label: 'integrator',
    plp: false,
    rfqm: true,
    rfqt: true,
};
describe('QuoteServerClient', () => {
    const axiosInstance = Axios.create();
    const axiosMock = new AxiosMockAdapter(axiosInstance);

    afterEach(() => {
        axiosMock.reset();
    });
    describe('OtcOrder', async () => {
        // Create a maker
        const makerAddress = '0xFDbEf5C1Ad7d173D191D565c14E28eBd5b50470e';
        const makerPrivateKey = 'f4559ca5152145f5e0b9762f12213c2e74020a4481953fb940413273051a89d3';
        const makerSigner = new ethers.Wallet(makerPrivateKey);

        // Create a taker
        const takerAddress = '0xdA9AC423442169588DE6b4305f4E820D708d0cE5';
        const takerPrivateKey = '653fa328df81be180b58e42737bc4cef037a19a3b9673b15d20ee2eebb2e509d';
        const takerSigner = new ethers.Wallet(takerPrivateKey);

        // Some tokens and amounts
        const takerToken = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
        const makerToken = '0x6b175474e89094c44da98b954eedeac495271d0f';
        const takerAmount = new BigNumber(100);
        const makerAmount = new BigNumber(100_000);

        // Create an OtcOrder
        const order = new OtcOrder({
            maker: makerAddress,
            taker: takerAddress,
            makerAmount,
            takerAmount,
            makerToken,
            takerToken,
            expiryAndNonce: OtcOrder.encodeExpiryAndNonce(
                new BigNumber(2634330177),
                new BigNumber(1),
                new BigNumber(1634330177),
            ),
        });
        const orderHash = order.getHash();

        // Prepare the signatures
        const takerSignature = await signAsync(takerSigner, orderHash);
        const makerSignature = await signAsync(makerSigner, orderHash);

        describe('getPriceV2Async', () => {
            it('should return a valid indicative quote', async () => {
                // Given
                const client = new QuoteServerClient(axiosInstance);
                const request: TakerRequestQueryParamsUnnested = {
                    sellTokenAddress: takerToken,
                    buyTokenAddress: makerToken,
                    takerAddress,
                    sellAmountBaseUnits: takerAmount.toString(),
                    protocolVersion: '4',
                    txOrigin: takerAddress,
                    isLastLook: 'true',
                    feeAmount: '100',
                    feeType: 'fixed',
                    feeToken: CONTRACT_ADDRESSES.etherToken,
                    nonce: '1634322835',
                    nonceBucket: '1',
                };

                const response: V4RFQIndicativeQuote = {
                    makerAmount,
                    takerAmount,
                    makerToken,
                    takerToken,
                    expiry: new BigNumber(9934322972),
                };

                axiosMock.onGet(`${makerUri}/rfqm/v2/price`).replyOnce(HttpStatus.OK, response);

                // When
                const indicativeQuote = await client.getPriceV2Async(makerUri, integrator, request);

                // Then
                expect(indicativeQuote).to.deep.eq(response);
            });

            it('should throw an error for a malformed response', async () => {
                // Given
                const client = new QuoteServerClient(axiosInstance);
                const request: TakerRequestQueryParamsUnnested = {
                    sellTokenAddress: takerToken,
                    buyTokenAddress: makerToken,
                    takerAddress,
                    sellAmountBaseUnits: takerAmount.toString(),
                    protocolVersion: '4',
                    txOrigin: takerAddress,
                    isLastLook: 'true',
                    feeAmount: '100',
                    feeType: 'fixed',
                    feeToken: CONTRACT_ADDRESSES.etherToken,
                    nonce: '1634322835',
                    nonceBucket: '1',
                };

                const response = {
                    asdf: 'malformed response',
                };

                axiosMock.onGet(`${makerUri}/rfqm/v2/price`).replyOnce(HttpStatus.OK, response);

                try {
                    // When
                    await client.getPriceV2Async(makerUri, integrator, request);
                    expect.fail('Should not succeed');
                } catch (err) {
                    // Then
                    expect(err).to.not.be.undefined();
                }
            });
        });

        describe('getQuoteV2Async', () => {
            it('should return a valid OtcOrder quote', async () => {
                // Given
                const client = new QuoteServerClient(axiosInstance);
                const request: TakerRequestQueryParamsUnnested = {
                    sellTokenAddress: takerToken,
                    buyTokenAddress: makerToken,
                    takerAddress,
                    sellAmountBaseUnits: takerAmount.toString(),
                    protocolVersion: '4',
                    txOrigin: takerAddress,
                    isLastLook: 'true',
                    feeAmount: '100',
                    feeType: 'fixed',
                    feeToken: CONTRACT_ADDRESSES.etherToken,
                    nonce: '1634322835',
                    nonceBucket: '1',
                };

                const expiryAndNonce = `0x${order.expiryAndNonce.toString(16)}`;
                const response = {
                    order: {
                        ...order,
                        expiryAndNonce,
                    },
                };

                axiosMock.onGet(`${makerUri}/rfqm/v2/quote`).replyOnce(HttpStatus.OK, response);

                // When
                const firmQuoteResponse = await client.getQuoteV2Async(makerUri, integrator, request);

                // Then
                expect(firmQuoteResponse!.order).to.deep.eq(order);
                expect(firmQuoteResponse!.makerUri).to.eq(makerUri);
            });

            it('should throw an error for a malformed response', async () => {
                // Given
                const client = new QuoteServerClient(axiosInstance);
                const request: TakerRequestQueryParamsUnnested = {
                    sellTokenAddress: takerToken,
                    buyTokenAddress: makerToken,
                    takerAddress,
                    sellAmountBaseUnits: takerAmount.toString(),
                    protocolVersion: '4',
                    txOrigin: takerAddress,
                    isLastLook: 'true',
                    feeAmount: '100',
                    feeType: 'fixed',
                    feeToken: CONTRACT_ADDRESSES.etherToken,
                    nonce: '1634322835',
                    nonceBucket: '1',
                };

                const response = {
                    order: {
                        ...order,
                        expiryAndNonce: 'not a hex string',
                    },
                };

                axiosMock.onGet(`${makerUri}/rfqm/v2/quote`).replyOnce(HttpStatus.OK, response);

                try {
                    // When
                    await client.getQuoteV2Async(makerUri, integrator, request);
                    expect.fail('Should not succeed');
                } catch (err) {
                    // Then
                    expect(err).to.not.be.undefined();
                }
            });
        });

        describe('signV2Async', () => {
            it('should return a signature for valid response', async () => {
                // Given
                const client = new QuoteServerClient(axiosInstance);
                const request: SignRequest = {
                    order,
                    orderHash,
                    fee: {
                        amount: new BigNumber('100'),
                        type: 'fixed',
                        token: CONTRACT_ADDRESSES.etherToken,
                    },
                    takerSignature,
                };

                const response = {
                    fee: {
                        amount: '100',
                        type: 'fixed',
                        token: CONTRACT_ADDRESSES.etherToken,
                    },
                    proceedWithFill: true,
                    makerSignature,
                };

                axiosMock
                    .onPost(`${makerUri}/rfqm/v2/sign`, JSON.parse(JSON.stringify(request)))
                    .replyOnce(HttpStatus.OK, response);

                // When
                const signature = await client.signV2Async(makerUri, request);

                // Then
                expect(signature).to.deep.eq(makerSignature);
            });

            it('should throw an error for a malformed response', async () => {
                // Given
                const client = new QuoteServerClient(axiosInstance);
                const request: SignRequest = {
                    order,
                    orderHash,
                    fee: {
                        amount: new BigNumber('100'),
                        type: 'fixed',
                        token: CONTRACT_ADDRESSES.etherToken,
                    },
                    takerSignature,
                };

                const response = {
                    asdf: 'I am broken',
                };

                axiosMock
                    .onPost(`${makerUri}/rfqm/v2/sign`, JSON.parse(JSON.stringify(request)))
                    .replyOnce(HttpStatus.OK, response);

                try {
                    // When
                    await client.signV2Async(makerUri, request);
                    expect.fail('Should not succeed');
                } catch (err) {
                    // Then
                    expect(err).to.not.be.undefined();
                }
            });

            it('should return undefined for an invalid signature', async () => {
                // Given
                const client = new QuoteServerClient(axiosInstance);
                const request: SignRequest = {
                    order,
                    orderHash,
                    fee: {
                        amount: new BigNumber('100'),
                        type: 'fixed',
                        token: CONTRACT_ADDRESSES.etherToken,
                    },
                    takerSignature,
                };

                const response = {
                    fee: {
                        amount: '100',
                        type: 'fixed',
                        token: CONTRACT_ADDRESSES.etherToken,
                    },
                    proceedWithFill: true,
                    makerSignature: takerSignature, // this is clearly wrong
                };

                axiosMock
                    .onPost(`${makerUri}/rfqm/v2/sign`, JSON.parse(JSON.stringify(request)))
                    .replyOnce(HttpStatus.OK, response);

                // When
                const signature = await client.signV2Async(makerUri, request);

                // Then
                expect(signature).to.be.undefined();
            });

            it('should return undefined for an incorrect fee acknowledgement', async () => {
                // Given
                const client = new QuoteServerClient(axiosInstance);
                const request: SignRequest = {
                    order,
                    orderHash,
                    fee: {
                        amount: new BigNumber('100'),
                        type: 'fixed',
                        token: CONTRACT_ADDRESSES.etherToken,
                    },
                    takerSignature,
                };

                const response = {
                    fee: {
                        amount: '10', // Not the right fee
                        type: 'fixed',
                        token: CONTRACT_ADDRESSES.etherToken,
                    },
                    proceedWithFill: true,
                    makerSignature,
                };

                axiosMock
                    .onPost(`${makerUri}/rfqm/v2/sign`, JSON.parse(JSON.stringify(request)))
                    .replyOnce(HttpStatus.OK, response);

                // When
                const signature = await client.signV2Async(makerUri, request);

                // Then
                expect(signature).to.be.undefined();
            });

            it('should return undefined for explicitly rejected responses', async () => {
                // Given
                const client = new QuoteServerClient(axiosInstance);
                const request: SignRequest = {
                    order,
                    orderHash,
                    fee: {
                        amount: new BigNumber('100'),
                        type: 'fixed',
                        token: CONTRACT_ADDRESSES.etherToken,
                    },
                    takerSignature,
                };

                const response = {
                    proceedWithFill: false,
                };

                axiosMock
                    .onPost(`${makerUri}/rfqm/v2/sign`, JSON.parse(JSON.stringify(request)))
                    .replyOnce(HttpStatus.OK, response);

                // When
                const signature = await client.signV2Async(makerUri, request);

                // Then
                expect(signature).to.be.undefined();
            });
        });
    });

    describe('confirmLastLookAsync', () => {
        it('should reject last look if invalid takerTokenFillableAmount passed', async () => {
            // Given
            const client = new QuoteServerClient(axiosInstance);
            const order = new RfqOrder();
            const request: SubmitRequest = {
                order,
                orderHash: 'someOrderHash',
                takerTokenFillAmount: new BigNumber('1225'),
                fee: {
                    amount: new BigNumber('100'),
                    type: 'fixed',
                    token: CONTRACT_ADDRESSES.etherToken,
                },
            };

            const response = {
                fee: {
                    amount: '100',
                    type: 'fixed',
                    token: CONTRACT_ADDRESSES.etherToken,
                },
                proceedWithFill: true,
                takerTokenFillAmount: '1223', // takerTokenFillableAmount is less than what was passed into the request.
                signedOrderHash: 'someOrderHash',
            };

            axiosMock
                .onPost(`${makerUri}/submit`, JSON.parse(JSON.stringify(request)))
                .replyOnce(HttpStatus.OK, response);

            // When
            const shouldProceed = await client.confirmLastLookAsync(makerUri, request);

            // Then
            expect(shouldProceed).to.eq(false);
        });

        it('should reject last look if valid negative response', async () => {
            // Given
            const client = new QuoteServerClient(axiosInstance);
            const order = new RfqOrder();
            const request: SubmitRequest = {
                order,
                orderHash: 'someOrderHash',
                takerTokenFillAmount: new BigNumber('1225'),
                fee: {
                    amount: new BigNumber('100'),
                    type: 'fixed',
                    token: CONTRACT_ADDRESSES.etherToken,
                },
            };

            const response = {
                fee: {
                    amount: '100',
                    type: 'fixed',
                    token: CONTRACT_ADDRESSES.etherToken,
                },
                proceedWithFill: false,
                takerTokenFillAmount: '1225',
                signedOrderHash: 'someSignedOrderHash',
            };

            axiosMock
                .onPost(`${makerUri}/submit`, JSON.parse(JSON.stringify(request)))
                .replyOnce(HttpStatus.OK, response);

            // When
            const shouldProceed = await client.confirmLastLookAsync(makerUri, request);

            // Then
            expect(shouldProceed).to.eq(false);
        });

        it('should confirm last look if valid positive response', async () => {
            // Given
            const client = new QuoteServerClient(axiosInstance);
            const order = new RfqOrder();
            const request: SubmitRequest = {
                order,
                takerTokenFillAmount: new BigNumber('1225'),
                orderHash: 'someOrderHash',
                fee: {
                    amount: new BigNumber('100'),
                    type: 'fixed',
                    token: CONTRACT_ADDRESSES.etherToken,
                },
            };

            const response = {
                fee: {
                    amount: '100',
                    type: 'fixed',
                    token: CONTRACT_ADDRESSES.etherToken,
                },
                takerTokenFillAmount: '1225',
                proceedWithFill: true,
                signedOrderHash: 'someOrderHash',
            };

            axiosMock
                .onPost(`${makerUri}/submit`, JSON.parse(JSON.stringify(request)))
                .replyOnce(HttpStatus.OK, response);

            // When
            const shouldProceed = await client.confirmLastLookAsync(makerUri, request);

            // Then
            expect(shouldProceed).to.eq(true);
        });

        it('should reject last look if invalid response', async () => {
            // Given
            const client = new QuoteServerClient(axiosInstance);
            const order = new RfqOrder();
            const request: SubmitRequest = {
                order,
                takerTokenFillAmount: new BigNumber('1225'),
                orderHash: 'someOrderHash',
                fee: {
                    amount: new BigNumber('100'),
                    type: 'fixed',
                    token: CONTRACT_ADDRESSES.etherToken,
                },
            };

            const response = {
                fee: {
                    amount: '100',
                    type: 'invalid',
                    token: CONTRACT_ADDRESSES.etherToken,
                },
                proceedWithFill: true,
                takerTokenFillAmount: '1225',
                signedOrderHash: 'someOrderHash',
            };

            axiosMock
                .onPost(`${makerUri}/submit`, JSON.parse(JSON.stringify(request)))
                .replyOnce(HttpStatus.OK, response);

            // When
            const shouldProceed = await client.confirmLastLookAsync(makerUri, request);

            // Then
            expect(shouldProceed).to.eq(false);
        });

        it(`should reject last look if fee doesn't match`, async () => {
            // Given
            const client = new QuoteServerClient(axiosInstance);
            const order = new RfqOrder();
            const request: SubmitRequest = {
                order,
                takerTokenFillAmount: new BigNumber('1225'),
                orderHash: 'someOrderHash',
                fee: {
                    amount: new BigNumber('100'),
                    type: 'fixed',
                    token: CONTRACT_ADDRESSES.etherToken,
                },
            };

            const response = {
                fee: {
                    amount: '101', // not what we expected above
                    type: 'fixed',
                    token: CONTRACT_ADDRESSES.etherToken,
                },
                proceedWithFill: true,
                takerTokenFillAmount: '1225',
                signedOrderHash: 'someOrderHash',
            };

            axiosMock
                .onPost(`${makerUri}/submit`, JSON.parse(JSON.stringify(request)))
                .replyOnce(HttpStatus.OK, response);

            // When
            const shouldProceed = await client.confirmLastLookAsync(makerUri, request);

            // Then
            expect(shouldProceed).to.eq(false);
        });
    });
});
