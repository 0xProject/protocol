import { MarketOperation, Fill, FillAdjustor } from '../../types';

export class IdentityFillAdjustor implements FillAdjustor {
    public adjustFills(_side: MarketOperation, fills: Fill[]): Fill[] {
        return fills;
    }
}
