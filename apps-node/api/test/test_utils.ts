import { assertRoughlyEquals, expect } from '@0x/contracts-test-utils';
import { BigNumber } from '@0x/utils';
import { StatusCodes } from 'http-status-codes';
import supertest from 'supertest';
import { ValidationErrorItem } from '../src/errors';
import { GetSwapQuoteResponse } from '../src/types';

interface SwapErrors {
    validationErrors?: ValidationErrorItem[];
    revertErrorReason?: string;
    generalUserError?: boolean;
}

export async function expectSwapError(swapResponse: supertest.Response, swapErrors: SwapErrors) {
    expect(swapResponse.type).to.be.eq('application/json');
    expect(swapResponse.statusCode).not.eq(StatusCodes.OK);

    if (swapErrors.revertErrorReason) {
        expect(swapResponse.status).to.be.eq(StatusCodes.BAD_REQUEST);
        expect(swapResponse.body.code).to.eq(105);
        expect(swapResponse.body.reason).to.be.eql(swapErrors.revertErrorReason);
        return swapResponse;
    }
    if (swapErrors.validationErrors) {
        expect(swapResponse.status).to.be.eq(StatusCodes.BAD_REQUEST);
        expect(swapResponse.body.code).to.eq(100);
        expect(swapResponse.body.validationErrors).to.be.deep.eq(swapErrors.validationErrors);
        return swapResponse;
    }
    if (swapErrors.generalUserError) {
        expect(swapResponse.status).to.be.eq(StatusCodes.BAD_REQUEST);
        return swapResponse;
    }
}

const PRECISION = 2;
export function expectCorrectQuoteResponse(
    response: supertest.Response,
    expectedResponse: Partial<GetSwapQuoteResponse>,
): void {
    expect(response.type).to.be.eq('application/json');
    expect(response.statusCode).eq(StatusCodes.OK);
    const quoteResponse = response.body as GetSwapQuoteResponse;

    for (const prop of Object.keys(expectedResponse)) {
        const property = prop as keyof GetSwapQuoteResponse;
        if (BigNumber.isBigNumber(expectedResponse[property])) {
            assertRoughlyEquals(quoteResponse[property], expectedResponse[property], PRECISION);
            continue;
        }

        if (prop === 'sources' && expectedResponse.sources !== undefined) {
            const expectedSources = expectedResponse.sources.map((source) => ({
                ...source,
                proportion: source.proportion.toString(),
            }));
            expect(quoteResponse.sources).to.deep.include.members(expectedSources);
            continue;
        }

        if (prop === 'gasPrice' && expectedResponse.gasPrice !== undefined) {
            const gasPrice = quoteResponse.gasPrice;
            // QUICK FIX: wrap `expectedResponse.gasPrice` as `BigNumber`
            // As `expectedResponse.gasPrice` is often a number while it should be a BigNumber.
            expect(gasPrice).bignumber.gt(new BigNumber(expectedResponse.gasPrice).times(0.8), 'gasPrice is too low');
            expect(gasPrice).bignumber.lt(new BigNumber(expectedResponse.gasPrice).times(1.2), 'gasPrice is too high');
            continue;
        }

        if (prop === 'debugData') {
            const { samplerGasUsage, blockNumber, ...rest } = quoteResponse[property];
            const {
                samplerGasUsage: expectedSamplerGasUsage,
                blockNumber: expectedBlockNumber,
                ...expectedRest
            } = expectedResponse[property];
            expect(samplerGasUsage).gt(expectedSamplerGasUsage * 0.5, 'samplerGasUsage is too low');
            expect(samplerGasUsage).lt(expectedSamplerGasUsage * 1.5, 'samplerGasUsage is too high');
            expect(blockNumber).gt(expectedBlockNumber * 0.5, 'blockNumber is too low');
            expect(blockNumber).lt(expectedBlockNumber * 1.5, 'blockNumber is too high');
            expect(rest).to.be.deep.eq(expectedRest);
            continue;
        }

        expect(quoteResponse[property]).to.deep.eq(expectedResponse[property]);
    }
}
