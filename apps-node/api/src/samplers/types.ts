import { BigNumber, FillData } from '../asset-swapper';
import { SourceQuoteOperation } from '../asset-swapper/utils/market_operation_utils/types';

export interface BridgeSampler<TFillData extends FillData> {
    createSampleSellsOperation(tokenAddressPath: string[], amounts: BigNumber[]): SourceQuoteOperation<TFillData>;
    createSampleBuysOperation(tokenAddressPath: string[], amounts: BigNumber[]): SourceQuoteOperation<TFillData>;
}
