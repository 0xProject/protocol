import { ERC20BridgeSource } from '@0x/asset-swapper';
import { expect } from '@0x/contracts-test-utils';
import { NULL_ADDRESS } from '@0x/utils';
import 'mocha';

import { parseUtils } from '../src/utils/parse_utils';

const SUITE_NAME = 'parseUtils';

describe(SUITE_NAME, () => {
    beforeEach(() => {
        delete process.env.TEST_NEW_KEY;
    });

    it('raises a ValidationError if includedSources is RFQT and a taker is not specified', async () => {
        expect(() => {
            parseUtils.parseRequestForExcludedSources(
                {
                    includedSources: 'RFQT',
                },
                [],
                'price',
            );
        }).throws();
    });

    it('raises a ValidationError if API keys are not present or valid', async () => {
        expect(() => {
            parseUtils.parseRequestForExcludedSources(
                {
                    includedSources: 'RFQT',
                    takerAddress: NULL_ADDRESS,
                    apiKey: 'foo',
                },
                ['lorem', 'ipsum'],
                'price',
            );
        }).throws();
    });

    it('returns excludedSources correctly when excludedSources is present', async () => {
        // tslint:disable-next-line: boolean-naming
        const { excludedSources, nativeExclusivelyRFQT } = parseUtils.parseRequestForExcludedSources(
            {
                excludedSources: 'Uniswap,Kyber',
            },
            [],
            'price',
        );
        expect(excludedSources[0]).to.eql(ERC20BridgeSource.Uniswap);
        expect(excludedSources[1]).to.eql(ERC20BridgeSource.Kyber);
        expect(nativeExclusivelyRFQT).to.eql(false);
    });

    it('returns empty array if no includedSources and excludedSources are present', async () => {
        // tslint:disable-next-line: boolean-naming
        const { excludedSources, nativeExclusivelyRFQT } = parseUtils.parseRequestForExcludedSources({}, [], 'price');
        expect(excludedSources.length).to.eql(0);
        expect(nativeExclusivelyRFQT).to.eql(false);
    });

    it('correctly handles includedSources=RFQT', async () => {
        // tslint:disable-next-line: boolean-naming
        const { excludedSources, includedSources, nativeExclusivelyRFQT } = parseUtils.parseRequestForExcludedSources(
            {
                includedSources: 'RFQT',
                takerAddress: NULL_ADDRESS,
                apiKey: 'ipsum',
            },
            ['lorem', 'ipsum'],
            'price',
        );
        expect(nativeExclusivelyRFQT).to.eql(true);
        expect(excludedSources).to.deep.eq([]);
        expect(includedSources).to.deep.eq(['Native']);
    });

    it('correctly handles includedSources=RFQT,Native', async () => {
        // tslint:disable-next-line: boolean-naming
        const { excludedSources, includedSources, nativeExclusivelyRFQT } = parseUtils.parseRequestForExcludedSources(
            {
                includedSources: 'RFQT,Native',
                takerAddress: NULL_ADDRESS,
                apiKey: 'ipsum',
            },
            ['lorem', 'ipsum'],
            'price',
        );
        expect(nativeExclusivelyRFQT).to.eql(false);
        expect(excludedSources).to.deep.eq([]);
        expect(includedSources).to.deep.eq(['Native']);
    });

    it('raises a ValidationError if includedSources and excludedSources are both present', async () => {
        expect(() => {
            parseUtils.parseRequestForExcludedSources(
                {
                    excludedSources: 'Native',
                    includedSources: 'RFQT',
                },
                [],
                'price',
            );
        }).throws();
    });

    it('raises a ValidationError if a firm quote is requested and "intentOnFilling" is not set to "true"', async () => {
        expect(() => {
            parseUtils.parseRequestForExcludedSources(
                {
                    includedSources: 'RFQT',
                    takerAddress: NULL_ADDRESS,
                    apiKey: 'ipsum',
                },
                ['lorem', 'ipsum'],
                'quote',
            );
        }).throws();
    });
});
