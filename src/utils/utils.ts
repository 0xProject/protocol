import { intervalUtils } from '@0x/utils';
import * as _ from 'lodash';

import { TX_BASE_GAS } from '../constants';

export const utils = {
    isNil: (value: any): boolean => {
        // undefined == null => true
        // undefined == undefined => true
        return value == null;
    },
    calculateCallDataGas: (bytes: string) => {
        const buf = Buffer.from(bytes.replace(/0x/g, ''), 'hex');
        let gas = TX_BASE_GAS.toNumber();
        for (const b of buf) {
            // 4 gas per 0 byte, 16 gas per non-zero
            gas += b === 0 ? 4 : 16;
        }
        return gas;
    },
};
