import { AbiEncoder, BigNumber } from '@0x/utils';
import * as _ from 'lodash';

import { FEE_RECIPIENT_ADDRESS } from '../config';
import { HEX_BASE, ONE_SECOND_MS } from '../constants';

import { numberUtils } from './number_utils';

export const serviceUtils = {
    attributeCallData(
        data: string,
        affiliateAddress: string | null,
    ): {
        affiliatedData: string;
        decodedUniqueId: string;
    } {
        const affiliateAddressOrDefault = affiliateAddress ? affiliateAddress : FEE_RECIPIENT_ADDRESS;
        const affiliateCallDataEncoder = new AbiEncoder.Method({
            constant: true,
            outputs: [],
            name: 'ZeroExAPIAffiliate',
            inputs: [
                { name: 'affiliate', type: 'address' },
                { name: 'timestamp', type: 'uint256' },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
        });

        // Generate unique identiifer
        const timestampInSeconds = new BigNumber(Date.now() / ONE_SECOND_MS).integerValue();
        const hexTimestamp = timestampInSeconds.toString(HEX_BASE);
        const randomNumber = numberUtils.randomHexNumberOfLength(10);

        // Concatenate the hex identifier with the hex timestamp
        // In the final encoded call data, this will leave us with a 5-byte ID followed by
        // a 4-byte timestamp, and won't break parsers of the timestamp made prior to the
        // addition of the ID
        const uniqueIdentifier = new BigNumber(`${randomNumber}${hexTimestamp}`, HEX_BASE);

        // Encode additional call data and return
        const encodedAffiliateData = affiliateCallDataEncoder.encode([affiliateAddressOrDefault, uniqueIdentifier]);
        const affiliatedData = `${data}${encodedAffiliateData.slice(2)}`;
        return { affiliatedData, decodedUniqueId: `${randomNumber}-${timestampInSeconds}` };
    },
};
