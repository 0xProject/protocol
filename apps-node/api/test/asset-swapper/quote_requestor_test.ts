import { SignatureType } from '@0x/protocol-utils';
import * as chai from 'chai';
import 'mocha';

import { QuoteRequestor } from '../../src/asset-swapper/utils/quote_requestor';

import { chaiSetup } from './utils/chai_setup';

chaiSetup.configure();
const expect = chai.expect;

describe('QuoteRequestor', async () => {
    const validSignature = { v: 28, r: '0x', s: '0x', signatureType: SignatureType.EthSign };

    it('sets and gets the makerUri by signature', () => {
        // Given
        const quoteRequestor = new QuoteRequestor();

        // When
        quoteRequestor.setMakerUriForSignature(validSignature, 'makerUri');

        // Then
        expect(quoteRequestor.getMakerUriForSignature(validSignature)).to.eq('makerUri');
    });
});
