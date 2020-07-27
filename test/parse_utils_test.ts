import { ERC20BridgeSource } from '@0x/asset-swapper';
import { expect } from '@0x/contracts-test-utils';
import { NULL_ADDRESS } from '@0x/utils';
import 'mocha';

import { parseUtils } from '../src/utils/parse_utils';

const SUITE_NAME = 'parseUtils';

describe(SUITE_NAME, () => {
    it('raises a ValidationError if includedSources is anything else than RFQT', async () => {
        expect(() => {
            parseUtils.parseRequestForExcludedSources(
                {
                    includedSources: 'Uniswap',
                },
                [],
                'price',
            );
        }).throws();
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

    it('returns excludedSources correctly when includedSources=RFQT', async () => {
        // tslint:disable-next-line: boolean-naming
        const { excludedSources, nativeExclusivelyRFQT } = parseUtils.parseRequestForExcludedSources(
            {
                includedSources: 'RFQT',
                takerAddress: NULL_ADDRESS,
                apiKey: 'ipsum',
            },
            ['lorem', 'ipsum'],
            'price',
        );
        expect(nativeExclusivelyRFQT).to.eql(true);

        // Ensure that all sources of liquidity are excluded aside from `Native`.
        const allPossibleSources: Set<ERC20BridgeSource> = new Set(
            Object.keys(ERC20BridgeSource).map(s => ERC20BridgeSource[s]),
        );
        for (const source of excludedSources) {
            allPossibleSources.delete(source);
        }
        const allPossibleSourcesArray = Array.from(allPossibleSources);
        expect(allPossibleSourcesArray.length).to.eql(1);
        expect(allPossibleSourcesArray[0]).to.eql(ERC20BridgeSource.Native);
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
