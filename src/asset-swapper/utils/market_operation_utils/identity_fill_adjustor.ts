import { BigNumber } from '@0x/utils';

import { MarketOperation } from '../../types';

import { Fill, FillAdjustor } from './types';

export class IdentityFillAdjustor implements FillAdjustor {
    public adjustFills(side: MarketOperation, fills: Fill[], amount: BigNumber): Fill[] {
        return fills;
    }
}
