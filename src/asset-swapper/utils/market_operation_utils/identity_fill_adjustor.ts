import { BigNumber } from '@0x/utils';

import { MarketOperation } from '../../types';

import { Fill, FillAdjustor } from './types';

export class IdentityFillAdjustor implements FillAdjustor {
    public adjustFills(_side: MarketOperation, fills: Fill[], _amount: BigNumber): Fill[] {
        return fills;
    }
}
